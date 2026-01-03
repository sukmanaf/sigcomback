import { db } from '@/lib/db';
import { nops } from '@/lib/schema';
import { sql, eq } from 'drizzle-orm';
import { readdir } from 'fs/promises';
import path from 'path';

interface RouteParams {
    params: Promise<{ nop: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { nop } = await params;

        if (!nop) {
            return Response.json(
                { success: false, message: 'NOP is required' },
                { status: 400 }
            );
        }

        // Fetch NOP data with geometry as GeoJSON
        const result = await db
            .select({
                id: nops.id,
                d_nop: nops.d_nop,
                d_luas: nops.d_luas,
                geojson: sql<string>`ST_AsGeoJSON(geom)`,
            })
            .from(nops)
            .where(eq(nops.d_nop, nop))
            .limit(1);

        if (result.length === 0) {
            return Response.json(
                { success: false, message: 'NOP not found' },
                { status: 404 }
            );
        }

        const nopData = result[0];
        const geometry = JSON.parse(nopData.geojson);

        // Get existing images
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'nop', nop);
        let images: string[] = [];

        try {
            const files = await readdir(uploadDir);
            images = files
                .filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
                .map(f => `/uploads/nop/${nop}/${f}`);
        } catch {
            // Directory doesn't exist or is empty
        }

        // Return as GeoJSON Feature
        return Response.json({
            success: true,
            data: {
                type: 'Feature',
                properties: {
                    id: nopData.id,
                    d_nop: nopData.d_nop,
                    d_luas: nopData.d_luas,
                    images,
                },
                geometry,
            },
        });

    } catch (error: any) {
        console.error('Error fetching NOP:', error);
        return Response.json(
            { success: false, message: error.message || 'Failed to fetch NOP' },
            { status: 500 }
        );
    }
}
