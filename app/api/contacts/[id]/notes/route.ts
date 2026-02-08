import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const notes = await prisma.note.findMany({
            where: { contactId: id },
            orderBy: { createdAt: 'desc' },
            include: {
                creator: {
                    select: { name: true }
                }
            }
        })

        return NextResponse.json({
            success: true,
            data: notes
        })
    } catch (error) {
        return NextResponse.json(
            { success: false, error: "Failed to fetch notes" },
            { status: 500 }
        )
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()

        if (!body.content) {
            return NextResponse.json(
                { success: false, error: "Content is required" },
                { status: 400 }
            )
        }

        const note = await prisma.note.create({
            data: {
                content: body.content,
                contactId: id,
                createdBy: body.userId // Should be gathered from session/auth in real app
            },
            include: {
                creator: {
                    select: { name: true }
                }
            }
        })

        return NextResponse.json({
            success: true,
            data: note
        })
    } catch (error) {
        return NextResponse.json(
            { success: false, error: "Failed to create note" },
            { status: 500 }
        )
    }
}
