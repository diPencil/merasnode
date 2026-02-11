import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  requireAuthWithScope,
  requireDeleteAllowed,
  buildConversationScopeFilter,
  unauthorizedResponse,
  forbiddenResponse,
  UserScope,
} from "@/lib/api-auth"

/**
 * Verify that a conversation belongs to the user's scope.
 * Returns the conversation if authorized, null otherwise.
 */
async function verifyConversationAccess(conversationId: string, scope: UserScope) {
  const scopeFilter = buildConversationScopeFilter(scope)
  return prisma.conversation.findFirst({
    where: { id: conversationId, ...scopeFilter },
    select: { id: true },
  })
}

// GET - Fetch a single conversation with messages (auth + scope)
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const scope = await requireAuthWithScope(request)
    const params = await props.params

    // Verify access
    const allowed = await verifyConversationAccess(params.id, scope)
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "Conversation not found" },
        { status: 404 }
      )
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: params.id },
      include: {
        contact: true,
        assignedTo: {
          select: { id: true, name: true, email: true }
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    })

    if (!conversation) {
      return NextResponse.json(
        { success: false, error: "Conversation not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: conversation })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') return unauthorizedResponse()
      if (error.message === 'Forbidden') return forbiddenResponse()
    }
    console.error('Error fetching conversation:', error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch conversation" },
      { status: 500 }
    )
  }
}

// PUT - Update conversation (auth + scope)
export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const scope = await requireAuthWithScope(request)
    const params = await props.params

    const allowed = await verifyConversationAccess(params.id, scope)
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "Conversation not found" },
        { status: 404 }
      )
    }

    const body = await request.json()

    const conversation = await prisma.conversation.update({
      where: { id: params.id },
      data: {
        assignedToId: body.assignedToId,
        status: body.status,
        isRead: body.isRead,
        isArchived: body.isArchived,
        isBlocked: body.isBlocked
      },
      include: {
        contact: true,
        assignedTo: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    return NextResponse.json({ success: true, data: conversation })
  } catch (error: any) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') return unauthorizedResponse()
      if (error.message === 'Forbidden') return forbiddenResponse()
    }
    console.error('Error updating conversation:', error)
    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: "Conversation not found" },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { success: false, error: "Failed to update conversation" },
      { status: 500 }
    )
  }
}

// DELETE - Delete conversation (ADMIN only; Supervisor blocked and audited)
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params
    const conv = await prisma.conversation.findUnique({ where: { id: params.id }, include: { contact: true } })
    const prevState = conv ? { contactId: conv.contactId, status: conv.status } : undefined
    const allowed = await requireDeleteAllowed(request, "Conversation", params.id, prevState)
    if (allowed instanceof NextResponse) return allowed

    await prisma.conversation.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      success: true,
      message: "Conversation deleted successfully"
    })
  } catch (error: any) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') return unauthorizedResponse()
      if (error.message === 'Forbidden') return forbiddenResponse()
    }
    console.error('Error deleting conversation:', error)
    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: "Conversation not found" },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { success: false, error: "Failed to delete conversation" },
      { status: 500 }
    )
  }
}
