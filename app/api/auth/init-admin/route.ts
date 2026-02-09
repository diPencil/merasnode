import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

// API endpoint to create admin user
export async function POST() {
    try {
        // Check if admin already exists
        const existingAdmin = await prisma.user.findUnique({
            where: { email: "admin@meras.com" }
        })

        if (existingAdmin) {
            return NextResponse.json({
                success: false,
                error: "Admin user already exists"
            }, { status: 400 })
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash("admin123", 10)

        // Create admin user (username for login with email or username)
        const admin = await prisma.user.create({
            data: {
                username: "admin",
                email: "admin@meras.com",
                password: hashedPassword,
                name: "Admin User",
                role: "ADMIN",
                status: "ONLINE"
            }
        })

        return NextResponse.json({
            success: true,
            message: "Admin user created successfully",
            data: {
                email: admin.email,
                name: admin.name,
                role: admin.role
            }
        })
    } catch (error) {
        console.error('Error creating admin user:', error)
        return NextResponse.json({
            success: false,
            error: "Failed to create admin user"
        }, { status: 500 })
    }
}
