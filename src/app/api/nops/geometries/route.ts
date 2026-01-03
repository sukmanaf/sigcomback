import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
    try {
        const { nops: nopList } = await request.json();

        if (!nopList || !Array.isArray(nopList) || nopList.length === 0) {
            return NextResponse.json(
                { success: false, message: 'NOP list is required' },
                { status: 400 }
            );
        }

        // Query nops table for geometries - use proper array syntax
        const results = await db.execute(sql`
            SELECT 
                id,
                d_nop,
                d_luas,
                ST_AsGeoJSON(ST_Transform(geom, 4326))::json as geometry
            FROM nops
            WHERE d_nop = ANY(${sql.raw(`ARRAY['${nopList.join("','")}']`)})
        `);

        // Convert to GeoJSON features
        const features = results.rows.map((row: any) => ({
            type: 'Feature',
            properties: {
                id: row.id,
                d_nop: row.d_nop,
                d_luas: row.d_luas,
            },
            geometry: row.geometry,
        }));

        return NextResponse.json({
            success: true,
            data: features,
        });

    } catch (error: any) {
        console.error('Error fetching NOP geometries:', error);
        return NextResponse.json(
            { success: false, message: error.message || 'Failed to fetch geometries' },
            { status: 500 }
        );
    }
}
