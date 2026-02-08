import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { logActivity } from "@/lib/logger"

// GET - جلب جميع المحادثات
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const isArchived = searchParams.get('archived')
    const isRead = searchParams.get('read')

    const where: any = {}

    if (status) where.status = status
    if (isArchived !== null) where.isArchived = isArchived === 'true'
    if (isRead !== null) where.isRead = isRead === 'true'

    const conversations = await prisma.conversation.findMany({
      where,
      include: {
        contact: true,
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
      conversations: conversations,
      count: conversations.length
    })
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch conversations"
      },
      { status: 500 }
    )
  }
}

// POST - إنشاء محادثة جديدة
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.contactId) {
      return NextResponse.json(
        {
          success: false,
          error: "Contact ID is required"
        },
        { status: 400 }
      )
    }

    const conversation = await prisma.conversation.create({
      data: {
        contactId: body.contactId,
        status: body.status || 'ACTIVE',
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
    console.error('Error creating conversation:', error)

    if (error.code === 'P2003') {
      return NextResponse.json(
        {
          success: false,
          error: "Contact or user not found"
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create conversation"
      },
      { status: 500 }
    )
  }
}
