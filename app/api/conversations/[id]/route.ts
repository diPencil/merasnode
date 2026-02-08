import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// GET - جلب محادثة واحدة مع رسائلها
export async function GET(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
        const conversation = await prisma.conversation.findUnique({
            where: { id: params.id },
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
                    orderBy: { createdAt: 'asc' },
                    include: {
                        sender: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        }
                    }
                }
            }
        })

        if (!conversation) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Conversation not found"
                },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            data: conversation
        })
    } catch (error) {
        console.error('Error fetching conversation:', error)
        return NextResponse.json(
            {
                success: false,
                error: "Failed to fetch conversation"
            },
            { status: 500 }
        )
    }
}

// PUT - تحديث محادثة
export async function PUT(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
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
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        })

        return NextResponse.json({
            success: true,
            data: conversation
        })
    } catch (error: any) {
        console.error('Error updating conversation:', error)

        if (error.code === 'P2025') {
            return NextResponse.json(
                {
                    success: false,
                    error: "Conversation not found"
                },
                { status: 404 }
            )
        }

        return NextResponse.json(
            {
                success: false,
                error: "Failed to update conversation"
            },
            { status: 500 }
        )
    }
}

// DELETE - حذف محادثة
export async function DELETE(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
        await prisma.conversation.delete({
            where: { id: params.id }
        })

        return NextResponse.json({
            success: true,
            message: "Conversation deleted successfully"
        })
    } catch (error: any) {
        console.error('Error deleting conversation:', error)

        if (error.code === 'P2025') {
            return NextResponse.json(
                {
                    success: false,
                    error: "Conversation not found"
                },
                { status: 404 }
            )
        }

        return NextResponse.json(
            {
                success: false,
                error: "Failed to delete conversation"
            },
            { status: 500 }
        )
    }
}
