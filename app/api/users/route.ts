import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { requireRole, unauthorizedResponse, forbiddenResponse } from "@/lib/api-auth"
import { createUserSchema, validateBody } from "@/lib/validations"
import { getPaginationParams, createPaginatedResponse, getSortParams, getSearchParam, buildSearchFilter } from "@/lib/pagination"

// GET - جلب جميع المستخدمين (Admin/Supervisor only)
export async function GET(request: NextRequest) {
    try {
        // Require ADMIN or SUPERVISOR role
        const currentUser = await requireRole(request, ['ADMIN', 'SUPERVISOR'])
        
        logDebug(`User ${currentUser.userId} fetching users list`)
        
        // Get pagination, sorting, and search parameters
        const pagination = getPaginationParams(request)
        const sort = getSortParams(request, 'createdAt')
        const search = getSearchParam(request)
        
        const { searchParams } = new URL(request.url)
        const roleFilter = searchParams.get('role')
        const statusFilter = searchParams.get('status')

        // Build where clause
        const where: any = {}
        if (roleFilter) where.role = roleFilter
        if (statusFilter) where.status = statusFilter
        
        // Add search filter
        if (search) {
            where.AND = buildSearchFilter(search, ['name', 'email'])
        }

        // Get total count
        const total = await prisma.user.count({ where })

        // Get paginated users
        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                isActive: true,
                lastLoginAt: true,
                lastLogoutAt: true,
                createdAt: true,
                updatedAt: true,
                branches: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                whatsappAccounts: {
                    select: {
                        id: true,
                        name: true,
                        phone: true
                    }
                }
                // لا نرجع password للأمان
            },
            orderBy: sort,
            skip: pagination.skip,
            take: pagination.limit
        })

        const paginatedResponse = createPaginatedResponse(users, total, pagination)

        return NextResponse.json({
            success: true,
            ...paginatedResponse
        })
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Unauthorized') {
                return unauthorizedResponse()
            }
            if (error.message === 'Forbidden') {
                return forbiddenResponse('Only admins and supervisors can view users')
            }
        }
        
        console.error('Error fetching users:', error)
        return NextResponse.json(
            {
                success: false,
                error: "Failed to fetch users"
            },
            { status: 500 }
        )
    }
}

function logDebug(message: string) {
    if (process.env.NODE_ENV === 'development') {
        console.log(`[Users API] ${message}`)
    }
}

// POST - إنشاء مستخدم جديد (Admin only)
export async function POST(request: NextRequest) {
    try {
        // Require ADMIN role
        const currentUser = await requireRole(request, ['ADMIN'])
        
        logDebug(`Admin ${currentUser.userId} creating new user`)
        const body = await request.json()
        
        // Validate input
        const validation = validateBody(createUserSchema, body)
        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: validation.error },
                { status: 400 }
            )
        }
        
        const validatedData = validation.data

        // التحقق من عدم وجود المستخدم
        const existingUser = await prisma.user.findUnique({
            where: { email: validatedData.email }
        })

        if (existingUser) {
            return NextResponse.json(
                {
                    success: false,
                    error: "User with this email already exists"
                },
                { status: 409 }
            )
        }

        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(validatedData.password, 10)
        
        // Create user with relations
        const user = await prisma.user.create({
            data: {
                name: validatedData.name,
                email: validatedData.email,
                password: hashedPassword,
                role: validatedData.role || 'AGENT',
                status: 'OFFLINE', // Default to offline
                branches: validatedData.branchIds ? {
                    connect: validatedData.branchIds.map((id) => ({ id }))
                } : undefined,
                whatsappAccounts: validatedData.whatsappAccountIds ? {
                    connect: validatedData.whatsappAccountIds.map((id) => ({ id }))
                } : undefined,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                isActive: true,
                createdAt: true,
                branches: true,
                whatsappAccounts: true
            }
        })

        logDebug(`User created successfully: ${user.id}`)
        
        return NextResponse.json({
            success: true,
            data: user,
            message: 'User created successfully'
        }, { status: 201 })
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Unauthorized') {
                return unauthorizedResponse()
            }
            if (error.message === 'Forbidden') {
                return forbiddenResponse('Only admins can create users')
            }
        }
        
        console.error('Error creating user:', error)
        return NextResponse.json(
            {
                success: false,
                error: "Failed to create user"
            },
            { status: 500 }
        )
    }
}
