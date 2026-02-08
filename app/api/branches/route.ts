import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// GET /api/branches - List all branches
export async function GET() {
    try {
        const branches = await prisma.branch.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                _count: {
                    select: { whatsappAccounts: true },
                },
            },
        })

        return NextResponse.json({
            success: true,
            branches,
            count: branches.length,
        })
    } catch (error) {
        console.error("Error fetching branches:", error)
        return NextResponse.json(
            { success: false, error: "Failed to fetch branches" },
            { status: 500 }
        )
    }
}

// POST /api/branches - Create new branch
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { name, address, phone, email, isActive } = body

        if (!name) {
            return NextResponse.json(
                { success: false, error: "Branch name is required" },
                { status: 400 }
            )
        }

        const branch = await prisma.branch.create({
            data: {
                name,
                address: address || null,
                phone: phone || null,
                email: email || null,
                isActive: isActive !== undefined ? isActive : true,
            },
        })

        return NextResponse.json({
            success: true,
            branch,
        })
    } catch (error) {
        console.error("Error creating branch:", error)
        return NextResponse.json(
            { success: false, error: "Failed to create branch" },
            { status: 500 }
        )
    }
}
