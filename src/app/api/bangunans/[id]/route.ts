import { db } from '@/lib/db';
import { bangunans } from '@/lib/schema';
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

        // Fetch bangunan data with geometry as GeoJSON
        const result = await db
            .select({
                id: bangunans.id,
                d_nop: bangunans.d_nop,
                geojson: sql<string>`ST_AsGeoJSON(geom)`,
            })
            .from(bangunans)
            .where(eq(bangunans.id, parseInt(id)))
            .limit(1);

        if (result.length === 0) {
            return Response.json(
                { success: false, message: 'Bangunan not found' },
                { status: 404 }
            );
        }

        const bangunanData = result[0];
        const geometry = JSON.parse(bangunanData.geojson);

        // Return as GeoJSON Feature
        return Response.json({
            success: true,
            data: {
                type: 'Feature',
                properties: {
                    id: bangunanData.id,
                    d_nop: bangunanData.d_nop,
                },
                geometry,
            },
        });

    } catch (error: any) {
        console.error('Error fetching Bangunan:', error);
        return Response.json(
            { success: false, message: error.message || 'Failed to fetch Bangunan' },
            { status: 500 }
        );
    }
}
