import { db } from '@/lib/db';
import { bloks } from '@/lib/schema';
import { sql } from 'drizzle-orm';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const desaKode = searchParams.get('desaKode');

    try {
        // Jika tidak ada desaKode, return empty
        if (!desaKode) {
            return Response.json({ type: 'FeatureCollection', features: [] });
        }

        // Query all bloks where d_blok starts with desa code
        const features = await db
            .select({
                id: bloks.id,
                d_blok: bloks.d_blok,
                geom: sql`ST_AsGeoJSON(${bloks.geom})`,
            })
            .from(bloks)
            .where(sql`${bloks.d_blok} LIKE ${desaKode + '%'}`);

        // Convert to GeoJSON
        const geojson = {
            type: 'FeatureCollection',
            features: features.map((f: any) => ({
                type: 'Feature',
                id: f.id,
                properties: {
                    id: f.id,
                    d_blok: f.d_blok,
                },
                geometry: JSON.parse(f.geom),
            })),
        };

        console.log(`[Bloks API] desaKode=${desaKode}, found ${features.length} bloks`);

        return Response.json(geojson, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
            },
        });
    } catch (error) {
        console.error('Bloks error:', error);
        return Response.json(
            { type: 'FeatureCollection', features: [] },
            { status: 500 }
        );
    }
}
