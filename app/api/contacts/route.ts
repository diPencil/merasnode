import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { logActivity } from "@/lib/logger"

// GET - جلب جميع جهات الاتصال
export async function GET() {
    try {
        const contacts = await prisma.contact.findMany({
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({
            success: true,
            data: contacts,
            count: contacts.length
        })
    } catch (error) {
        console.error('Error fetching contacts:', error)
        return NextResponse.json(
            {
                success: false,
                error: "Failed to fetch contacts"
            },
            { status: 500 }
        )
    }
}

// POST - إضافة جهة اتصال جديدة
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Check for bulk import (array)
        if (Array.isArray(body)) {
            const validContacts = body.filter((c: any) => c.name && c.phone).map((c: any) => ({
                name: c.name,
                phone: String(c.phone),
                email: c.email || null,
                tags: c.tags ? (Array.isArray(c.tags) ? c.tags.join(',') : c.tags) : null,
                notes: c.notes || null,
                createdAt: new Date(),
                updatedAt: new Date()
            }))

            if (validContacts.length === 0) {
                return NextResponse.json(
                    { success: false, error: "No valid contacts found" },
                    { status: 400 }
                )
            }

            // Using createMany for better performance
            const result = await prisma.contact.createMany({
                data: validContacts,
                skipDuplicates: true // Skip contacts with existing unique fields (like phone)
            })

            await logActivity({
                action: "BULK_CREATE",
                entityType: "Contact",
                entityId: "bulk",
                description: `Imported ${result.count} contacts`
            })

            return NextResponse.json({
                success: true,
                count: result.count,
                message: `Successfully imported ${result.count} contacts`
            }, { status: 201 })
        }

        // Single contact creation (existing logic)
        // التحقق من البيانات المطلوبة
        if (!body.name || !body.phone) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Name and phone are required"
                },
                { status: 400 }
            )
        }

        const contact = await prisma.contact.create({
            data: {
                name: body.name,
                phone: body.phone,
                email: body.email || null,
                tags: body.tags && body.tags.length > 0 ? body.tags : null,
                notes: body.notes || null,
                followUpDate: body.followUpDate ? new Date(body.followUpDate) : null
            }
        })

        // Log activity
        await logActivity({
            action: "CREATE",
            entityType: "Contact",
            entityId: contact.id,
            newValues: {
                name: contact.name,
                phone: contact.phone,
                email: contact.email
            },
            description: `Created new contact: ${contact.name}`
        })

        // Trigger bot flows for new contact
        try {
            await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3003'}/api/bot-flows/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    triggerType: 'new_contact',
                    context: {
                        contactId: contact.id,
                        contactName: contact.name,
                        contactPhone: contact.phone,
                        contactEmail: contact.email
                    }
                })
            })
        } catch (triggerError) {
            console.error('Error triggering bot flows:', triggerError)
        }

        return NextResponse.json({
            success: true,
            data: contact
        }, { status: 201 })
    } catch (error: any) {
        console.error('Error creating contact:', error)

        // التحقق من خطأ رقم مكرر
        if (error.code === 'P2002') {
            return NextResponse.json(
                {
                    success: false,
                    error: "Phone number already exists"
                },
                { status: 409 }
            )
        }

        return NextResponse.json(
            {
                success: false,
                error: "Failed to create contact"
            },
            { status: 500 }
        )
    }
}
