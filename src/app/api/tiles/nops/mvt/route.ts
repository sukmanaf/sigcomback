import { NextResponse } from 'next/server';

// This route is deprecated - use /api/tiles/nops/mvt/[z]/[x]/[y] instead
export async function GET() {
  return new NextResponse(
    JSON.stringify({
      error: 'Invalid route',
      message: 'Use /api/tiles/nops/mvt/[z]/[x]/[y] instead',
      example: '/api/tiles/nops/mvt/14/13322/8539?desaKode=3575020001',
    }),
    {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}
