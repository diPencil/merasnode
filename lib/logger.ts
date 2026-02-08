import { prisma } from "./db"
import { headers } from "next/headers"

// Parse User Agent to extract device, browser, and OS info
export function parseUserAgent(userAgent: string) {
    const ua = userAgent.toLowerCase()

    // Detect Device Type
    let device = "Desktop"
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent)) {
        device = "Tablet"
    } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(userAgent)) {
        device = "Mobile"
    }

    // Detect Browser
    let browser = "Unknown"
    if (ua.includes("edg/")) browser = "Edge"
    else if (ua.includes("chrome/")) browser = "Chrome"
    else if (ua.includes("firefox/")) browser = "Firefox"
    else if (ua.includes("safari/") && !ua.includes("chrome")) browser = "Safari"
    else if (ua.includes("opera") || ua.includes("opr/")) browser = "Opera"

    // Detect OS
    let os = "Unknown"
    if (ua.includes("win")) os = "Windows"
    else if (ua.includes("mac")) os = "macOS"
    else if (ua.includes("linux")) os = "Linux"
    else if (ua.includes("android")) os = "Android"
    else if (ua.includes("ios") || ua.includes("iphone") || ua.includes("ipad")) os = "iOS"

    return { device, browser, os }
}

// Get client IP address
export async function getClientIP(): Promise<string> {
    const headersList = await headers()
    const forwarded = headersList.get("x-forwarded-for")
    const realIP = headersList.get("x-real-ip")

    if (forwarded) {
        return forwarded.split(',')[0].trim()
    }
    if (realIP) {
        return realIP
    }
    return "Unknown"
}

// Get User Agent
export async function getUserAgent(): Promise<string> {
    const headersList = await headers()
    return headersList.get("user-agent") || "Unknown"
}

// Log Activity
export async function logActivity({
    userId,
    userName,
    action,
    entityType,
    entityId,
    oldValues,
    newValues,
    description
}: {
    userId?: string
    userName?: string
    action: string // CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc.
    entityType: string // Contact, Conversation, Message, etc.
    entityId?: string
    oldValues?: any
    newValues?: any
    description?: string
}) {
    try {
        let userAgent = "Unknown"
        let ipAddress = "Unknown"
        let device = "Unknown"
        let browser = "Unknown"
        let os = "Unknown"

        try {
            userAgent = await getUserAgent()
            ipAddress = await getClientIP()
            const parsed = parseUserAgent(userAgent)
            device = parsed.device
            browser = parsed.browser
            os = parsed.os
        } catch (err) {
            console.log("Could not get request metadata:", err)
        }

        await prisma.log.create({
            data: {
                userId: userId || null,
                action,
                entityType,
                entityId: entityId || null,
                ipAddress,
                userAgent,
                metadata: {
                    userName: userName || "System",
                    device,
                    browser,
                    os,
                    oldValues: oldValues || null,
                    newValues: newValues || null,
                    description: description || `${action} ${entityType}`
                }
            }
        })
    } catch (error) {
        console.error("Failed to log activity:", error)
        // Don't throw error - logging should not break the main operation
    }
}
