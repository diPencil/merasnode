import { z } from 'zod'

// Username: letters, numbers, underscores only; no spaces; case-insensitive (store lowercase)
const usernameSchema = z
    .string()
    .min(2, 'Username must be at least 2 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores (no spaces)')

// User validations
export const createUserSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    username: usernameSchema,
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters').max(100),
    role: z.enum(['ADMIN', 'SUPERVISOR', 'AGENT']).optional(),
    gender: z.enum(['MALE', 'FEMALE']).optional(),
    branchIds: z.array(z.string().uuid()).optional(),
    whatsappAccountIds: z.array(z.string().uuid()).optional(),
})

export const updateUserSchema = z.object({
    name: z.string().min(2).max(100).optional(),
    username: usernameSchema.optional().nullable(),
    email: z.string().email().optional(),
    role: z.enum(['ADMIN', 'SUPERVISOR', 'AGENT']).optional(),
    gender: z.enum(['MALE', 'FEMALE']).optional(),
    status: z.enum(['ONLINE', 'OFFLINE', 'AWAY']).optional(),
    isActive: z.boolean().optional(),
    branchIds: z.array(z.string().uuid()).optional(),
    whatsappAccountIds: z.array(z.string().uuid()).optional(),
})

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters').max(100),
    confirmPassword: z.string().min(1, 'Please confirm your new password')
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
})

// Contact validations
export const createContactSchema = z.object({
    name: z.string().min(2).max(100),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
    email: z.string().email().optional().or(z.literal('')),
    tags: z.string().optional(),
    notes: z.string().optional(),
    followUpDate: z.string().datetime().optional(),
    branchId: z.string().uuid().optional(),
})

export const updateContactSchema = createContactSchema.partial()

// Message validations
export const sendMessageSchema = z.object({
    conversationId: z.string().uuid(),
    content: z.string().min(1, 'Message cannot be empty').max(10000),
    type: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT']).optional(),
    mediaUrl: z.string().url().optional(),
    whatsappAccountId: z.string().uuid().optional(),
})

// Conversation validations
export const createConversationSchema = z.object({
    contactId: z.string().uuid(),
    assignedToId: z.string().uuid().optional(),
    status: z.enum(['ACTIVE', 'RESOLVED', 'PENDING']).optional(),
})

export const updateConversationSchema = z.object({
    assignedToId: z.string().uuid().optional(),
    status: z.enum(['ACTIVE', 'RESOLVED', 'PENDING']).optional(),
    isRead: z.boolean().optional(),
    isArchived: z.boolean().optional(),
    isBlocked: z.boolean().optional(),
})

// Template validations
export const createTemplateSchema = z.object({
    name: z.string().min(2).max(100),
    content: z.string().min(1).max(10000),
    category: z.string().min(1).max(50),
    language: z.string().length(2, 'Language code must be 2 characters'),
    status: z.enum(['APPROVED', 'PENDING', 'REJECTED']).optional(),
})

export const updateTemplateSchema = createTemplateSchema.partial()

// Bot Flow validations
export const createBotFlowSchema = z.object({
    name: z.string().min(2).max(100),
    description: z.string().optional(),
    trigger: z.string().min(1).max(200),
    steps: z.any(), // JSON field
    isActive: z.boolean().optional(),
})

export const updateBotFlowSchema = createBotFlowSchema.partial()

// Branch validations
export const createBranchSchema = z.object({
    name: z.string().min(2).max(100),
    address: z.string().optional(),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
    email: z.string().email().optional().or(z.literal('')),
    isActive: z.boolean().optional(),
})

export const updateBranchSchema = createBranchSchema.partial()

// WhatsApp Account validations
export const createWhatsAppAccountSchema = z.object({
    name: z.string().min(2).max(100),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
    provider: z.string().optional(),
    branchId: z.string().uuid().optional(),
})

export const updateWhatsAppAccountSchema = z.object({
    name: z.string().min(2).max(100).optional(),
    status: z.enum(['CONNECTED', 'DISCONNECTED', 'WAITING']).optional(),
    qrCode: z.string().optional(),
    sessionData: z.any().optional(),
    branchId: z.string().uuid().optional(),
})

// Booking validations
export const createBookingSchema = z.object({
    contactId: z.string().uuid(),
    agentId: z.string().uuid().optional(),
    branch: z.string().optional(),
    date: z.string().datetime(),
    notes: z.string().optional(),
})

export const updateBookingSchema = z.object({
    agentId: z.string().uuid().optional(),
    branch: z.string().optional(),
    status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']).optional(),
    date: z.string().datetime().optional(),
    notes: z.string().optional(),
})

// Invoice validations
export const createInvoiceSchema = z.object({
    contactId: z.string().uuid(),
    amount: z.number().positive('Amount must be positive'),
    currency: z.string().length(3, 'Currency code must be 3 characters').optional(),
    items: z.any(), // JSON field
    dueDate: z.string().datetime(),
    notes: z.string().optional(),
})

export const updateInvoiceSchema = z.object({
    amount: z.number().positive().optional(),
    currency: z.string().length(3).optional(),
    status: z.enum(['PENDING', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
    items: z.any().optional(),
    dueDate: z.string().datetime().optional(),
    paidAt: z.string().datetime().optional(),
    notes: z.string().optional(),
})

// Note validations
export const createNoteSchema = z.object({
    content: z.string().min(1).max(10000),
    contactId: z.string().uuid(),
})

export const updateNoteSchema = z.object({
    content: z.string().min(1).max(10000),
})

// File upload validations
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
export const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/mpeg', 'video/webm']
export const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg']

/**
 * Validate file upload
 */
export function validateFileUpload(file: File, allowedTypes: string[], maxSize: number = MAX_FILE_SIZE): { valid: boolean; error?: string } {
    if (!file) {
        return { valid: false, error: 'No file provided' }
    }

    if (file.size > maxSize) {
        return { valid: false, error: `File size exceeds ${maxSize / 1024 / 1024}MB limit` }
    }

    if (!allowedTypes.includes(file.type)) {
        return { valid: false, error: 'File type not allowed' }
    }

    return { valid: true }
}

/**
 * Sanitize filename to prevent path traversal
 */
export function sanitizeFilename(filename: string): string {
    // Remove any path separators and special characters
    return filename
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/\.+/g, '.')
        .replace(/^\.+/, '')
        .substring(0, 255)
}

/**
 * Helper function to validate request body with Zod schema
 */
export function validateBody<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
    try {
        const validated = schema.parse(data)
        return { success: true, data: validated }
    } catch (error) {
        if (error instanceof z.ZodError) {
            const firstError = error.errors[0]
            return {
                success: false,
                error: `${firstError.path.join('.')}: ${firstError.message}`
            }
        }
        return { success: false, error: 'Validation failed' }
    }
}
