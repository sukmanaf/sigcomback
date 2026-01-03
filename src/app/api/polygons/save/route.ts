import { db } from '@/lib/db';
import { nops, bloks, bangunans } from '@/lib/schema';
import { sql } from 'drizzle-orm';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();

        const type = formData.get('type') as string;
        const code = formData.get('code') as string;
        const coordinatesJson = formData.get('coordinates') as string;
        const coordinates = JSON.parse(coordinatesJson);

        // Validate required fields
        if (!type || !code || !coordinates) {
            return Response.json(
                { success: false, message: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Create WKT polygon from coordinates
        const wktPoints = coordinates.map((c: number[]) => `${c[0]} ${c[1]}`).join(', ');
        const wkt = `POLYGON((${wktPoints}))`;

        let result;
        let insertedId;

        if (type === 'nop') {
            // Handle file uploads for NOP
            const files = formData.getAll('files') as File[];

            if (files.length > 0) {
                // Create upload directory
                const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'nop', code);
                await mkdir(uploadDir, { recursive: true });

                // Save files
                for (const file of files) {
                    if (file.size > 0) {
                        const buffer = Buffer.from(await file.arrayBuffer());
                        const filename = `${Date.now()}_${file.name}`;
                        await writeFile(path.join(uploadDir, filename), buffer);
                    }
                }
            }

            // Insert into nops table
            result = await db.insert(nops).values({
                d_nop: code,
                d_luas: '0', // Will be calculated later
                geom: sql`ST_GeomFromText(${wkt}, 4326)`,
                created_at: new Date(),
                updated_at: new Date(),
            }).returning({ id: nops.id });

            insertedId = result[0]?.id;

        } else if (type === 'blok') {
            // Insert into bloks table
            result = await db.insert(bloks).values({
                d_blok: code,
                geom: sql`ST_GeomFromText(${wkt}, 4326)`,
                created_at: new Date(),
                updated_at: new Date(),
            }).returning({ id: bloks.id });

            insertedId = result[0]?.id;

        } else if (type === 'bangunan') {
            // Insert into bangunans table
            result = await db.insert(bangunans).values({
                d_nop: code,
                geom: sql`ST_GeomFromText(${wkt}, 4326)`,
                created_at: new Date(),
                updated_at: new Date(),
            }).returning({ id: bangunans.id });

            insertedId = result[0]?.id;

        } else {
            return Response.json(
                { success: false, message: 'Invalid polygon type' },
                { status: 400 }
            );
        }

        return Response.json({
            success: true,
            message: `${type.toUpperCase()} saved successfully`,
            id: insertedId,
        });

    } catch (error: any) {
        console.error('Error saving polygon:', error);
        return Response.json(
            { success: false, message: error.message || 'Failed to save polygon' },
            { status: 500 }
        );
    }
}
