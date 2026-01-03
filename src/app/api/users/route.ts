import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, UserRole } from '@/lib/schema';
import { getSession, hashPassword, canUserManage } from '@/lib/auth';
import { eq, sql } from 'drizzle-orm';

// GET - List users with pagination (admin only)
export async function GET(request: NextRequest) {
    try {
        const session = await getSession();

        if (!session) {
            return NextResponse.json(
                { success: false, message: 'Tidak terautentikasi' },
                { status: 401 }
            );
        }

        if (!canUserManage(session.role)) {
            return NextResponse.json(
                { success: false, message: 'Tidak memiliki akses' },
                { status: 403 }
            );
        }

        // Get pagination parameters
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '10', 10);
        const offset = (page - 1) * limit;

        // Get total count
        const [countResult] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(users);
        const total = countResult?.count || 0;

        // Get paginated users
        const paginatedUsers = await db
            .select({
                id: users.id,
                username: users.username,
                name: users.name,
                role: users.role,
                kode_wilayah: users.kode_wilayah,
                created_at: users.created_at,
            })
            .from(users)
            .orderBy(users.id)
            .limit(limit)
            .offset(offset);

        return NextResponse.json({
            success: true,
            data: paginatedUsers,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error: any) {
        console.error('Get users error:', error);
        return NextResponse.json(
            { success: false, message: 'Terjadi kesalahan' },
            { status: 500 }
        );
    }
}

// POST - Create new user (admin only)
export async function POST(request: NextRequest) {
    try {
        const session = await getSession();

        if (!session) {
            return NextResponse.json(
                { success: false, message: 'Tidak terautentikasi' },
                { status: 401 }
            );
        }

        if (!canUserManage(session.role)) {
            return NextResponse.json(
                { success: false, message: 'Tidak memiliki akses' },
                { status: 403 }
            );
        }

        const { username, password, name, role, kode_wilayah } = await request.json();

        // Validate required fields
        if (!username || !password || !name || !role) {
            return NextResponse.json(
                { success: false, message: 'Semua field harus diisi' },
                { status: 400 }
            );
        }

        // Validate role
        const validRoles: UserRole[] = ['admin', 'bapenda', 'bpn', 'kecamatan', 'desa'];
        if (!validRoles.includes(role)) {
            return NextResponse.json(
                { success: false, message: 'Role tidak valid' },
                { status: 400 }
            );
        }

        // Check if username already exists
        const [existing] = await db
            .select()
            .from(users)
            .where(eq(users.username, username))
            .limit(1);

        if (existing) {
            return NextResponse.json(
                { success: false, message: 'Username sudah digunakan' },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Create user
        const [newUser] = await db
            .insert(users)
            .values({
                username,
                password: hashedPassword,
                name,
                role,
                kode_wilayah: kode_wilayah || null,
            })
            .returning({
                id: users.id,
                username: users.username,
                name: users.name,
                role: users.role,
                kode_wilayah: users.kode_wilayah,
            });

        return NextResponse.json({
            success: true,
            message: 'User berhasil dibuat',
            data: newUser,
        });
    } catch (error: any) {
        console.error('Create user error:', error);
        return NextResponse.json(
            { success: false, message: 'Terjadi kesalahan' },
            { status: 500 }
        );
    }
}
