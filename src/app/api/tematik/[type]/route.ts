import { NextRequest, NextResponse } from 'next/server';
import https from 'https';

const SISMIOP_API_URL = process.env.SISMIOP_API_URL || 'https://bapenda.pasuruankota.go.id:5151/sismiop/sig_api';

// Map tematik types to API endpoints
const tematikEndpoints: Record<string, string> = {
    jenis_tanah: 'GetsPublicData/jenisTanah',
    kelas_tanah: 'GetsPublicData/kelasTanah',
    jenis_bangunan: 'GetsPublicData/jenisPenggunaanBangunan',
    kelas_bangunan: 'GetsPublicData/kelasBangunan',
    nilai_individu: 'GetsPublicData/nilaiIndividu',
    nik: 'GetsPublicData/nik',
    zona_nilai_tanah: 'GetsPublicData/zonaNilaiTanah',
    ketetapan_per_buku: 'GetsPublicData/ketetapanPerBuku',
    status_pembayaran: 'GetsPublicData/statusPembayaran',
};

// Tematik types that require year parameter
const requiresYear = ['kelas_tanah', 'kelas_bangunan', 'zona_nilai_tanah', 'status_pembayaran', 'ketetapan_per_buku'];

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ type: string }> }
) {
    try {
        const { type } = await params;
        const body = await request.json();
        const { desaKode, tahun } = body;

        if (!desaKode) {
            return NextResponse.json(
                { success: false, message: 'desaKode is required' },
                { status: 400 }
            );
        }

        const endpoint = tematikEndpoints[type];
        if (!endpoint) {
            return NextResponse.json(
                { success: false, message: `Invalid tematik type: ${type}` },
                { status: 400 }
            );
        }

        // Parse desa kode (10 digits): XX XX XXX XXX
        // KD_PROPINSI=1-2, KD_DATI2=3-4, KD_KECAMATAN=5-7, KD_KELURAHAN=8-10
        const kdPropinsi = desaKode.substring(0, 2);
        const kdDati2 = desaKode.substring(2, 4);
        const kdKecamatan = desaKode.substring(4, 7);
        const kdKelurahan = desaKode.substring(7, 10);

        // Use current year if tahun not provided and type requires it
        const yearToUse = tahun || new Date().getFullYear().toString();

        console.log('Fetching tematik:', { type, desaKode, endpoint, kdPropinsi, kdDati2, kdKecamatan, kdKelurahan, yearToUse });

        const data = await makeHttpsRequest(
            `${SISMIOP_API_URL}/${endpoint}`,
            {
                kdPropinsi,
                kdDati2,
                kdKecamatan,
                kdKelurahan,
                tahun: requiresYear.includes(type) ? yearToUse : undefined
            }
        );

        return NextResponse.json({
            success: data.status,
            message: data.msg,
            data: data.data,
        });

    } catch (error: any) {
        console.error('Error fetching tematik:', error);
        return NextResponse.json(
            { success: false, message: error.message || 'Failed to fetch tematik data' },
            { status: 500 }
        );
    }
}

interface RequestParams {
    kdPropinsi: string;
    kdDati2: string;
    kdKecamatan: string;
    kdKelurahan: string;
    tahun?: string;
}

// Make HTTPS request with SSL verification disabled
function makeHttpsRequest(url: string, params: RequestParams): Promise<any> {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);

        // Build multipart form data manually
        const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
        const bodyParts = [
            `--${boundary}\r\nContent-Disposition: form-data; name="KD_PROPINSI"\r\n\r\n${params.kdPropinsi}\r\n`,
            `--${boundary}\r\nContent-Disposition: form-data; name="KD_DATI2"\r\n\r\n${params.kdDati2}\r\n`,
            `--${boundary}\r\nContent-Disposition: form-data; name="KD_KECAMATAN"\r\n\r\n${params.kdKecamatan}\r\n`,
            `--${boundary}\r\nContent-Disposition: form-data; name="KD_KELURAHAN"\r\n\r\n${params.kdKelurahan}\r\n`,
        ];

        // Add year parameter if provided
        if (params.tahun) {
            bodyParts.push(`--${boundary}\r\nContent-Disposition: form-data; name="THN_PAJAK_SPPT"\r\n\r\n${params.tahun}\r\n`);
        }

        bodyParts.push(`--${boundary}--\r\n`);
        const body = bodyParts.join('');

        const options: https.RequestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || 443,
            path: urlObj.pathname,
            method: 'POST',
            rejectUnauthorized: false,
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
