import { db } from '@/lib/db';
import { bangunans } from '@/lib/schema';
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
            .delete(bangunans)
            .where(eq(bangunans.id, parseInt(id)))
            .returning({ id: bangunans.id });

        if (result.length === 0) {
            return Response.json(
                { success: false, message: 'Bangunan not found' },
                { status: 404 }
            );
        }

        return Response.json({
            success: true,
            message: 'Bangunan deleted successfully',
        });

    } catch (error: any) {
        console.error('Error deleting Bangunan:', error);
        return Response.json(
            { success: false, message: error.message || 'Failed to delete Bangunan' },
            { status: 500 }
        );
    }
}
