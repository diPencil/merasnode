import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// GET /api/branches/[id] - Get single branch
export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    const params = await context.params
    try {
        const branch = await prisma.branch.findUnique({
            where: { id: params.id },
            include: {
                whatsappAccounts: true,
            },
        })

        if (!branch) {
            return NextResponse.json(
                { success: false, error: "Branch not found" },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            branch,
        })
    } catch (error) {
        console.error("Error fetching branch:", error)
        return NextResponse.json(
            { success: false, error: "Failed to fetch branch" },
            { status: 500 }
        )
    }
}

// PUT /api/branches/[id] - Update branch
export async function PUT(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    const params = await context.params
    try {
        const body = await request.json()
        const { name, address, phone, email, isActive } = body

        const branch = await prisma.branch.update({
            where: { id: params.id },
            data: {
                name,
                address: address || null,
                phone: phone || null,
                email: email || null,
                isActive,
            },
        })

        return NextResponse.json({
            success: true,
            branch,
        })
    } catch (error) {
        console.error("Error updating branch:", error)
        return NextResponse.json(
            { success: false, error: "Failed to update branch" },
            { status: 500 }
        )
    }
}

// DELETE /api/branches/[id] - Delete branch
export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    const params = await context.params
    try {
        console.log('🗑️ Attempting to delete branch:', params.id)

        // Check if branch exists
        const branch = await prisma.branch.findUnique({
            where: { id: params.id },
            include: {
                _count: {
                    select: { whatsappAccounts: true },
                },
            },
        })

        if (!branch) {
            console.log('❌ Branch not found:', params.id)
            return NextResponse.json(
                { success: false, error: "Branch not found" },
                { status: 404 }
            )
        }

        console.log('✅ Branch found:', branch.name, 'WhatsApp accounts:', branch._count.whatsappAccounts)

        // If branch has linked WhatsApp accounts, unlink them first
        if (branch._count.whatsappAccounts > 0) {
            console.log('🔗 Unlinking WhatsApp accounts...')
            await prisma.whatsAppAccount.updateMany({
                where: { branchId: params.id },
                data: { branchId: null },
            })
            console.log('✅ WhatsApp accounts unlinked')
        }

        // Now delete the branch
        console.log('🗑️ Deleting branch...')
        await prisma.branch.delete({
            where: { id: params.id },
        })
        console.log('✅ Branch deleted successfully')

        return NextResponse.json({
            success: true,
            message: "Branch deleted successfully",
        })
    } catch (error: any) {
        console.error("❌ Error deleting branch:", error)
        console.error("Error details:", error.message, error.code)
        return NextResponse.json(
            { success: false, error: error.message || "Failed to delete branch" },
            { status: 500 }
        )
    }
}
