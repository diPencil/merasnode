import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { generateToken } from "@/lib/jwt"
import fs from 'fs';
import path from 'path';

function logDebug(message: string) {
    try {
        const logPath = path.join(process.cwd(), 'debug.log');
        fs.appendFileSync(logPath, new Date().toISOString() + ': ' + message + '\n');
    } catch (e) {
        console.error('Failed to write to debug log:', e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        const loginId = (body.email ?? body.loginId ?? '').trim()
        if (!loginId || !body.password) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Email/username and password are required"
                },
                { status: 400 }
            )
        }

        // If input contains @ → treat as email; else → treat as username (case-insensitive)
        const isEmail = loginId.includes('@')
        logDebug(`Login attempt for ${isEmail ? 'email' : 'username'}: ${loginId}`)
        const user = await (isEmail
            ? prisma.user.findUnique({
                where: { email: loginId },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    username: true,
                    password: true,
                    role: true,
                    gender: true,
                    status: true,
                    isActive: true
                }
            })
            : prisma.user.findUnique({
                where: { username: loginId.toLowerCase() },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    username: true,
                    password: true,
                    role: true,
                    gender: true,
                    status: true,
                    isActive: true
                }
            }))

        if (!user) {
            logDebug('User not found')
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid email, username or password"
                },
                { status: 401 }
            )
        }

        // التحقق من كلمة المرور المشفرة
        const isValidPassword = await bcrypt.compare(body.password, user.password)
        
        if (!isValidPassword) {
            logDebug('Invalid password');
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid email or password"
                },
                { status: 401 }
            )
        }

        // Check if user account is active
        if (user.isActive === false) {
            logDebug('User is inactive');
            return NextResponse.json(
                {
                    success: false,
                    error: "Your account has been deactivated. Please contact an administrator."
                },
                { status: 403 }
            )
        }

        // Update user status to ONLINE and record login time
        try {
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    status: 'ONLINE',
                    lastLoginAt: new Date()
                }
            })
        } catch (e) {
            logDebug(`Error updating user status: ${e}`);
            // Continue even if update fails?
        }

        // Create notification for the user about their login
        logDebug(`Creating notification for user ${user.id} (${user.role})`);
        try {
            const notif = await prisma.notification.create({
                data: {
                    userId: user.id,
                    title: 'Login Successful',
                    message: `You logged in successfully`,
                    type: 'SUCCESS',
                    isRead: false
                }
            })
            logDebug(`User notification created: ${notif.id}`);
        } catch (e) {
            logDebug(`Error creating user notification: ${e}`);
        }

        // Create notification for all admins about user login (only for non-admin users)
        if (user.role !== 'ADMIN') {
            logDebug('User is not ADMIN, notifying admins');
            const admins = await prisma.user.findMany({
                where: { role: 'ADMIN' },
                select: { id: true }
            })
            logDebug(`Found ${admins.length} admins`);

            await Promise.all(admins.map(async admin => {
                try {
                    await prisma.notification.create({
                        data: {
                            userId: admin.id,
                            title: 'User Login',
                            message: `${user.name} has logged in`,
                            type: 'INFO',
                            isRead: false
                        }
                    })
                } catch (e) {
                    logDebug(`Error notifying admin ${admin.id}: ${e}`);
                }
            }))
            logDebug('Admin notifications process completed');
        } else {
            logDebug('User is ADMIN, skipping admin notifications');
        }

        // Create activity log for user login
        await prisma.log.create({
            data: {
                userId: user.id,
                action: 'USER_LOGIN',
                entityType: 'User',
                entityId: user.id,
                ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
                userAgent: request.headers.get('user-agent') || 'unknown',
                metadata: {
                    userName: user.name,
                    userEmail: user.email,
                    userRole: user.role
                }
            }
        })

        // نجاح تسجيل الدخول - إنشاء JWT token
        const { password, ...userWithoutPassword } = user
        
        // Generate JWT token
        const token = generateToken({
            userId: user.id,
            email: user.email,
            role: user.role
        })

        return NextResponse.json({
            success: true,
            data: {
                user: userWithoutPassword,
                token
            }
        })
    } catch (error) {
        logDebug(`Global login error: ${error}`);
        console.error('Error during login:', error)
        return NextResponse.json(
            {
                success: false,
                error: "Login failed"
            },
            { status: 500 }
        )
    }
}
