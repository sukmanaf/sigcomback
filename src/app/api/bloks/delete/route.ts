import { db } from '@/lib/db';
import { bloks } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function DELETE(request: Request) {
    try {
        const { id } = await request.json();

        if (!id) {
            return Response.json(
                { success: false, message: 'ID is required' },
                { status: 400 }
            );
        }

        // Delete from database
        const result = await db
            .delete(bloks)
            .where(eq(bloks.id, parseInt(id)))
            .returning({ id: bloks.id });

        if (result.length === 0) {
            return Response.json(
                { success: false, message: 'Blok not found' },
                { status: 404 }
            );
        }

        return Response.json({
            success: true,
            message: 'Blok deleted successfully',
        });

    } catch (error: any) {
        console.error('Error deleting Blok:', error);
        return Response.json(
            { success: false, message: error.message || 'Failed to delete Blok' },
            { status: 500 }
        );
    }
}
