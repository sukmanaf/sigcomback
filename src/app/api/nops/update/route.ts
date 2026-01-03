import { db } from '@/lib/db';
import { nops } from '@/lib/schema';
import { sql, eq } from 'drizzle-orm';
import { writeFile, mkdir, readdir, unlink } from 'fs/promises';
import path from 'path';

export async function PUT(request: Request) {
    try {
        const formData = await request.formData();

        const nop = formData.get('nop') as string;
        const coordinatesJson = formData.get('coordinates') as string;
        const deletedImagesJson = formData.get('deletedImages') as string;

        if (!nop || !coordinatesJson) {
            return Response.json(
                { success: false, message: 'NOP and coordinates are required' },
                { status: 400 }
            );
        }

        const coordinates = JSON.parse(coordinatesJson);
        const deletedImages = deletedImagesJson ? JSON.parse(deletedImagesJson) : [];

        // Create WKT polygon from coordinates
        const wktPoints = coordinates.map((c: number[]) => `${c[0]} ${c[1]}`).join(', ');
        const wkt = `POLYGON((${wktPoints}))`;

        // Update geometry in database
        await db
            .update(nops)
            .set({
                geom: sql`ST_GeomFromText(${wkt}, 4326)`,
                updated_at: new Date(),
            })
            .where(eq(nops.d_nop, nop));

        // Handle deleted images
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'nop', nop);

        for (const imagePath of deletedImages) {
            try {
                const filename = path.basename(imagePath);
                await unlink(path.join(uploadDir, filename));
            } catch {
                // File doesn't exist, ignore
            }
        }

        // Handle new file uploads
        const files = formData.getAll('files') as File[];

        if (files.length > 0) {
            await mkdir(uploadDir, { recursive: true });

            for (const file of files) {
                if (file.size > 0) {
                    const buffer = Buffer.from(await file.arrayBuffer());
                    const filename = `${Date.now()}_${file.name}`;
                    await writeFile(path.join(uploadDir, filename), buffer);
                }
            }
        }

        // Get updated images list
        let images: string[] = [];
        try {
            const allFiles = await readdir(uploadDir);
            images = allFiles
                .filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
                .map(f => `/uploads/nop/${nop}/${f}`);
        } catch {
            // Directory doesn't exist
        }

        return Response.json({
            success: true,
            message: 'NOP updated successfully',
            images,
        });

    } catch (error: any) {
        console.error('Error updating NOP:', error);
        return Response.json(
            { success: false, message: error.message || 'Failed to update NOP' },
            { status: 500 }
        );
    }
}
