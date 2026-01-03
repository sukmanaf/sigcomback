import { db } from '@/lib/db';
import { bloks } from '@/lib/schema';
import { sql, eq } from 'drizzle-orm';

export async function PUT(request: Request) {
    try {
        const body = await request.json();

        const { id, d_blok, coordinates } = body;

        console.log('[Blok Update] Received:', { id, d_blok, coordinatesLength: coordinates?.length });

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

        console.log('[Blok Update] Using numericId:', numericId);

        // Create WKT polygon from coordinates
        const wktPoints = coordinates.map((c: number[]) => `${c[0]} ${c[1]}`).join(', ');
        const wkt = `POLYGON((${wktPoints}))`;

        // Build update object
        const updateData: any = {
            geom: sql`ST_GeomFromText(${wkt}, 4326)`,
            updated_at: new Date(),
        };

        // If d_blok is provided, update it too
        if (d_blok) {
            updateData.d_blok = d_blok;
        }

        // Update geometry in database
        const result = await db
            .update(bloks)
            .set(updateData)
            .where(eq(bloks.id, numericId))
            .returning({ id: bloks.id });

        console.log('[Blok Update] Result:', result);

        if (result.length === 0) {
            return Response.json(
                { success: false, message: 'Blok not found' },
                { status: 404 }
            );
        }

        return Response.json({
            success: true,
            message: 'Blok updated successfully',
        });

    } catch (error: any) {
        console.error('Error updating Blok:', error);
        return Response.json(
            { success: false, message: error.message || 'Failed to update Blok' },
            { status: 500 }
        );
    }
}
