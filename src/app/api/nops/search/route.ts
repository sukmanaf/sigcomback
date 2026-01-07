import { db } from '@/lib/db';
import { nops } from '@/lib/schema';
import { sql, eq, like } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const nop = searchParams.get('nop');

        if (!nop) {
            return NextResponse.json(
                { success: false, message: 'NOP parameter is required' },
                { status: 400 }
            );
        }

        // Clean NOP - remove dots and dashes
        const cleanNop = nop.replace(/[.\-]/g, '');

        // Search for NOP in database
        const result = await db
            .select({
                d_nop: nops.d_nop,
            })
            .from(nops)
            .where(eq(nops.d_nop, cleanNop))
            .limit(1);

        if (result.length === 0) {
            return NextResponse.json({
                success: false,
                message: 'NOP tidak ditemukan'
            });
        }

        const nopData = result[0];

        // Extract desa code from NOP (first 10 digits)
        // NOP format: XX XX XXX XXX XXX XXXX X
        // Positions:   0-1 2-3 4-6 7-9 10-12 13-16 17
        // First 10 digits = kode kelurahan (desa)
        const desaKode = cleanNop.substring(0, 10);

        return NextResponse.json({
            success: true,
            data: {
                d_nop: nopData.d_nop,
                d_kd_kel: desaKode
            }
        });

    } catch (error: any) {
        console.error('Error searching NOP:', error);
        return NextResponse.json(
            { success: false, message: error.message || 'Failed to search NOP' },
            { status: 500 }
        );
    }
}
