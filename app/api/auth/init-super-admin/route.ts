import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

/**
 * One-time creation of a super admin account that is hidden from the Users list.
 * Auth: header x-super-admin-secret or body.secret must match SUPER_ADMIN_INIT_SECRET (or JWT_SECRET if unset).
 * Credentials: body.email, body.password, body.name — or env SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, SUPER_ADMIN_NAME.
 */
export async function POST(request: NextRequest) {
    try {
        let body: { secret?: string; email?: string; password?: string; name?: string } = {}
        try {
            body = await request.json()
        } catch {
            // no body
        }
        const secret = request.headers.get("x-super-admin-secret") ?? body.secret
        const expected = process.env.SUPER_ADMIN_INIT_SECRET || process.env.JWT_SECRET
        if (!expected || secret !== expected) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
        }

        const email = (body.email?.trim() || process.env.SUPER_ADMIN_EMAIL?.trim()) || ""
        const password = body.password ?? process.env.SUPER_ADMIN_PASSWORD ?? ""
        const name = (body.name?.trim() || process.env.SUPER_ADMIN_NAME?.trim()) || "Super Admin"

        if (!email || !password) {
            return NextResponse.json(
                { success: false, error: "email and password required (body or env SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD)" },
                { status: 400 }
            )
        }

        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing) {
            return NextResponse.json(
                { success: false, error: "Super admin user already exists" },
                { status: 400 }
            )
        }

        const hashedPassword = await bcrypt.hash(password, 10)
        const username = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "")

        const user = await prisma.user.create({
            data: {
                email,
                username: username || `superadmin-${Date.now()}`,
                password: hashedPassword,
                name,
                role: "ADMIN",
                hiddenFromUserList: true,
            },
            select: { id: true, email: true, name: true, role: true },
        })

        return NextResponse.json({
            success: true,
            message: "Super admin created successfully (hidden from Users list)",
            data: { email: user.email, name: user.name, role: user.role },
        })
    } catch (error) {
        console.error("Error creating super admin:", error)
        return NextResponse.json(
            { success: false, error: "Failed to create super admin" },
            { status: 500 }
        )
    }
}
