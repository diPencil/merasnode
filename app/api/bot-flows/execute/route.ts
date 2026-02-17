import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// Result when flow stops at send_options (waiting for user reply)
export type FlowStopResult = { stoppedAtOptions: { stepIndex: number; options: any[] } }

// Flow Execution Engine
class FlowExecutor {
  private flow: any
  private context: any

  constructor(flow: any, context: any) {
    this.flow = flow
    this.context = context
  }

  /** Run steps from startIndex. Returns when hit send_options (so caller can save state and wait for reply). */
  async execute(startIndex: number = 0): Promise<FlowStopResult | void> {
    const steps = Array.isArray(this.flow.steps) ? this.flow.steps : []
    console.log(`🔄 Executing flow: ${this.flow.name} from step ${startIndex}`)

    for (let i = startIndex; i < steps.length; i++) {
      const step = steps[i]
      try {
        const stop = await this.executeStep(step, i)
        if (stop) return stop
      } catch (error) {
        console.error(`❌ Error executing step:`, step, error)
        break
      }
      if (step.delay && step.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, step.delay))
      }
    }

    console.log(`✅ Flow execution completed: ${this.flow.name}`)
  }

  private async executeStep(step: any, stepIndex: number): Promise<FlowStopResult | void> {
    console.log(`🔄 Executing step: ${step.type}`, step)

    switch (step.type) {
      case 'send_message':
        await this.executeSendMessage(step)
        break
      case 'send_image':
        await this.executeSendImage(step)
        break
      case 'send_options':
        return await this.executeSendOptions(step, stepIndex)
      case 'wait':
        await this.executeWait(step)
        break
      case 'assign_agent':
        await this.executeAssignAgent(step)
        break
      case 'update_status':
        await this.executeUpdateStatus(step)
        break
      case 'send_notification':
        await this.executeSendNotification(step)
        break
      case 'condition':
        await this.executeCondition(step)
        break
      default:
        console.log(`⚠️ Unknown step type: ${step.type}`)
    }
  }

  private async sendMessageToConversation(conversationId: string, content: string, type: string = 'TEXT', mediaUrl?: string): Promise<boolean> {
    const internalToken =
      process.env.FLOW_INTERNAL_TOKEN ||
      process.env.JWT_SECRET ||
      "dev-flow-internal-token"
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const body: any = {
      conversationId,
      content,
      type,
      direction: 'OUTGOING',
    }
    if (this.context.whatsappAccountId) body.whatsappAccountId = this.context.whatsappAccountId
    if (mediaUrl) body.mediaUrl = mediaUrl
    const response = await fetch(`${baseUrl}/api/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-flow-token': internalToken,
      },
      body: JSON.stringify(body),
    })
    if (response.ok) {
      console.log(`✅ Message sent`)
      return true
    }
    console.error(`❌ Failed to send:`, await response.text())
    return false
  }

  private async executeSendMessage(step: any): Promise<void> {
    const messageContent = this.processTemplate(step.content || step.message || '')
    console.log(`📤 Sending message: "${messageContent}"`)
    try {
      const conversation = await prisma.conversation.findFirst({
        where: { contactId: this.context.contactId, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      })
      if (!conversation) {
        console.log('⚠️ No active conversation found for contact')
        return
      }
      await this.sendMessageToConversation(conversation.id, messageContent, 'TEXT')
    } catch (error) {
      console.error('❌ Error sending message:', error)
    }
  }

  /** Send greeting + options (numbered list). Returns so caller can save state and wait for user reply. */
  private async executeSendOptions(step: any, stepIndex: number): Promise<FlowStopResult> {
    const messageContent = this.processTemplate(step.content || step.message || '')
    const options: any[] = Array.isArray(step.options) ? step.options : []
    console.log(`📤 Sending options step: "${messageContent}" with ${options.length} options`)

    try {
      const conversation = await prisma.conversation.findFirst({
        where: { contactId: this.context.contactId, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      })
      if (!conversation) {
        console.log('⚠️ No active conversation found for contact')
        return { stoppedAtOptions: { stepIndex, options } }
      }

      await this.sendMessageToConversation(conversation.id, messageContent, 'TEXT')

      if (options.length > 0) {
        const lines = options.map((opt: any, i: number) => `${i + 1}. ${opt.label || opt.text || opt.value || ''}`.trim()).filter(Boolean)
        const optionsText = lines.length ? lines.join('\n') : 'اختر رقماً أو اكتب الخيار.'
        await this.sendMessageToConversation(conversation.id, optionsText, 'TEXT')
      }

      return { stoppedAtOptions: { stepIndex, options } }
    } catch (error) {
      console.error('❌ Error in send_options:', error)
      return { stoppedAtOptions: { stepIndex, options } }
    }
  }

  private async executeSendImage(step: any): Promise<void> {
    const mediaUrl = step.mediaUrl || step.imageUrl || ''
    if (!mediaUrl) {
      console.log('⚠️ Image step has no mediaUrl, skipping')
      return
    }
    const caption = this.processTemplate(step.content || step.caption || '')
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3003'
    const fullMediaUrl = mediaUrl.startsWith('http') ? mediaUrl : `${baseUrl.replace(/\/+$/, '')}${mediaUrl.startsWith('/') ? '' : '/'}${mediaUrl}`

    console.log(`📤 Sending image: ${fullMediaUrl}`)

    try {
      const conversation = await prisma.conversation.findFirst({
        where: {
          contactId: this.context.contactId,
          status: 'ACTIVE'
        },
        orderBy: { createdAt: 'desc' }
      })

      if (!conversation) {
        console.log('⚠️ No active conversation found for contact')
        return
      }

      const internalToken =
        process.env.FLOW_INTERNAL_TOKEN ||
        process.env.JWT_SECRET ||
        "dev-flow-internal-token"

      const response = await fetch(`${baseUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-flow-token': internalToken,
        },
        body: JSON.stringify({
          conversationId: conversation.id,
          content: caption,
          type: 'IMAGE',
          mediaUrl: fullMediaUrl,
          direction: 'OUTGOING'
        })
      })

      if (response.ok) {
        console.log(`✅ Image sent successfully`)
      } else {
        console.error(`❌ Failed to send image:`, await response.text())
      }
    } catch (error) {
      console.error('❌ Error sending image:', error)
    }
  }

  private async executeWait(step: any): Promise<void> {
    const delay = step.delay || 1000
    console.log(`⏰ Waiting for ${delay}ms`)
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  private async executeAssignAgent(step: any): Promise<void> {
    const agentId = step.agentId
    console.log(`👤 Assigning agent: ${agentId}`)

    try {
      const conversation = await prisma.conversation.findFirst({
        where: {
          contactId: this.context.contactId,
          status: 'ACTIVE'
        },
        orderBy: { createdAt: 'desc' }
      })

      if (conversation) {
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { assignedToId: agentId }
        })
        console.log(`✅ Agent assigned successfully`)
      }
    } catch (error) {
      console.error('❌ Error assigning agent:', error)
    }
  }

  private async executeUpdateStatus(step: any): Promise<void> {
    const status = step.status
    console.log(`📝 Updating status to: ${status}`)

    try {
      const conversation = await prisma.conversation.findFirst({
        where: {
          contactId: this.context.contactId,
          status: 'ACTIVE'
        },
        orderBy: { createdAt: 'desc' }
      })

      if (conversation) {
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { status: status }
        })
        console.log(`✅ Status updated successfully`)
      }
    } catch (error) {
      console.error('❌ Error updating status:', error)
    }
  }

  private async executeSendNotification(step: any): Promise<void> {
    const message = this.processTemplate(step.message || '')
    console.log(`🔔 Sending notification: "${message}"`)

    // TODO: Implement notification system
    // For now, just log it
    console.log(`✅ Notification sent: ${message}`)
  }

  private async executeCondition(step: any): Promise<void> {
    console.log(`🔀 Executing condition:`, step)

    const field = step.field
    const operator = step.operator || 'equals'
    const expectedValue = step.value

    let actualValue = ''

    // Get field value from context
    switch (field) {
      case 'message':
        actualValue = this.context.message || ''
        break
      case 'contact_name':
        actualValue = this.context.contactName || ''
        break
      case 'contact_phone':
        actualValue = this.context.contactPhone || ''
        break
      case 'branch':
        actualValue = this.context.branch || ''
        break
      default:
        actualValue = this.context[field] || ''
    }

    let conditionMet = false

    switch (operator) {
      case 'equals':
        conditionMet = actualValue === expectedValue
        break
      case 'contains':
        conditionMet = actualValue.toLowerCase().includes(expectedValue.toLowerCase())
        break
      case 'starts_with':
        conditionMet = actualValue.toLowerCase().startsWith(expectedValue.toLowerCase())
        break
      case 'ends_with':
        conditionMet = actualValue.toLowerCase().endsWith(expectedValue.toLowerCase())
        break
      default:
        conditionMet = false
    }

    console.log(`🔍 Condition check: ${actualValue} ${operator} ${expectedValue} = ${conditionMet}`)

    // For now, we'll just log the result
    // In a full implementation, you'd execute different branches based on the condition
    if (conditionMet) {
      console.log(`✅ Condition met, executing true branch`)
      // Execute trueSteps if they exist
    } else {
      console.log(`❌ Condition not met, executing false branch`)
      // Execute falseSteps if they exist
    }
  }

  private processTemplate(template: string): string {
    // Simple template processing - replace variables with context values
    let result = template

    // Replace common variables
    result = result.replace(/\{\{contact_name\}\}/g, this.context.contactName || '')
    result = result.replace(/\{\{contact_phone\}\}/g, this.context.contactPhone || '')
    result = result.replace(/\{\{time\}\}/g, new Date().toLocaleTimeString('ar-SA'))
    result = result.replace(/\{\{date\}\}/g, new Date().toLocaleDateString('ar-SA'))

    return result
  }
}

// Trigger Manager - handles different trigger types + incoming_message (keyword + continue flow)
class TriggerManager {
  static async handleTrigger(triggerType: string, context: any): Promise<void> {
    console.log(`🎯 Trigger activated: ${triggerType}`, context)

    if (triggerType === 'incoming_message') {
      await this.handleIncomingMessage(context)
      return
    }

    const flows = await prisma.botFlow.findMany({
      where: { isActive: true },
    })
    const matchingFlows = flows.filter(flow => this.shouldTriggerFlow(flow, triggerType, context))
    console.log(`📋 Found ${matchingFlows.length} matching flows for trigger: ${triggerType}`)

    for (const flow of matchingFlows) {
      const executor = new FlowExecutor(flow, context)
      await executor.execute()
    }
  }

  private static async handleIncomingMessage(context: any): Promise<void> {
    const { contactId, message: userMessage, conversationId } = context
    if (!contactId || userMessage == null) return
    const msg = String(userMessage).trim().toLowerCase()

    const active = await prisma.flowInteraction.findFirst({
      where: {
        contactId,
        action: { in: ['TRIGGERED', 'STEP'] },
        metadata: { path: ['waitingForReply'], equals: true },
      },
      orderBy: { createdAt: 'desc' },
      include: { flow: true },
    })

    if (active && active.metadata && typeof active.metadata === 'object') {
      const meta = active.metadata as { stepIndex?: number; options?: any[] }
      const options: any[] = Array.isArray(meta.options) ? meta.options : []
      let chosen: any = options.find((o: any) => {
        const val = String(o.value ?? o.label ?? '').trim().toLowerCase()
        const label = String(o.label ?? o.text ?? '').trim().toLowerCase()
        return msg === val || msg === label || msg.includes(val) || msg.includes(label)
      })
      if (!chosen && options.length > 0) {
        const idx = options.findIndex((_: any, i: number) => String(i + 1) === msg || msg === `${i + 1}`)
        if (idx >= 0) chosen = options[idx]
      }
      if (chosen) {
        const next = chosen.nextStepIndex ?? chosen.nextStep
        if (next === -1 || next === 'agent') {
          await this.finishFlowTransferToAgent(active.flowId, contactId, conversationId, context)
          return
        }
        const flow = await prisma.botFlow.findUnique({ where: { id: active.flowId } })
        if (flow && typeof next === 'number' && next >= 0) {
          const executor = new FlowExecutor(flow, context)
          const result = await executor.execute(next)
          if (result?.stoppedAtOptions) {
            await prisma.flowInteraction.update({
              where: { id: active.id },
              data: {
                stepIndex: result.stoppedAtOptions.stepIndex,
                action: 'STEP',
                metadata: {
                  waitingForReply: true,
                  stepIndex: result.stoppedAtOptions.stepIndex,
                  options: result.stoppedAtOptions.options,
                },
              },
            })
          } else {
            await prisma.flowInteraction.update({
              where: { id: active.id },
              data: { action: 'COMPLETED', metadata: {} },
            })
          }
        }
      }
      return
    }

    const flows = await prisma.botFlow.findMany({
      where: { isActive: true, trigger: 'incoming_message' },
    })
    const keywords = (f: any) => (Array.isArray(f.triggerKeywords) ? f.triggerKeywords : []) as string[]
    const match = flows.find(f => keywords(f).some((k: string) => msg.includes(String(k).trim().toLowerCase())))
    if (!match) return

    const interaction = await prisma.flowInteraction.create({
      data: { flowId: match.id, contactId, stepIndex: 0, action: 'TRIGGERED', metadata: {} },
    })
    const executor = new FlowExecutor(match, context)
    const result = await executor.execute(0)
    if (result?.stoppedAtOptions) {
      await prisma.flowInteraction.update({
        where: { id: interaction.id },
        data: {
          stepIndex: result.stoppedAtOptions.stepIndex,
          action: 'STEP',
          metadata: {
            waitingForReply: true,
            stepIndex: result.stoppedAtOptions.stepIndex,
            options: result.stoppedAtOptions.options,
          },
        },
      })
    } else {
      await prisma.flowInteraction.update({
        where: { id: interaction.id },
        data: { action: 'COMPLETED', metadata: {} },
      })
    }
  }

  private static async finishFlowTransferToAgent(flowId: string, contactId: string, conversationId: string | null, context: any): Promise<void> {
    const conversation = conversationId
      ? await prisma.conversation.findUnique({ where: { id: conversationId } })
      : await prisma.conversation.findFirst({ where: { contactId, status: 'ACTIVE' }, orderBy: { createdAt: 'desc' } })
    if (conversation) {
      const internalToken = process.env.FLOW_INTERNAL_TOKEN || process.env.JWT_SECRET || 'dev-flow-internal-token'
      const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const body: any = { conversationId: conversation.id, content: 'سيقوم موظف بالرد عليك قريباً.', type: 'TEXT', direction: 'OUTGOING' }
      if (context.whatsappAccountId) body.whatsappAccountId = context.whatsappAccountId
      await fetch(`${baseUrl}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-flow-token': internalToken },
        body: JSON.stringify(body),
      })
    }
    await prisma.flowInteraction.updateMany({
      where: { contactId, flowId, action: { in: ['TRIGGERED', 'STEP'] } },
      data: { action: 'COMPLETED', metadata: {} },
    })
  }

  private static shouldTriggerFlow(flow: any, triggerType: string, context: any): boolean {
    if (flow.trigger && flow.trigger === triggerType) return true
    const triggerStep = Array.isArray(flow.steps)
      ? flow.steps.find((step: any) => step && step.type === 'trigger' && step.trigger === triggerType)
      : null
    return !!triggerStep
  }
}

// API Route
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { triggerType, context } = body

    if (!triggerType || !context) {
      return NextResponse.json(
        {
          success: false,
          error: "Trigger type and context are required"
        },
        { status: 400 }
      )
    }

    // Handle the trigger asynchronously
    setTimeout(async () => {
      try {
        await TriggerManager.handleTrigger(triggerType, context)
      } catch (error) {
        console.error('Error handling trigger:', error)
      }
    }, 0)

    return NextResponse.json({
      success: true,
      message: "Trigger queued for execution"
    })

  } catch (error) {
    console.error('Error executing flow:', error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to execute flow"
      },
      { status: 500 }
    )
  }
}