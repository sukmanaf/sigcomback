import { db } from '@/lib/db';
import { nops } from '@/lib/schema';
import { sql } from 'drizzle-orm';
import { gzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const z = parseInt(searchParams.get('z') || '0');
  const x = parseInt(searchParams.get('x') || '0');
  const y = parseInt(searchParams.get('y') || '0');
  const desaKode = searchParams.get('desaKode');

  try {
    // Jika tidak ada desaKode, return empty
    if (!desaKode) {
      return Response.json({ type: 'FeatureCollection', features: [] });
    }

    // Convert tile coordinates to bounding box
    const n = Math.pow(2, z);
    const lonMin = (x / n) * 360 - 180;
    const lonMax = ((x + 1) / n) * 360 - 180;
    const latMax = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * (180 / Math.PI);
    const latMin = Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n))) * (180 / Math.PI);

    const bbox = `POLYGON((${lonMin} ${latMin}, ${lonMax} ${latMin}, ${lonMax} ${latMax}, ${lonMin} ${latMax}, ${lonMin} ${latMin}))`;

    // Simplify geometry based on zoom level for performance
    const tolerance = Math.pow(2, 20 - z) / 111320; // Convert to degrees
    
    // Query features within tile bounds and matching desa code (first 10 digits)
    const features = await db
      .select({
        id: nops.id,
        d_nop: nops.d_nop,
        d_luas: nops.d_luas,
        geom: sql`ST_AsGeoJSON(ST_SimplifyPreserveTopology(${nops.geom}, ${tolerance}))`,
      })
      .from(nops)
      .where(
        sql`ST_Intersects(ST_SetSRID(${nops.geom}, 4326), ST_GeomFromText(${bbox}, 4326)) 
            AND SUBSTRING(${nops.d_nop}, 1, 10) = ${desaKode}`
      )
      .limit(500);

    // Convert to GeoJSON
    const geojson = {
      type: 'FeatureCollection',
      features: features.map((f: any) => ({
        type: 'Feature',
        id: f.id,
        properties: {
          d_nop: f.d_nop,
          d_luas: f.d_luas,
        },
        geometry: JSON.parse(f.geom),
      })),
    };

    const jsonString = JSON.stringify(geojson);
    const compressed = await gzipAsync(jsonString);

    return new Response(compressed, {
      headers: {
        'Cache-Control': 'public, max-age=3600',
        'Content-Type': 'application/json',
        'Content-Encoding': 'gzip',
      },
    });
  } catch (error) {
    console.error('Tile error:', error);
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
