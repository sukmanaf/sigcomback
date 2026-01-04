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

    // Try using view first, fallback to direct table query if view doesn't exist
    let result;
    try {
      // Query using nops_mvt view (pre-transformed geometry)
      result = desaKode
        ? await db.execute(sql`
            SELECT ST_AsMVT(q, 'nops', 4096, 'geom') as mvt
            FROM (
              SELECT 
                id, 
                d_nop, 
                d_luas, 
                view_nop,
                ST_AsMVTGeom(
                  CASE WHEN ${simplifyTolerance} > 0 
                    THEN ST_SimplifyPreserveTopology(geom_3857, ${simplifyTolerance})
                    ELSE geom_3857
                  END,
                  ST_TileEnvelope(${zoom}, ${tileX}, ${tileY}),
                  4096, 64, true
                ) as geom
              FROM nops_mvt
              WHERE geom_3857 && ST_TileEnvelope(${zoom}, ${tileX}, ${tileY})
              AND desa_kode = ${desaKode}
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
                view_nop,
                ST_AsMVTGeom(
                  CASE WHEN ${simplifyTolerance} > 0 
                    THEN ST_SimplifyPreserveTopology(geom_3857, ${simplifyTolerance})
                    ELSE geom_3857
                  END,
                  ST_TileEnvelope(${zoom}, ${tileX}, ${tileY}),
                  4096, 64, true
                ) as geom
              FROM nops_mvt
              WHERE geom_3857 && ST_TileEnvelope(${zoom}, ${tileX}, ${tileY})
            ) q
            WHERE geom IS NOT NULL
          `);
    } catch (viewError: any) {
      // Fallback to direct nops table query
      console.warn('View query failed, falling back to direct table:', viewError.message);
      result = desaKode
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
    }

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
        // Cache tiles for 7 days (604800s) - polygon data rarely changes
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400',
      },
    });
  } catch (error: any) {
    console.error('MVT Error:', error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

