import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { verifyPassword, hashPassword, getCurrentUser } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        // Get current user from token
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;

        if (!token) {
            return Response.json(
                { success: false, message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const currentUser = await getCurrentUser(token);
        if (!currentUser) {
            return Response.json(
                { success: false, message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { currentPassword, newPassword, confirmPassword } = await request.json();

        // Validate input
        if (!currentPassword || !newPassword || !confirmPassword) {
            return Response.json(
                { success: false, message: 'Semua field harus diisi' },
                { status: 400 }
            );
        }

        if (newPassword !== confirmPassword) {
            return Response.json(
                { success: false, message: 'Password baru tidak cocok dengan konfirmasi' },
                { status: 400 }
            );
        }

        if (newPassword.length < 6) {
            return Response.json(
                { success: false, message: 'Password baru minimal 6 karakter' },
                { status: 400 }
            );
        }

        // Get user from database
        const user = await db
            .select({ id: users.id, password: users.password })
            .from(users)
            .where(eq(users.id, currentUser.id))
            .limit(1);

        if (user.length === 0) {
            return Response.json(
                { success: false, message: 'User tidak ditemukan' },
                { status: 404 }
            );
        }

        // Verify current password
        const isValid = await verifyPassword(currentPassword, user[0].password);
        if (!isValid) {
            return Response.json(
                { success: false, message: 'Password saat ini salah' },
                { status: 400 }
            );
        }

        // Hash new password and update
        const hashedPassword = await hashPassword(newPassword);
        await db
            .update(users)
            .set({ password: hashedPassword, updated_at: new Date() })
            .where(eq(users.id, currentUser.id));

        return Response.json({
            success: true,
            message: 'Password berhasil diubah',
        });

    } catch (error: any) {
        console.error('Error changing password:', error);
        return Response.json(
            { success: false, message: error.message || 'Gagal mengubah password' },
            { status: 500 }
        );
    }
}
