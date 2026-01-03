import { NextResponse, NextRequest } from "next/server";
import { Pool } from "pg";

// Konfigurasi koneksi database dari .env
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

export async function GET(
  request: NextRequest,
  { params }: { params: { z: string; x: string; y: string } }
) {
  const { z, x, y } = params;
  const zoom = parseInt(z); // Zoom level
  const tileX = parseInt(x); // X coordinate
  const tileY = parseInt(y); // Y coordinate

  // Query PostGIS untuk menghasilkan MVT langsung, transformasi ke SRID 3857
  const query = `
    SELECT ST_AsMVT(q, 'desas', 4096, 'geom') as mvt
    FROM (
      SELECT id, d_kd_kec, d_nm_kec,
             ST_AsMVTGeom(
               ST_Transform(geom, 3857), -- Transformasi dari WGS84 ke Web Mercator
               ST_TileEnvelope($1, $2, $3),
               4096, 256, true
             ) as geom
      FROM kecamatans
      WHERE ST_Intersects(
        ST_Transform(geom, 3857), -- Transformasi dari WGS84 ke Web Mercator
        ST_TileEnvelope($1, $2, $3)
      )
    ) q
  `;
  const result = await pool.query(query, [zoom, tileX, tileY]);

  const mvt = result.rows[0].mvt;

  if (!mvt) {
    return new NextResponse(null, { status: 204 }); // No content
  }

  return new NextResponse(Buffer.from(mvt), {
    headers: {
      "Content-Type": "application/x-protobuf",
      "Access-Control-Allow-Origin": "*",
    },
  });
}