import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, UserRole } from '@/lib/schema';
import { getSession, hashPassword, canUserManage } from '@/lib/auth';
import { eq } from 'drizzle-orm';

// GET - Get user by ID
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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

        const { id } = await params;
        const userId = parseInt(id);

        const [user] = await db
            .select({
                id: users.id,
                username: users.username,
                name: users.name,
                role: users.role,
                kode_wilayah: users.kode_wilayah,
                created_at: users.created_at,
            })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        if (!user) {
            return NextResponse.json(
                { success: false, message: 'User tidak ditemukan' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: user,
        });
    } catch (error: any) {
        console.error('Get user error:', error);
        return NextResponse.json(
            { success: false, message: 'Terjadi kesalahan' },
            { status: 500 }
        );
    }
}

// PUT - Update user
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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

        const { id } = await params;
        const userId = parseInt(id);
        const { username, password, name, role, kode_wilayah } = await request.json();

        // Check if user exists
        const [existing] = await db
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        if (!existing) {
            return NextResponse.json(
                { success: false, message: 'User tidak ditemukan' },
                { status: 404 }
            );
        }

        // Check if new username conflicts with another user
        if (username && username !== existing.username) {
            const [conflict] = await db
                .select()
                .from(users)
                .where(eq(users.username, username))
                .limit(1);

            if (conflict) {
                return NextResponse.json(
                    { success: false, message: 'Username sudah digunakan' },
                    { status: 400 }
                );
            }
        }

        // Validate role if provided
        if (role) {
            const validRoles: UserRole[] = ['admin', 'bapenda', 'bpn', 'kecamatan', 'desa'];
            if (!validRoles.includes(role)) {
                return NextResponse.json(
                    { success: false, message: 'Role tidak valid' },
                    { status: 400 }
                );
            }
        }

        // Build update object
        const updateData: Record<string, any> = {
            updated_at: new Date(),
        };

        if (username) updateData.username = username;
        if (name) updateData.name = name;
        if (role) updateData.role = role;
        if (kode_wilayah !== undefined) updateData.kode_wilayah = kode_wilayah || null;
        if (password) updateData.password = await hashPassword(password);

        // Update user
        const [updatedUser] = await db
            .update(users)
            .set(updateData)
            .where(eq(users.id, userId))
            .returning({
                id: users.id,
                username: users.username,
                name: users.name,
                role: users.role,
                kode_wilayah: users.kode_wilayah,
            });

        return NextResponse.json({
            success: true,
            message: 'User berhasil diperbarui',
            data: updatedUser,
        });
    } catch (error: any) {
        console.error('Update user error:', error);
        return NextResponse.json(
            { success: false, message: 'Terjadi kesalahan' },
            { status: 500 }
        );
    }
}

// DELETE - Delete user
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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

        const { id } = await params;
        const userId = parseInt(id);

        // Prevent self-deletion
        if (userId === session.id) {
            return NextResponse.json(
                { success: false, message: 'Tidak dapat menghapus diri sendiri' },
                { status: 400 }
            );
        }

        // Check if user exists
        const [existing] = await db
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        if (!existing) {
            return NextResponse.json(
                { success: false, message: 'User tidak ditemukan' },
                { status: 404 }
            );
        }

        // Delete user
        await db.delete(users).where(eq(users.id, userId));

        return NextResponse.json({
            success: true,
            message: 'User berhasil dihapus',
        });
    } catch (error: any) {
        console.error('Delete user error:', error);
        return NextResponse.json(
            { success: false, message: 'Terjadi kesalahan' },
            { status: 500 }
        );
    }
}
