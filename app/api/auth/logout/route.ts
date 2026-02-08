import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
    try {
        // TODO: هنا لازم نمسح الـ JWT token من الـ cookies/localStorage

        return NextResponse.json({
            success: true,
            message: "Logged out successfully"
        })
    } catch (error) {
        console.error('Error during logout:', error)
        return NextResponse.json(
            {
                success: false,
                error: "Logout failed"
            },
            { status: 500 }
        )
    }
}
