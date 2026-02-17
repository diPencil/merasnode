import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireRoleWithScope, unauthorizedResponse, forbiddenResponse } from "@/lib/api-auth"

// POST /api/branches/import - Bulk import / restore branches (ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const scope = await requireRoleWithScope(request, ["ADMIN"])

    const body = await request.json()
    const rows = Array.isArray(body?.branches) ? body.branches : []

    if (!rows.length) {
      return NextResponse.json(
        { success: false, error: "No branches provided for import" },
        { status: 400 }
      )
    }

    if (rows.length > 1000) {
      return NextResponse.json(
        { success: false, error: "Import limit exceeded (max 1000 branches)" },
        { status: 400 }
      )
    }

    const sanitized = rows
      .map((raw: any) => {
        const name = String(raw.name ?? "").trim()
        if (!name) return null
        const id = raw.id && typeof raw.id === "string" && raw.id.trim().length > 0 ? raw.id.trim() : undefined
        const address = raw.address != null ? String(raw.address).trim() || null : null
        const phone = raw.phone != null ? String(raw.phone).trim() || null : null
        const email = raw.email != null ? String(raw.email).trim() || null : null
        const isActive =
          raw.isActive === true ||
          raw.isActive === "true" ||
          raw.isActive === "1" ||
          String(raw.status || "").toLowerCase() === "active"

        return {
          id,
          name,
          address,
          phone,
          email,
          isActive,
        }
      })
      .filter(Boolean) as {
        id?: string
        name: string
        address: string | null
        phone: string | null
        email: string | null
        isActive: boolean
      }[]

    if (!sanitized.length) {
      return NextResponse.json(
        { success: false, error: "No valid branches found in import file" },
        { status: 400 }
      )
    }

    let created = 0
    let updated = 0

    await prisma.$transaction(
      sanitized.map((row) => {
        if (row.id) {
          return prisma.branch
            .findUnique({ where: { id: row.id }, select: { id: true } })
            .then((existing) => {
              if (existing) {
                updated += 1
                return prisma.branch.update({
                  where: { id: row.id },
                  data: {
                    name: row.name,
                    address: row.address,
                    phone: row.phone,
                    email: row.email,
                    isActive: row.isActive,
                  },
                })
              } else {
                created += 1
                return prisma.branch.create({
                  data: {
                    id: row.id,
                    name: row.name,
                    address: row.address,
                    phone: row.phone,
                    email: row.email,
                    isActive: row.isActive,
                  },
                })
              }
            })
        }

        created += 1
        return prisma.branch.create({
          data: {
            name: row.name,
            address: row.address,
            phone: row.phone,
            email: row.email,
            isActive: row.isActive,
          },
        })
      })
    )

    return NextResponse.json({
      success: true,
      created,
      updated,
      total: sanitized.length,
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") return unauthorizedResponse()
      if (error.message === "Forbidden") return forbiddenResponse("Only admins can import branches")
    }
    console.error("Error importing branches:", error)
    return NextResponse.json(
      { success: false, error: "Failed to import branches" },
      { status: 500 }
    )
  }
}

