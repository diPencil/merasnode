import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join, basename } from 'path';
import { requireAuth, unauthorizedResponse } from '@/lib/api-auth';
import { sanitizeFilename, MAX_FILE_SIZE, ALLOWED_IMAGE_TYPES } from '@/lib/validations';

export async function POST(request: NextRequest) {
    try {
        // Require authentication
        const currentUser = await requireAuth(request);

        let data: FormData;
        try {
            data = await request.formData();
        } catch (e) {
            console.error('Upload formData error:', e);
            return NextResponse.json(
                { success: false, error: 'Invalid request body. Use multipart/form-data with a "file" field.' },
                { status: 400 }
            );
        }
        const file = data.get('file') as unknown as File | Blob | null;

        if (!file || typeof (file as any).arrayBuffer !== 'function') {
            return NextResponse.json(
                { success: false, error: 'No file provided' },
                { status: 400 }
            );
        }

        // دعم Blob (بدون name) — نستنتج الامتداد من type إن أمكن
        const fileName = typeof (file as any).name === 'string' ? (file as File).name : '';
        const mimeType = (file as any).type || '';
        const fileSize = typeof (file as any).size === 'number' ? (file as any).size : 0;

        if (fileSize > MAX_FILE_SIZE) {
            return NextResponse.json(
                { success: false, error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
                { status: 400 }
            );
        }
        const allowedTypes = [...ALLOWED_IMAGE_TYPES];
        if (!mimeType || !allowedTypes.includes(mimeType)) {
            return NextResponse.json(
                { success: false, error: 'Allowed image types: JPEG, PNG, WebP, GIF' },
                { status: 400 }
            );
        }

        // Read file data
        const bytes = await (file as Blob).arrayBuffer();
        const buffer = Buffer.from(bytes);

        const timestamp = Date.now();
        const randomSuffix = Math.round(Math.random() * 1E9);
        const extFromName = fileName ? sanitizeFilename(fileName).split('.').pop() : '';
        const extFromMime: Record<string, string> = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
            'image/gif': 'gif',
        };
        const ext = (extFromName && /^[a-z0-9]+$/i.test(extFromName))
            ? extFromName
            : (extFromMime[mimeType] || 'bin');
        const filename = `${timestamp}-${randomSuffix}.${ext}`;

        // Ensure upload directory exists
        const uploadDir = join(process.cwd(), 'public', 'uploads');
        try {
            await mkdir(uploadDir, { recursive: true });
        } catch (e) {
            // Directory already exists
        }

        // Write file (using basename to prevent path traversal)
        const safePath = join(uploadDir, basename(filename));
        await writeFile(safePath, buffer);

        // Generate URL (use environment variable for production)
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const url = `${baseUrl}/uploads/${filename}`;

        // Log upload activity
        console.log(`[Upload] User ${currentUser.userId} uploaded file: ${filename} (${fileSize} bytes, ${mimeType})`);

        return NextResponse.json({
            success: true,
            url,
            filename,
            type: mimeType,
            size: fileSize
        });

    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return unauthorizedResponse();
        }

        console.error('Upload error:', error);
        // Return specific error for debugging
        const errorMessage = error instanceof Error ? error.message : 'Unknown upload error';
        return NextResponse.json(
            { success: false, error: `Upload failed: ${errorMessage}` },
            { status: 500 }
        );
    }
}
