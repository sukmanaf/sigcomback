import { db } from '@/lib/db';
import { desas } from '@/lib/schema';
import { sql, like, eq } from 'drizzle-orm';
import { gzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const kecamatan = searchParams.get('kecamatan');
    const desa = searchParams.get('desa');

    // Build query with optional filters
    let whereCondition;
    if (desa) {
      // Filter by exact desa code
      whereCondition = eq(desas.d_kd_kel, desa);
    } else if (kecamatan) {
      // Filter by kecamatan code (desa code starts with kecamatan code)
      whereCondition = like(desas.d_kd_kel, `${kecamatan}%`);
    }

    // Get desas with simplified geometry
    const query = db
      .select({
        id: desas.id,
        d_kd_kel: desas.d_kd_kel,
        d_nm_kel: desas.d_nm_kel,
        geom: sql`ST_AsGeoJSON(ST_SimplifyPreserveTopology(${desas.geom}, 0.0001))`,
      })
      .from(desas);

    const features = whereCondition
      ? await query.where(whereCondition)
      : await query;

    // Convert to GeoJSON
    const geojson = {
      type: 'FeatureCollection',
      features: features.map((f: any) => ({
        type: 'Feature',
        id: f.id,
        properties: {
          d_kd_kel: f.d_kd_kel,
          d_nm_kel: f.d_nm_kel,
        },
        geometry: JSON.parse(f.geom),
      })),
    };

    // Compress response
    const jsonString = JSON.stringify(geojson);
    const compressed = await gzipAsync(jsonString);

    return new Response(compressed, {
      headers: {
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        'Content-Type': 'application/json',
        'Content-Encoding': 'gzip',
      },
    });
  } catch (error) {
    console.error('Error fetching all desas:', error);
    const emptyGeoJson = { type: 'FeatureCollection', features: [] };
    const compressed = await gzipAsync(JSON.stringify(emptyGeoJson));

    return new Response(compressed, {
      headers: {
        'Cache-Control': 'public, max-age=60',
        'Content-Type': 'application/json',
        'Content-Encoding': 'gzip',
      },
    });
  }
}
