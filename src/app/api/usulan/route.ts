import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { usulan, users, UsulanStatus } from '@/lib/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth';

// GET /api/usulan - List usulan (filtered by role)
export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('auth_token')?.value;
        if (!token) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifyToken(token);
        if (!payload) {
            return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const nop = searchParams.get('nop');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const offset = (page - 1) * limit;
        const status = searchParams.get('status');

        // Build base query with user join for user info
        let baseQuery = db
            .select({
                id: usulan.id,
                nop: usulan.nop,
                user_id: usulan.user_id,
                jenis_usulan: usulan.jenis_usulan,
                keterangan: usulan.keterangan,
                status: usulan.status,
                catatan_bapenda: usulan.catatan_bapenda,
                created_at: usulan.created_at,
                updated_at: usulan.updated_at,
                user_name: users.name,
                user_role: users.role,
                kode_wilayah: users.kode_wilayah,
            })
            .from(usulan)
            .leftJoin(users, eq(usulan.user_id, users.id));

        // Build conditions based on role and filters
        const conditions: any[] = [];

        // Role-based filtering
        if (payload.role === 'desa' || payload.role === 'kecamatan') {
            // Desa/kecamatan can only see their own usulan
            conditions.push(eq(usulan.user_id, payload.userId));
        }
        // Admin, bapenda can see all

        // Filter by NOP if provided
        if (nop) {
            conditions.push(eq(usulan.nop, nop));
        }

        // Filter by status if provided
        if (status) {
            conditions.push(eq(usulan.status, status as UsulanStatus));
        }

        // Apply conditions
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // Get total count
        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(usulan)
            .where(whereClause);
        const total = Number(countResult[0]?.count || 0);

        // Get paginated data
        const data = await baseQuery
            .where(whereClause)
            .orderBy(desc(usulan.created_at))
            .limit(limit)
            .offset(offset);

        return NextResponse.json({
            success: true,
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error: any) {
        console.error('Error fetching usulan:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

// POST /api/usulan - Create new usulan (desa/kecamatan only)
export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('auth_token')?.value;
        if (!token) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifyToken(token);
        if (!payload) {
            return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
        }

        // Only desa and kecamatan can submit usulan
        if (payload.role !== 'desa' && payload.role !== 'kecamatan') {
            return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { nop, jenis_usulan, keterangan } = body;

        if (!nop || !jenis_usulan || !keterangan) {
            return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
        }

        // Insert new usulan
        const result = await db.insert(usulan).values({
            nop,
            user_id: payload.userId,
            jenis_usulan,
            keterangan,
            status: 'pending',
        }).returning();

        return NextResponse.json({
            success: true,
            data: result[0],
            message: 'Usulan berhasil diajukan',
        });
    } catch (error: any) {
        console.error('Error creating usulan:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
