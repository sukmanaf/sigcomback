import { db } from '@/lib/db';
import { bloks } from '@/lib/schema';
import { sql, eq } from 'drizzle-orm';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;

        if (!id) {
            return Response.json(
                { success: false, message: 'ID is required' },
                { status: 400 }
            );
        }

        // Fetch blok data with geometry as GeoJSON
        const result = await db
            .select({
                id: bloks.id,
                d_blok: bloks.d_blok,
                geojson: sql<string>`ST_AsGeoJSON(geom)`,
            })
            .from(bloks)
            .where(eq(bloks.id, parseInt(id)))
            .limit(1);

        if (result.length === 0) {
            return Response.json(
                { success: false, message: 'Blok not found' },
                { status: 404 }
            );
        }

        const blokData = result[0];
        const geometry = JSON.parse(blokData.geojson);

        // Return as GeoJSON Feature
        return Response.json({
            success: true,
            data: {
                type: 'Feature',
                properties: {
                    id: blokData.id,
                    d_blok: blokData.d_blok,
                },
                geometry,
            },
        });

    } catch (error: any) {
        console.error('Error fetching Blok:', error);
        return Response.json(
            { success: false, message: error.message || 'Failed to fetch Blok' },
            { status: 500 }
        );
    }
}
