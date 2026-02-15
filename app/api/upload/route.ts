import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { requireAuth, unauthorizedResponse } from '@/lib/api-auth';
import { sanitizeFilename, MAX_FILE_SIZE, ALLOWED_IMAGE_TYPES } from '@/lib/validations';

export async function POST(request: NextRequest) {
    console.log('[Upload API] Request received');
    try {
        // Require authentication
        const currentUser = await requireAuth(request);
        if (!currentUser) {
            console.log('[Upload API] Unauthorized');
            return unauthorizedResponse();
        }

        let data: FormData;
        try {
            data = await request.formData();
        } catch (e) {
            console.error('[Upload API] Parse FormData error:', e);
            return NextResponse.json(
                { success: false, error: 'Invalid request body. Use multipart/form-data with a "file" field.' },
                { status: 400 }
            );
        }

        const file = data.get('file') as File | null;

        if (!file) {
            console.log('[Upload API] No file provided');
            return NextResponse.json(
                { success: false, error: 'No file provided' },
                { status: 400 }
            );
        }

        console.log(`[Upload API] File received: ${file.name}, Type: ${file.type}, Size: ${file.size}`);

        // Validate File Size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { success: false, error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
                { status: 400 }
            );
        }

        // Validate File Type
        const allowedTypes = [...ALLOWED_IMAGE_TYPES];
        if (!file.type || !allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { success: false, error: 'Allowed image types: JPEG, PNG, WebP, GIF' },
                { status: 400 }
            );
        }

        // Prepare Directory
        const uploadDir = join(process.cwd(), 'public', 'uploads');
        try {
            await mkdir(uploadDir, { recursive: true });
        } catch (e: any) {
            if (e.code !== 'EEXIST') {
                console.error('[Upload API] Directory creation failed:', e);
                throw new Error('Failed to create upload directory');
            }
        }

        // Generate Filename
        const timestamp = Date.now();
        const safeName = sanitizeFilename(file.name).replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.-]/g, '');
        const filename = `${timestamp}-${safeName}`;
        const filePath = join(uploadDir, filename);

        // Write File
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        console.log(`[Upload API] File written to ${filePath}`);

        // Construct Public URL
        // Use logic to determine base URL properly or relative path
        // Returning absolute URL is nice, but relative is safer for portability if base varies
        // Request host can be used
        const host = request.headers.get('host') || 'localhost:3000';
        const protocol = request.headers.get('x-forwarded-proto') || 'http';
        const baseUrl = `${protocol}://${host}`;

        // Ensure we don't double slash
        const url = `${baseUrl}/uploads/${filename}`;

        return NextResponse.json({
            success: true,
            url: url,
            filename: filename
        });

    } catch (error: any) {
        console.error('[Upload API] Internal Error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
