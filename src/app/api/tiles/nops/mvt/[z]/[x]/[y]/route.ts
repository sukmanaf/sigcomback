import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ z: string; x: string; y: string }> }
) {
  try {
    const { z, x, y } = await context.params;
    const zoom = parseInt(z);
    const tileX = parseInt(x);
    const tileY = parseInt(y);
    const desaKode = request.nextUrl.searchParams.get('desaKode');

    // Calculate simplification tolerance based on zoom
    // Higher zoom = less simplification (more detail)
    const tolerance = zoom >= 18 ? 0 : Math.pow(2, 18 - zoom) * 0.00001;
    const simplifyTolerance = tolerance > 0 ? tolerance * 111320 : 0;

    // Build query using Drizzle sql template
    const result = desaKode
      ? await db.execute(sql`
          SELECT ST_AsMVT(q, 'nops', 4096, 'geom') as mvt
          FROM (
            SELECT 
              id, 
              d_nop, 
              d_luas, 
              SUBSTRING(d_nop FROM 14 FOR 4) as view_nop,
              ST_AsMVTGeom(
                ST_SimplifyPreserveTopology(ST_Transform(geom, 3857), ${simplifyTolerance}),
                ST_TileEnvelope(${zoom}, ${tileX}, ${tileY}),
                4096, 64, true
              ) as geom
            FROM nops
            WHERE ST_Intersects(
              ST_Transform(geom, 3857),
              ST_TileEnvelope(${zoom}, ${tileX}, ${tileY})
            )
            AND left(d_nop, 10) = ${desaKode}
          ) q
          WHERE geom IS NOT NULL
        `)
      : await db.execute(sql`
          SELECT ST_AsMVT(q, 'nops', 4096, 'geom') as mvt
          FROM (
            SELECT 
              id, 
              d_nop, 
              d_luas, 
              SUBSTRING(d_nop FROM 14 FOR 4) as view_nop,
              ST_AsMVTGeom(
                ST_SimplifyPreserveTopology(ST_Transform(geom, 3857), ${simplifyTolerance}),
                ST_TileEnvelope(${zoom}, ${tileX}, ${tileY}),
                4096, 64, true
              ) as geom
            FROM nops
            WHERE ST_Intersects(
              ST_Transform(geom, 3857),
              ST_TileEnvelope(${zoom}, ${tileX}, ${tileY})
            )
          ) q
          WHERE geom IS NOT NULL
        `);

    const mvt = result.rows[0]?.mvt as Buffer | null;

    if (!mvt || mvt.length === 0) {
      return new NextResponse(null, {
        status: 204,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    return new NextResponse(Buffer.from(mvt), {
      headers: {
        'Content-Type': 'application/x-protobuf',
        'Access-Control-Allow-Origin': '*',
        // Cache tiles for 1 hour to speed up repeated loads
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=300',
      },
    });
  } catch (error: any) {
    console.error('MVT Error:', error.message);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
