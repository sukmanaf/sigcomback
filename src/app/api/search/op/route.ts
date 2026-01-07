import { NextRequest, NextResponse } from 'next/server';
import https from 'https';

const SISMIOP_API_URL = process.env.SISMIOP_API_URL || 'https://bapenda.pasuruankota.go.id:5151/sismiop/sig_api';

export async function POST(request: NextRequest) {
    try {
        const { type, value } = await request.json();

        if (!type || !value) {
            return NextResponse.json(
                { success: false, message: 'Type and value are required' },
                { status: 400 }
            );
        }

        if (!['nama', 'alamat'].includes(type)) {
            return NextResponse.json(
                { success: false, message: 'Type must be "nama" or "alamat"' },
                { status: 400 }
            );
        }

        console.log('Searching OP:', { type, value, url: SISMIOP_API_URL });

        // Call SISMIOP API
        const data = await makeHttpsRequest(
            `${SISMIOP_API_URL}/GetsPublicData/pencarianOp`,
            type,
            value
        );

        return NextResponse.json({
            success: data.status,
            message: data.msg,
            data: data.data || [],
        });

    } catch (error: any) {
        console.error('Error searching OP:', error);
        return NextResponse.json(
            { success: false, message: error.message || 'Failed to search OP' },
            { status: 500 }
        );
    }
}

// Make HTTPS request with SSL verification disabled
function makeHttpsRequest(url: string, type: string, value: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);

        // Build multipart form data manually
        const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
        const body = `--${boundary}\r\nContent-Disposition: form-data; name="${type}"\r\n\r\n${value}\r\n--${boundary}--\r\n`;

        const options: https.RequestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || 443,
            path: urlObj.pathname,
            method: 'POST',
            rejectUnauthorized: false, // Ignore SSL certificate errors
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': Buffer.byteLength(body),
            },
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (e) {
                    reject(new Error('Invalid JSON response'));
                }
            });
        });

        req.on('error', (e) => {
            console.error('HTTPS request error:', e);
            reject(e);
        });

        req.write(body);
        req.end();
    });
}
