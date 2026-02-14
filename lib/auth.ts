

// Auth utilities for session management
export interface AuthUser {
    id: string
    name: string
    email: string
    role: string
    gender?: 'MALE' | 'FEMALE'
}

export interface AuthSession {
    user: AuthUser
    token: string
    isAuthenticated: boolean
}

// Login function
export async function login(email: string, password: string): Promise<{ success: boolean; data?: AuthSession; error?: string }> {
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        })

        const data = await response.json()

        if (data.success) {
            // Store session in localStorage
            const session: AuthSession = {
                user: data.data.user,
                token: data.data.token,
                isAuthenticated: true
            }
            localStorage.setItem('auth_session', JSON.stringify(session))
            return { success: true, data: session }
        } else {
            return { success: false, error: data.error }
        }
    } catch (error) {
        return { success: false, error: 'Login failed. Please try again.' }
    }
}

// Logout function
export async function logout() {
    try {
        // Get current user before clearing session
        const user = getUser()

        if (user) {
            // Update status to OFFLINE and record logout time
            await fetch(`/api/users/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    status: 'OFFLINE',
                    lastLogoutAt: new Date().toISOString()
                })
            })

            // Create notification for the user about their logout
            await fetch('/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    title: 'Logout Successful',
                    message: 'You logged out successfully',
                    type: 'INFO'
                })
            })

            // Create notification for all admins about user logout (only for non-admin users)
            if (user.role !== 'ADMIN') {
                await fetch('/api/notifications/create-for-admins', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: 'User Logout',
                        message: `${user.name} has logged out`,
                        type: 'INFO'
                    })
                })
            }

            // Create activity log for user logout
            await fetch('/api/logs/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    action: 'USER_LOGOUT',
                    entityType: 'User',
                    entityId: user.id,
                    ipAddress: 'client',
                    userAgent: navigator.userAgent,
                    metadata: {
                        userName: user.name,
                        userEmail: user.email,
                        userRole: user.role
                    }
                })
            })
        }
    } catch (error) {
        console.error('Error updating status on logout:', error)
    } finally {
        // Clear session and redirect
        localStorage.removeItem('auth_session')
        sessionStorage.clear()
        window.location.href = '/login'
    }
}

// Get current user
export function getUser(): AuthUser | null {
    try {
        const session = localStorage.getItem('auth_session')
        if (session) {
            const parsed: AuthSession = JSON.parse(session)
            return parsed.user
        }
        return null
    } catch {
        return null
    }
}

// Check if authenticated
export function isAuthenticated(): boolean {
    try {
        const session = localStorage.getItem('auth_session')
        if (session) {
            const parsed: AuthSession = JSON.parse(session)
            return parsed.isAuthenticated === true
        }
        return false
    } catch {
        return false
    }
}

// Get full session
export function getSession(): AuthSession | null {
    try {
        const session = localStorage.getItem('auth_session')
        if (session) {
            return JSON.parse(session)
        }
        return null
    } catch {
        return null
    }
}

// Get user role
export function getUserRole(): string | null {
    const user = getUser()
    return user?.role ?? null
}

// Get authorization header for API requests
export function getAuthHeader(): { Authorization?: string } {
    const session = getSession()
    if (session?.token) {
        return { Authorization: `Bearer ${session.token}` }
    }
    return {}
}

// API request helper with authentication
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
        ...options.headers
    }

    return fetch(url, {
        cache: 'no-store',
        ...options,
        headers
    })
}