import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { requireRole, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';
import { sanitizeFilename, MAX_FILE_SIZE, ALLOWED_IMAGE_TYPES } from '@/lib/validations';

// Allow larger body for file upload (Next.js may limit; 4MB is safe for most runtimes)
export const maxDuration = 60;

// Upload allowed for Admin and Supervisor only (Agent cannot create offers)
export async function POST(request: NextRequest) {
    try {
        await requireRole(request, ['ADMIN', 'SUPERVISOR']);
    } catch (e) {
        if (e instanceof Error && e.message === 'Unauthorized') return unauthorizedResponse();
        if (e instanceof Error && e.message === 'Forbidden') return forbiddenResponse('You do not have permission to upload images.');
        return unauthorizedResponse();
    }

    try {
        let data: FormData;
        try {
            data = await request.formData();
        } catch (e) {
            return NextResponse.json(
                { success: false, error: 'Invalid request body. Use multipart/form-data with a "file" field.' },
                { status: 400 }
            );
        }

        const file = data.get('file') as File | null;

        if (!file || !(file instanceof File) || file.size === 0) {
            return NextResponse.json(
                { success: false, error: 'No file provided' },
                { status: 400 }
            );
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { success: false, error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
                { status: 400 }
            );
        }

        if (!file.type || !ALLOWED_IMAGE_TYPES.includes(file.type)) {
            return NextResponse.json(
                { success: false, error: 'Allowed image types: JPEG, PNG, WebP only' },
                { status: 400 }
            );
        }

        const uploadDir = join(process.cwd(), 'public', 'uploads');
        await mkdir(uploadDir, { recursive: true });

        const timestamp = Date.now();
        const safeName = sanitizeFilename(file.name).replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.-]/g, '');
        const ext = file.type === 'image/jpeg' ? '.jpg' : file.type === 'image/png' ? '.png' : '.webp';
        const filename = `${timestamp}-${safeName}${safeName.toLowerCase().endsWith(ext) ? '' : ext}`;
        const filePath = join(uploadDir, filename);

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        const host = request.headers.get('host') || 'localhost:3000';
        const protocol = request.headers.get('x-forwarded-proto') || 'http';
        const baseUrl = `${protocol}://${host}`;
        const url = `${baseUrl}/uploads/${filename}`;

        return NextResponse.json({
            success: true,
            url,
            filename,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Upload failed';
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        );
    }
}
