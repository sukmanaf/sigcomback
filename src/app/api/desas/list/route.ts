import { db } from '@/lib/db';
import { desas } from '@/lib/schema';
import { NextResponse } from 'next/server';
import { like } from 'drizzle-orm';

// GET - Fetch desas list for dropdown (optionally filtered by kecamatan)
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const kecamatan = searchParams.get('kecamatan');

        // Filter by kecamatan code if provided
        // Desa code format: 35.75.XXX.YYY where XXX is kecamatan code
        let result;
        if (kecamatan) {
            result = await db
                .select({
                    d_kd_kel: desas.d_kd_kel,
                    d_nm_kel: desas.d_nm_kel,
                })
                .from(desas)
                .where(like(desas.d_kd_kel, `${kecamatan}%`))
                .orderBy(desas.d_nm_kel);
        } else {
            result = await db
                .select({
                    d_kd_kel: desas.d_kd_kel,
                    d_nm_kel: desas.d_nm_kel,
                })
                .from(desas)
                .orderBy(desas.d_nm_kel);
        }

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error('Error fetching desas list:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to fetch desas list' },
            { status: 500 }
        );
    }
}
