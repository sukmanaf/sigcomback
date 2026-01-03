import { NextRequest, NextResponse } from 'next/server';
import https from 'https';

const SISMIOP_API_URL = process.env.SISMIOP_API_URL || 'https://bapenda.pasuruankota.go.id:5151/sismiop/sig_api';

export async function POST(request: NextRequest) {
    try {
        const { nop } = await request.json();

        if (!nop) {
            return NextResponse.json(
                { success: false, message: 'NOP is required' },
                { status: 400 }
            );
        }

        // Format NOP with dots: 35.75.030.002.008.0150.0
        const formattedNop = formatNop(nop);

        console.log('Fetching NOP info:', { nop, formattedNop, url: SISMIOP_API_URL });

        // Use https module directly to bypass SSL verification
        const data = await makeHttpsRequest(
            `${SISMIOP_API_URL}/GetsPublicData/InformasiOp`,
            formattedNop
        );

        return NextResponse.json({
            success: data.status,
            message: data.msg,
            data: data.data,
        });

    } catch (error: any) {
        console.error('Error fetching NOP info:', error);
        return NextResponse.json(
            { success: false, message: error.message || 'Failed to fetch NOP info' },
            { status: 500 }
        );
    }
}

// Make HTTPS request with SSL verification disabled
function makeHttpsRequest(url: string, nop: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);

        // Build multipart form data manually
        const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
        const body = `--${boundary}\r\nContent-Disposition: form-data; name="NOP"\r\n\r\n${nop}\r\n--${boundary}--\r\n`;

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

// Format NOP from 18-digit to dotted format
// Input: 357503000200080150 (18 digits)
// Output: 35.75.030.002.008.0150.0
function formatNop(nop: string): string {
    // Remove any existing dots/dashes
    const cleanNop = nop.replace(/[.\-]/g, '');

    if (cleanNop.length !== 18) {
        // Return as-is if not 18 digits
        return nop;
    }

    // Format: XX.XX.XXX.XXX.XXX.XXXX.X
    const parts = [
        cleanNop.substring(0, 2),   // 35
        cleanNop.substring(2, 4),   // 75
        cleanNop.substring(4, 7),   // 030
        cleanNop.substring(7, 10),  // 002
        cleanNop.substring(10, 13), // 008
        cleanNop.substring(13, 17), // 0150
        cleanNop.substring(17, 18), // 0
    ];

    return parts.join('.');
}
