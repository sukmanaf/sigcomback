import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { usulan } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth';

// PUT /api/usulan/[id] - Update usulan status (bapenda/admin only)
export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const token = request.cookies.get('auth_token')?.value;
        if (!token) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifyToken(token);
        if (!payload) {
            return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
        }

        // Only admin and bapenda can update usulan status
        if (payload.role !== 'admin' && payload.role !== 'bapenda') {
            return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
        }

        const { id } = await context.params;
        const body = await request.json();
        const { status, catatan_bapenda } = body;

        if (!status) {
            return NextResponse.json({ success: false, message: 'Status is required' }, { status: 400 });
        }

        // Validate status
        const validStatuses = ['pending', 'diproses', 'selesai', 'ditolak'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json({ success: false, message: 'Invalid status' }, { status: 400 });
        }

        // Update usulan
        const result = await db
            .update(usulan)
            .set({
                status,
                catatan_bapenda: catatan_bapenda || null,
                updated_at: new Date(),
            })
            .where(eq(usulan.id, parseInt(id)))
            .returning();

        if (result.length === 0) {
            return NextResponse.json({ success: false, message: 'Usulan not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: result[0],
            message: 'Status usulan berhasil diperbarui',
        });
    } catch (error: any) {
        console.error('Error updating usulan:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

// DELETE /api/usulan/[id] - Delete usulan (owner or admin only)
export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const token = request.cookies.get('auth_token')?.value;
        if (!token) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifyToken(token);
        if (!payload) {
            return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
        }

        const { id } = await context.params;
        const usulanId = parseInt(id);

        // Get the usulan first to check ownership
        const existingUsulan = await db
            .select()
            .from(usulan)
            .where(eq(usulan.id, usulanId))
            .limit(1);

        if (existingUsulan.length === 0) {
            return NextResponse.json({ success: false, message: 'Usulan not found' }, { status: 404 });
        }

        // Only owner or admin can delete
        if (existingUsulan[0].user_id !== payload.userId && payload.role !== 'admin') {
            return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
        }

        // Delete usulan
        await db.delete(usulan).where(eq(usulan.id, usulanId));

        return NextResponse.json({
            success: true,
            message: 'Usulan berhasil dihapus',
        });
    } catch (error: any) {
        console.error('Error deleting usulan:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
