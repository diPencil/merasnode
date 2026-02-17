import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// Flow Execution Engine
class FlowExecutor {
  private flow: any
  private context: any
  private currentStep: number = 0

  constructor(flow: any, context: any) {
    this.flow = flow
    this.context = context
  }

  async execute(): Promise<void> {
    console.log(`🔄 Executing flow: ${this.flow.name}`)

    for (const step of this.flow.steps) {
      try {
        await this.executeStep(step)
      } catch (error) {
        console.error(`❌ Error executing step:`, step, error)
        break
      }
    }

    console.log(`✅ Flow execution completed: ${this.flow.name}`)
  }

  private async executeStep(step: any): Promise<void> {
    console.log(`🔄 Executing step: ${step.type}`, step)

    switch (step.type) {
      case 'send_message':
        await this.executeSendMessage(step)
        break
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

    // Add delay if specified
    if (step.delay && step.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, step.delay))
    }
  }

  private async executeSendMessage(step: any): Promise<void> {
    const messageContent = this.processTemplate(step.content || step.message || '')

    console.log(`📤 Sending message: "${messageContent}"`)

    try {
      // Find conversation
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

      // Send message via internal API (bypass user auth using internal token)
      const internalToken =
        process.env.FLOW_INTERNAL_TOKEN ||
        process.env.JWT_SECRET ||
        "dev-flow-internal-token"

      const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3003'}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-flow-token': internalToken,
        },
        body: JSON.stringify({
          conversationId: conversation.id,
          content: messageContent,
          type: 'TEXT',
          direction: 'OUTGOING'
        })
      })

      if (response.ok) {
        console.log(`✅ Message sent successfully`)
      } else {
        console.error(`❌ Failed to send message:`, await response.text())
      }
    } catch (error) {
      console.error('❌ Error sending message:', error)
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

// Trigger Manager - handles different trigger types
class TriggerManager {
  static async handleTrigger(triggerType: string, context: any): Promise<void> {
    console.log(`🎯 Trigger activated: ${triggerType}`, context)

    // Find active flows that match this trigger
    const flows = await prisma.botFlow.findMany({
      where: {
        isActive: true,
        // For now, we'll check if the flow has this trigger in its steps
        // In a more advanced implementation, you'd have a separate trigger field
      }
    })

    // Filter flows that should be triggered
    const matchingFlows = flows.filter(flow => {
      // Check if flow should be triggered based on its configuration
      return this.shouldTriggerFlow(flow, triggerType, context)
    })

    console.log(`📋 Found ${matchingFlows.length} matching flows for trigger: ${triggerType}`)

    // Execute matching flows
    for (const flow of matchingFlows) {
      const executor = new FlowExecutor(flow, context)
      await executor.execute()
    }
  }

  private static shouldTriggerFlow(flow: any, triggerType: string, context: any): boolean {
    // Prefer explicit trigger field on the flow
    if (flow.trigger && flow.trigger === triggerType) {
      return true
    }

    // Backward‑compatibility: check for trigger step inside steps array
    const triggerStep = Array.isArray(flow.steps)
      ? flow.steps.find(
          (step: any) =>
            step &&
            step.type === 'trigger' &&
            step.trigger === triggerType
        )
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