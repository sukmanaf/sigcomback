import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword, createToken, setAuthCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json(
                { success: false, message: 'Username dan password harus diisi' },
                { status: 400 }
            );
        }

        // Find user by username
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.username, username))
            .limit(1);

        console.log('Login attempt:', { username, userFound: !!user });

        if (!user) {
            console.log('User not found in database');
            return NextResponse.json(
                { success: false, message: 'Username atau password salah' },
                { status: 401 }
            );
        }

        console.log('User found:', { id: user.id, name: user.name, passwordHash: user.password?.substring(0, 20) + '...' });

        // Verify password
        const isValid = await verifyPassword(password, user.password);
        console.log('Password verification result:', isValid);

        if (!isValid) {
            return NextResponse.json(
                { success: false, message: 'Username atau password salah' },
                { status: 401 }
            );
        }

        // Create JWT token
        const token = await createToken(user);

        // Set auth cookie
        await setAuthCookie(token);

        return NextResponse.json({
            success: true,
            message: 'Login berhasil',
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
                kodeWilayah: user.kode_wilayah,
            },
        });
    } catch (error: any) {
        console.error('Login error:', error);
        return NextResponse.json(
            {
                success: false,
                message: 'Terjadi kesalahan saat login',
                error: error?.message || String(error),
                stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
            },
            { status: 500 }
        );
    }
}
