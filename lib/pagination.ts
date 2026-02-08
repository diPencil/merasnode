import { NextRequest } from 'next/server'

export interface PaginationParams {
    page: number
    limit: number
    skip: number
}

export interface PaginationResult<T> {
    data: T[]
    pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
        hasNext: boolean
        hasPrev: boolean
    }
}

/**
 * Extract pagination parameters from request URL
 */
export function getPaginationParams(request: NextRequest): PaginationParams {
    const { searchParams } = new URL(request.url)
    
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit
    
    return { page, limit, skip }
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
    data: T[],
    total: number,
    params: PaginationParams
): PaginationResult<T> {
    const totalPages = Math.ceil(total / params.limit)
    
    return {
        data,
        pagination: {
            page: params.page,
            limit: params.limit,
            total,
            totalPages,
            hasNext: params.page < totalPages,
            hasPrev: params.page > 1
        }
    }
}

/**
 * Get sort parameters from request
 */
export function getSortParams(request: NextRequest, defaultField: string = 'createdAt') {
    const { searchParams } = new URL(request.url)
    
    const sortBy = searchParams.get('sortBy') || defaultField
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'
    
    return { [sortBy]: sortOrder }
}

/**
 * Get search parameter from request
 */
export function getSearchParam(request: NextRequest, field: string = 'search'): string | null {
    const { searchParams } = new URL(request.url)
    return searchParams.get(field)
}

/**
 * Build search filter for Prisma
 * Searches across multiple string fields
 */
export function buildSearchFilter(search: string | null, fields: string[]) {
    if (!search) return {}
    
    return {
        OR: fields.map(field => ({
            [field]: {
                contains: search,
                mode: 'insensitive' as const
            }
        }))
    }
}
