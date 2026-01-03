import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { db } from './db';
import { users, User, UserRole } from './schema';
import { eq } from 'drizzle-orm';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'your-super-secret-key-change-in-production'
);

const COOKIE_NAME = 'auth_token';
const SESSION_DURATION = 24 * 60 * 60; // 24 hours in seconds

export interface JWTPayload {
    userId: number;
    username: string;
    role: UserRole;
    kodeWilayah: string | null;
    exp?: number;
    [key: string]: unknown; // Required for jose compatibility
}

export interface AuthUser {
    id: number;
    username: string;
    name: string;
    role: UserRole;
    kodeWilayah: string | null;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

// Create JWT token
export async function createToken(user: User): Promise<string> {
    const token = await new SignJWT({
        userId: user.id,
        username: user.username,
        role: user.role,
        kodeWilayah: user.kode_wilayah,
    } as JWTPayload)
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime(`${SESSION_DURATION}s`)
        .setIssuedAt()
        .sign(JWT_SECRET);

    return token;
}

// Verify JWT token
export async function verifyToken(token: string): Promise<JWTPayload | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload as unknown as JWTPayload;
    } catch {
        return null;
    }
}

// Get current session from cookies
export async function getSession(): Promise<AuthUser | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
        return null;
    }

    const payload = await verifyToken(token);
    if (!payload) {
        return null;
    }

    // Get fresh user data from database
    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.userId))
        .limit(1);

    if (!user) {
        return null;
    }

    return {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role as UserRole,
        kodeWilayah: user.kode_wilayah,
    };
}

// Get current user from token (for API routes)
export async function getCurrentUser(token: string): Promise<AuthUser | null> {
    const payload = await verifyToken(token);
    if (!payload) {
        return null;
    }

    // Get fresh user data from database
    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.userId))
        .limit(1);

    if (!user) {
        return null;
    }

    return {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role as UserRole,
        kodeWilayah: user.kode_wilayah,
    };
}

// Set auth cookie
export async function setAuthCookie(token: string): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_DURATION,
        path: '/',
    });
}

// Clear auth cookie
export async function clearAuthCookie(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
}

// Check if user can edit polygons
export function canUserEdit(role: UserRole): boolean {
    return role === 'admin' || role === 'bapenda';
}

// Check if user can manage users
export function canUserManage(role: UserRole): boolean {
    return role === 'admin';
}

// Get allowed desa codes for user
export function getAllowedDesaCodes(role: UserRole, kodeWilayah: string | null): string[] | null {
    // null means all desas are allowed
    if (role === 'admin' || role === 'bapenda' || role === 'bpn') {
        return null;
    }

    if (!kodeWilayah) {
        return []; // No access
    }

    // For kecamatan role, kodeWilayah is kecamatan code (e.g., '030')
    // For desa role, kodeWilayah is full desa code (e.g., '35.75.030.002')
    return [kodeWilayah];
}
