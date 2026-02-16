// Role-Based Access Control (RBAC) Utilities

export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'AGENT'

export type Permission =
    | 'view_dashboard'
    | 'view_inbox'
    | 'view_contacts'
    | 'create_contact'
    | 'edit_contact'
    | 'delete_contact'
    | 'view_bookings'
    | 'create_booking'
    | 'edit_booking'
    | 'delete_booking'
    | 'view_templates'
    | 'create_template'
    | 'edit_template'
    | 'delete_template'
    | 'view_offers'
    | 'create_offer'
    | 'edit_offer'
    | 'delete_offer'
    | 'view_invoices'
    | 'create_invoice'
    | 'edit_invoice'
    | 'delete_invoice'
    | 'view_branches'
    | 'create_branch'
    | 'edit_branch'
    | 'delete_branch'
    | 'view_users'
    | 'create_user'
    | 'edit_user'
    | 'delete_user'
    | 'view_accounts'
    | 'manage_accounts'
    | 'view_settings'
    | 'manage_settings'
    | 'view_analytics'
    | 'view_activity_logs'
    | 'manage_whatsapp'
    | 'view_bot_flows'
    | 'create_bot_flow'
    | 'edit_bot_flow'
    | 'delete_bot_flow'

export type PageRoute =
    | '/dashboard'
    | '/inbox'
    | '/contacts'
    | '/bookings'
    | '/templates'
    | '/offers'
    | '/invoices'
    | '/branches'
    | '/users'
    | '/accounts'
    | '/settings'
    | '/analytics'
    | '/logs'
    | '/whatsapp'
    | '/bot-flows'

// Permissions matrix for each role
const rolePermissions: Record<UserRole, Permission[]> = {
    ADMIN: [
        // Full access to everything
        'view_dashboard',
        'view_inbox',
        'view_contacts', 'create_contact', 'edit_contact', 'delete_contact',
        'view_bookings', 'create_booking', 'edit_booking', 'delete_booking',
        'view_templates', 'create_template', 'edit_template', 'delete_template',
        'view_offers', 'create_offer', 'edit_offer', 'delete_offer',
        'view_invoices', 'create_invoice', 'edit_invoice', 'delete_invoice',
        'view_branches', 'create_branch', 'edit_branch', 'delete_branch',
        'view_users', 'create_user', 'edit_user', 'delete_user',
        'view_accounts', 'manage_accounts',
        'view_settings', 'manage_settings',
        'view_analytics',
        'view_activity_logs',
        'manage_whatsapp',
        'view_bot_flows', 'create_bot_flow', 'edit_bot_flow', 'delete_bot_flow',
    ],
    SUPERVISOR: [
        // Management access; NO delete permissions (delete hidden and API returns 403)
        'view_dashboard',
        'view_inbox',
        'view_contacts', 'create_contact', 'edit_contact',
        'view_bookings', 'create_booking', 'edit_booking',
        'view_templates',
        'view_offers', 'create_offer', 'edit_offer',
        'view_invoices', 'create_invoice', 'edit_invoice',
        'view_branches', // Read only
        'view_users', // Read only
        'view_settings', // Profile only
        'view_analytics', // Team data only
        'view_activity_logs', // Team logs only
        'view_bot_flows', 'create_bot_flow', // No edit/delete
    ],
    AGENT: [
        // Basic access with offers and invoices
        'view_dashboard',
        'view_inbox', // Assigned only
        'view_contacts', 'create_contact', 'edit_contact', // Limited edit
        'view_bookings', 'create_booking', 'edit_booking', // Limited edit
        'view_templates', // Read and use only
        'view_offers', 'create_offer', 'edit_offer', // Offers scoped to agent's branch/WhatsApp
        'view_invoices', 'create_invoice', 'edit_invoice', // Can manage invoices
        'view_settings', // Profile only
        'view_analytics', // Own analytics only (scoped on backend)
        'view_bot_flows', 'create_bot_flow', // No edit/delete
        // No activity logs, users, branches, accounts, whatsapp
    ],
}

// Page access matrix
const pageAccess: Record<PageRoute, UserRole[]> = {
    '/dashboard': ['ADMIN', 'SUPERVISOR', 'AGENT'],
    '/inbox': ['ADMIN', 'SUPERVISOR', 'AGENT'],
    '/contacts': ['ADMIN', 'SUPERVISOR', 'AGENT'],
    '/bookings': ['ADMIN', 'SUPERVISOR', 'AGENT'],
    '/templates': ['ADMIN', 'SUPERVISOR', 'AGENT'],
    '/offers': ['ADMIN', 'SUPERVISOR', 'AGENT'], // AGENT can access
    '/invoices': ['ADMIN', 'SUPERVISOR', 'AGENT'], // AGENT can access
    '/branches': ['ADMIN', 'SUPERVISOR'], // No AGENT
    '/users': ['ADMIN', 'SUPERVISOR'], // SUPERVISOR read-only
    '/accounts': ['ADMIN'], // ADMIN only - WhatsApp Accounts with Meta API
    '/settings': ['ADMIN', 'SUPERVISOR', 'AGENT'],
    '/analytics': ['ADMIN', 'SUPERVISOR', 'AGENT'], // AGENT sees own data only (scoped)
    '/logs': ['ADMIN', 'SUPERVISOR'], // No AGENT
    '/whatsapp': ['ADMIN'], // ADMIN only
    '/bot-flows': ['ADMIN', 'SUPERVISOR', 'AGENT'],
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
    return rolePermissions[role]?.includes(permission) ?? false
}

/**
 * Check if a role can access a specific page
 */
export function canAccessPage(role: UserRole, page: PageRoute): boolean {
    return pageAccess[page]?.includes(role) ?? false
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole): Permission[] {
    return rolePermissions[role] ?? []
}

/**
 * Check if user can perform CRUD action on entity
 */
export function canPerformAction(
    role: UserRole,
    action: 'create' | 'edit' | 'delete' | 'view',
    entity: string
): boolean {
    const permission = `${action}_${entity}` as Permission
    return hasPermission(role, permission)
}

/**
 * Get accessible pages for a role
 */
export function getAccessiblePages(role: UserRole): PageRoute[] {
    return Object.entries(pageAccess)
        .filter(([_, roles]) => roles.includes(role))
        .map(([page]) => page as PageRoute)
}
