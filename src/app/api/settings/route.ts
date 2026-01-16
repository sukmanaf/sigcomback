import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { appSettings } from '@/lib/schema';
import { getSession, canUserManage } from '@/lib/auth';
import { eq } from 'drizzle-orm';

// GET - Get all app settings (public)
export async function GET() {
    try {
        const settings = await db
            .select()
            .from(appSettings);

        // Convert to key-value object
        const settingsObj: Record<string, string | null> = {};
        for (const setting of settings) {
            settingsObj[setting.key] = setting.value;
        }

        return NextResponse.json({
            success: true,
            data: settingsObj,
        });
    } catch (error: any) {
        console.error('Get settings error:', error);
        return NextResponse.json(
            { success: false, message: 'Terjadi kesalahan' },
            { status: 500 }
        );
    }
}

// PUT - Update app settings (admin only)
export async function PUT(request: NextRequest) {
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

        const { app_name, app_name_short, app_logo, institution_name } = await request.json();

        // Update app_name (full name)
        if (app_name !== undefined) {
            await db
                .insert(appSettings)
                .values({ key: 'app_name', value: app_name, updated_at: new Date() })
                .onConflictDoUpdate({
                    target: appSettings.key,
                    set: { value: app_name, updated_at: new Date() },
                });
        }

        // Update app_name_short (singkatan)
        if (app_name_short !== undefined) {
            await db
                .insert(appSettings)
                .values({ key: 'app_name_short', value: app_name_short, updated_at: new Date() })
                .onConflictDoUpdate({
                    target: appSettings.key,
                    set: { value: app_name_short, updated_at: new Date() },
                });
        }

        // Update app_logo
        if (app_logo !== undefined) {
            await db
                .insert(appSettings)
                .values({ key: 'app_logo', value: app_logo, updated_at: new Date() })
                .onConflictDoUpdate({
                    target: appSettings.key,
                    set: { value: app_logo, updated_at: new Date() },
                });
        }

        // Update institution_name
        if (institution_name !== undefined) {
            await db
                .insert(appSettings)
                .values({ key: 'institution_name', value: institution_name, updated_at: new Date() })
                .onConflictDoUpdate({
                    target: appSettings.key,
                    set: { value: institution_name, updated_at: new Date() },
                });
        }

        return NextResponse.json({
            success: true,
            message: 'Pengaturan berhasil disimpan',
        });
    } catch (error: any) {
        console.error('Update settings error:', error);
        return NextResponse.json(
            { success: false, message: 'Terjadi kesalahan' },
            { status: 500 }
        );
    }
}
