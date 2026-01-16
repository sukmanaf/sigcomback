import { NextRequest, NextResponse } from 'next/server';
import { getSession, canUserManage } from '@/lib/auth';
import { writeFile, mkdir, readdir, unlink } from 'fs/promises';
import path from 'path';

// POST - Upload logo (admin only)
export async function POST(request: NextRequest) {
    try {
        const session = await getSession();

        if (!session) {
            return NextResponse.json(
                { success: false, message: 'Tidak terautentikasi' },
                { status: 401 }
            );
        }

        if (!canUserManage(session.role)) {
            return NextResponse.json(
                { success: false, message: 'Tidak memiliki akses' },
                { status: 403 }
            );
        }

        const formData = await request.formData();
        const file = formData.get('logo') as File;

        if (!file || file.size === 0) {
            return NextResponse.json(
                { success: false, message: 'File logo harus diupload' },
                { status: 400 }
            );
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { success: false, message: 'Format file tidak didukung. Gunakan JPG, PNG, GIF, WEBP, atau SVG.' },
                { status: 400 }
            );
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            return NextResponse.json(
                { success: false, message: 'Ukuran file maksimal 5MB' },
                { status: 400 }
            );
        }

        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'logo');

        // Create directory if not exists
        await mkdir(uploadDir, { recursive: true });

        // Delete old logo files
        try {
            const existingFiles = await readdir(uploadDir);
            for (const oldFile of existingFiles) {
                await unlink(path.join(uploadDir, oldFile));
            }
        } catch {
            // Directory doesn't exist or empty, ignore
        }

        // Save new logo
        const ext = path.extname(file.name) || '.png';
        const filename = `app_logo_${Date.now()}${ext}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(path.join(uploadDir, filename), buffer);

        const logoPath = `/uploads/logo/${filename}`;

        return NextResponse.json({
            success: true,
            message: 'Logo berhasil diupload',
            data: { path: logoPath },
        });
    } catch (error: any) {
        console.error('Upload logo error:', error);
        return NextResponse.json(
            { success: false, message: 'Terjadi kesalahan' },
            { status: 500 }
        );
    }
}

// DELETE - Remove logo (admin only)
export async function DELETE() {
    try {
        const session = await getSession();

        if (!session) {
            return NextResponse.json(
                { success: false, message: 'Tidak terautentikasi' },
                { status: 401 }
            );
        }

        if (!canUserManage(session.role)) {
            return NextResponse.json(
                { success: false, message: 'Tidak memiliki akses' },
                { status: 403 }
            );
        }

        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'logo');

        // Delete all logo files
        try {
            const existingFiles = await readdir(uploadDir);
            for (const oldFile of existingFiles) {
                await unlink(path.join(uploadDir, oldFile));
            }
        } catch {
            // Directory doesn't exist, ignore
        }

        return NextResponse.json({
            success: true,
            message: 'Logo berhasil dihapus',
        });
    } catch (error: any) {
        console.error('Delete logo error:', error);
        return NextResponse.json(
            { success: false, message: 'Terjadi kesalahan' },
            { status: 500 }
        );
    }
}
