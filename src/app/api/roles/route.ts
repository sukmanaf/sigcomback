import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { roles } from '@/lib/schema';

// GET - List all roles
export async function GET() {
    try {
        const allRoles = await db
            .select({
                id: roles.id,
                code: roles.code,
                name: roles.name,
            })
            .from(roles)
            .orderBy(roles.id);

        return NextResponse.json({
            success: true,
            data: allRoles,
        });
    } catch (error: any) {
        console.error('Get roles error:', error);
        return NextResponse.json(
            { success: false, message: 'Terjadi kesalahan' },
            { status: 500 }
        );
    }
}
