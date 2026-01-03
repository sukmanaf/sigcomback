import { db } from '@/lib/db';
import { bangunans } from '@/lib/schema';
import { sql, eq } from 'drizzle-orm';

export async function PUT(request: Request) {
    try {
        const body = await request.json();

        const { id, d_nop, coordinates } = body;

        console.log('[Bangunan Update] Received:', { id, d_nop, coordinatesLength: coordinates?.length });

        if (!id || !coordinates) {
            return Response.json(
                { success: false, message: 'ID and coordinates are required' },
                { status: 400 }
            );
        }

        // Ensure id is a valid number
        const numericId = typeof id === 'number' ? id : parseInt(String(id), 10);

        if (isNaN(numericId)) {
            return Response.json(
                { success: false, message: 'Invalid ID format' },
                { status: 400 }
            );
        }

        console.log('[Bangunan Update] Using numericId:', numericId);

        // Create WKT polygon from coordinates
        const wktPoints = coordinates.map((c: number[]) => `${c[0]} ${c[1]}`).join(', ');
        const wkt = `POLYGON((${wktPoints}))`;

        // Build update object
        const updateData: any = {
            geom: sql`ST_GeomFromText(${wkt}, 4326)`,
            updated_at: new Date(),
        };

        // If d_nop is provided, update it too
        if (d_nop) {
            updateData.d_nop = d_nop;
        }

        // Update geometry in database
        const result = await db
            .update(bangunans)
            .set(updateData)
            .where(eq(bangunans.id, numericId))
            .returning({ id: bangunans.id });

        console.log('[Bangunan Update] Result:', result);

        if (result.length === 0) {
            return Response.json(
                { success: false, message: 'Bangunan not found' },
                { status: 404 }
            );
        }

        return Response.json({
            success: true,
            message: 'Bangunan updated successfully',
        });

    } catch (error: any) {
        console.error('Error updating Bangunan:', error);
        return Response.json(
            { success: false, message: error.message || 'Failed to update Bangunan' },
            { status: 500 }
        );
    }
}
