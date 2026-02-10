import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { logActivity } from "@/lib/logger"
import {
  requireAuthWithScope,
  buildConversationScopeFilter,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/api-auth"

// GET - Fetch conversations (scoped by role)
export async function GET(request: NextRequest) {
  try {
    const scope = await requireAuthWithScope(request)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const isArchived = searchParams.get('archived')
    const isRead = searchParams.get('read')
    const branchId = searchParams.get('branchId')

    // Start with role-based scope filter
    const where: any = { ...buildConversationScopeFilter(scope) }

    if (status) where.status = status
    if (isArchived !== null) where.isArchived = isArchived === 'true'
    if (isRead !== null) where.isRead = isRead === 'true'
    if (branchId && branchId !== 'all') {
      where.AND = where.AND || []
      where.AND.push({ contact: { branchId } })
    }

    const conversations = await prisma.conversation.findMany({
      where,
      include: {
        contact: {
          include: {
            branch: { select: { id: true, name: true } },
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { lastMessageAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      conversations,
      count: conversations.length
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') return unauthorizedResponse()
      if (error.message === 'Forbidden') return forbiddenResponse()
    }
    console.error('Error fetching conversations:', error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch conversations" },
      { status: 500 }
    )
  }
}

// POST - Create a new conversation (auth required)
export async function POST(request: NextRequest) {
  try {
    const scope = await requireAuthWithScope(request)
    const body = await request.json()

    if (!body.contactId) {
      return NextResponse.json(
        { success: false, error: "Contact ID is required" },
        { status: 400 }
      )
    }

    // Non-admin users: verify contact belongs to their branch scope
    if (scope.role !== 'ADMIN') {
      const contact = await prisma.contact.findUnique({
        where: { id: body.contactId },
        select: { branchId: true },
      })
      if (!contact) {
        return NextResponse.json(
          { success: false, error: "Contact not found" },
          { status: 404 }
        )
      }
      if (contact.branchId && !scope.branchIds.includes(contact.branchId)) {
        return forbiddenResponse('You do not have access to this contact')
      }
    }

    const conversation = await prisma.conversation.create({
      data: {
        contactId: body.contactId,
        status: body.status || 'ACTIVE',
        assignedToId: scope.userId,
        lastMessageAt: new Date()
      },
      include: {
        contact: true
      }
    })

    return NextResponse.json({
      success: true,
      data: conversation
    }, { status: 201 })
  } catch (error: any) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') return unauthorizedResponse()
      if (error.message === 'Forbidden') return forbiddenResponse()
    }
    console.error('Error creating conversation:', error)

    if (error.code === 'P2003') {
      return NextResponse.json(
        { success: false, error: "Contact or user not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { success: false, error: "Failed to create conversation" },
      { status: 500 }
    )
  }
}
