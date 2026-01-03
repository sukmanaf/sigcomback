import { NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/auth';

export async function POST() {
    try {
        await clearAuthCookie();

        return NextResponse.json({
            success: true,
            message: 'Logout berhasil',
        });
    } catch (error: any) {
        console.error('Logout error:', error);
        return NextResponse.json(
            { success: false, message: 'Terjadi kesalahan saat logout' },
            { status: 500 }
        );
    }
}
