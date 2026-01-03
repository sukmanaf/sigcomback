import { db } from '@/lib/db';
import { nops } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { rm } from 'fs/promises';
import path from 'path';

export async function DELETE(request: Request) {
    try {
        const { nop } = await request.json();

        if (!nop) {
            return Response.json(
                { success: false, message: 'NOP is required' },
                { status: 400 }
            );
        }

        // Delete from database
        const result = await db
            .delete(nops)
            .where(eq(nops.d_nop, nop))
            .returning({ id: nops.id });

        if (result.length === 0) {
            return Response.json(
                { success: false, message: 'NOP not found' },
                { status: 404 }
            );
        }

        // Delete uploaded images folder
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'nop', nop);
        try {
            await rm(uploadDir, { recursive: true, force: true });
        } catch {
            // Folder doesn't exist, ignore
        }

        return Response.json({
            success: true,
            message: 'NOP deleted successfully',
        });

    } catch (error: any) {
        console.error('Error deleting NOP:', error);
        return Response.json(
            { success: false, message: error.message || 'Failed to delete NOP' },
            { status: 500 }
        );
    }
}
