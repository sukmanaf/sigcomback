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
  const idString = request.nextUrl.searchParams.get("id"); // Ambil id sebagai string

  // Validasi id jika ada
  let id: number | undefined;
  if (idString !== null) {
    id = parseInt(idString, 10);
    if (isNaN(id) || id.toString().length !== 10) {
      return new NextResponse(
        JSON.stringify({ error: "ID must be a 10-digit integer" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*", // Tambahkan CORS di error
          },
        }
      );
    }
  }

  // Query PostGIS untuk menghasilkan MVT, dengan atau tanpa filter id
  const query = `
    SELECT ST_AsMVT(q, 'bangunans', 4096, 'geom') as mvt
    FROM (
      SELECT id, d_nop,  SUBSTRING(d_nop FROM 14 FOR 4) as view_nop,ST_AsText(geom) as polygon,
             ST_AsMVTGeom(
               ST_Transform(geom, 3857), -- Transformasi dari WGS84 ke Web Mercator
               ST_TileEnvelope($1, $2, $3),
               4096, 256, true
             ) as geom
      FROM bangunans
      WHERE ST_Intersects(
        ST_Transform(geom, 3857), -- Transformasi dari WGS84 ke Web Mercator
        ST_TileEnvelope($1, $2, $3)
      )
      ${id !== undefined ? "AND left(d_nop,10) = $4" : ""} 
    ) q
  `;

  const paramsArray = [zoom, tileX, tileY];
  if (id !== undefined) paramsArray.push(id); // Tambahkan id ke parameter jika ada

  const result = await pool.query(query, paramsArray);

  const mvt = result.rows[0].mvt;

  if (!mvt) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*", // CORS untuk no content
      },
    });
  }

  return new NextResponse(Buffer.from(mvt), {
    headers: {
      "Content-Type": "application/x-protobuf",
      "Access-Control-Allow-Origin": "*",
    },
  });
}