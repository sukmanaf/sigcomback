import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
    const desaKode = request.nextUrl.searchParams.get('desaKode');

    if (!desaKode) {
        return NextResponse.json({ labels: [] });
    }

    try {
        // Query to get centroids and view_nop for all nops in the desa
        const result = await db.execute(sql`
            SELECT
                id,
                SUBSTRING(d_nop FROM 14 FOR 4) as view_nop,
                ST_Y(ST_Centroid(ST_Transform(geom, 4326))) as centroid_lat,
                ST_X(ST_Centroid(ST_Transform(geom, 4326))) as centroid_lng
            FROM nops
            WHERE SUBSTRING(d_nop, 1, 10) = ${desaKode}
            ORDER BY id
        `);

        return NextResponse.json({
            labels: result.rows,
            count: result.rows.length,
        }, {
            headers: {
                'Cache-Control': 'public, max-age=3600',
            },
        });
    } catch (error) {
        console.error('Error fetching labels:', error);
        return NextResponse.json({ labels: [], error: 'Failed to fetch labels' }, { status: 500 });
    }
}
