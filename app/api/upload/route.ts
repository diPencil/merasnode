import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join, basename } from 'path';
import { requireAuth, unauthorizedResponse } from '@/lib/api-auth';
import {
    validateFileUpload,
    sanitizeFilename,
    MAX_FILE_SIZE,
    ALLOWED_IMAGE_TYPES,
    ALLOWED_DOCUMENT_TYPES,
    ALLOWED_VIDEO_TYPES,
    ALLOWED_AUDIO_TYPES
} from '@/lib/validations';

// All allowed file types
const ALLOWED_FILE_TYPES = [
    ...ALLOWED_IMAGE_TYPES,
    ...ALLOWED_DOCUMENT_TYPES,
    ...ALLOWED_VIDEO_TYPES,
    ...ALLOWED_AUDIO_TYPES
];

export async function POST(request: NextRequest) {
    try {
        // Require authentication
        const currentUser = await requireAuth(request);

        const data = await request.formData();
        const file: File | null = data.get('file') as unknown as File;

        if (!file) {
            return NextResponse.json(
                { success: false, error: 'No file provided' },
                { status: 400 }
            );
        }

        // Validate file size and type
        const validation = validateFileUpload(file, ALLOWED_FILE_TYPES, MAX_FILE_SIZE);
        if (!validation.valid) {
            return NextResponse.json(
                { success: false, error: validation.error },
                { status: 400 }
            );
        }

        // Read file data
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create secure filename
        const timestamp = Date.now();
        const randomSuffix = Math.round(Math.random() * 1E9);
        const sanitized = sanitizeFilename(file.name);
        const extension = sanitized.split('.').pop();
        const filename = `${timestamp}-${randomSuffix}.${extension}`;

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
        console.log(`[Upload] User ${currentUser.userId} uploaded file: ${filename} (${file.size} bytes, ${file.type})`);

        return NextResponse.json({
            success: true,
            url,
            filename,
            type: file.type,
            size: file.size
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
