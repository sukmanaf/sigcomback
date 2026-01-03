import { db } from '@/lib/db';
import { kecamatans } from '@/lib/schema';
import { NextResponse } from 'next/server';

// GET - Fetch all kecamatans
export async function GET() {
    try {
        const result = await db
            .select({
                d_kd_kec: kecamatans.d_kd_kec,
                d_nm_kec: kecamatans.d_nm_kec,
            })
            .from(kecamatans)
            .orderBy(kecamatans.d_nm_kec);

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error('Error fetching kecamatans:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to fetch kecamatans' },
            { status: 500 }
        );
    }
}
