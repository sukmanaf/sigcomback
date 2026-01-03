'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import api from '@/lib/axios';

interface TematikLayerProps {
    desaKode: string;
    tematik: string;
    visible: boolean;
    onCategoriesChange?: (categories: string[]) => void;
}

// Color palette for jenis tanah categories
// Using distinct PRIMARY colors that are easily distinguishable
const jenisTanahColors: Record<string, string> = {
    'TANAH + BANGUNAN': '#FF0000',       // RED (merah)
    'KAVLING SIAP BANGUN': '#0000FF',    // BLUE (biru)
    'TANAH KOSONG': '#FFFF00',           // YELLOW (kuning)
    'FASILITAS UMUM': '#FF00FF',         // MAGENTA (pink)
    'PERSAWAHAN / PERTANIAN': '#008000', // GREEN (hijau tua)
    'PERUMAHAN': '#FFA500',              // ORANGE (oranye)
    'PERKANTORAN': '#00FFFF',            // CYAN (biru muda)
    'INDUSTRI': '#800080',               // PURPLE (ungu)
    'PERDAGANGAN': '#FFD700',            // GOLD (emas)
    'default': '#FFFFFF',                // WHITE (putih)
};

// Color palette for jenis bangunan categories
// Using distinct PRIMARY colors that are easily distinguishable
const jenisBangunanColors: Record<string, string> = {
    'PERUMAHAN': '#FF0000',             // RED (merah murni)
    'PERKANTORAN': '#0000FF',           // BLUE (biru murni)
    'PERKANTORAN SWASTA': '#000080',    // NAVY (biru tua)
    'PABRIK': '#800000',                // MAROON (merah tua)
    'TOKO/APOTEK/PASAR/RUKO': '#FFFF00', // YELLOW (kuning murni)
    'TOKO/APOTIK/PASAR/RUKO': '#FFFF00', // YELLOW (kuning murni)
    'RUMAH SAKIT/KLINIK': '#FF00FF',    // MAGENTA (pink terang)
    'OLAH RAGA/REKREASI': '#800080',    // PURPLE (ungu)
    'HOTEL/RESTORAN/WISMA': '#FFA500',  // ORANGE (oranye)
    'BENGKEL/GUDANG/PERTANIAN': '#008000', // GREEN (hijau tua)
    'GEDUNG PEMERINTAH': '#00FFFF',     // CYAN (biru muda)
    'LAIN-LAIN': '#FFD700',             // GOLD (emas)
    'BANGUNAN TIDAK KENA PAJAK': '#FF69B4', // HOT PINK 
    'BANGUNAN PARKIR': '#4B0082',       // INDIGO (ungu tua)
    'APARTEMEN/KONDOMINIUM': '#00FF00', // LIME (hijau terang)
    'POMPA BENSIN': '#DC143C',          // CRIMSON (merah gelap)
    'TANGKI MINYAK': '#8B4513',         // SADDLE BROWN (coklat)
    'GEDUNG SEKOLAH': '#1E90FF',        // DODGER BLUE
    'GEDUNG PERGURUAN TINGGI': '#9400D3', // DARK VIOLET
    'default': '#FFFFFF',               // WHITE (putih)
};

// Generate dynamic color from string (for kelas tanah codes like 041, 064, etc.)
// Uses golden ratio angle for better color distribution
// Colors are bright and vivid to be visible on dark satellite basemap
function stringToColor(str: string): string {
    // Create a more varied hash using multiple character combinations
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        // Use a prime multiplier for more variation
        hash = ((hash * 31) + str.charCodeAt(i)) | 0;
    }

    // Use golden ratio angle (137.5°) for better hue distribution
    // This ensures adjacent codes get very different colors
    const goldenAngle = 137.508;
    const hue = (Math.abs(hash) * goldenAngle) % 360;

    // Use bright, vivid colors (high saturation and higher lightness)
    // Visible on dark satellite basemap
    const saturation = 80 + (Math.abs(hash >> 4) % 20); // 80-100% saturation for vivid colors
    const lightness = 55 + (Math.abs(hash >> 8) % 20); // 55-75% lightness for bright colors

    return `hsl(${Math.round(hue)}, ${saturation}%, ${lightness}%)`;
}

// Color palette for nilai individu categories
const nilaiIndividuColors: Record<string, string> = {
    'SUDAH_DINILAI_INDIVIDU': '#00FF7F',  // spring green
    'BELUM_DINILAI_INDIVIDU': '#FF6347',  // tomato
    'default': '#ADFF2F',                 // green yellow
};

// Color palette for NIK categories
const nikColors: Record<string, string> = {
    'SUDAH_NIK': '#00FF7F',   // spring green
    'BELUM_NIK': '#FF6347',   // tomato
    'default': '#ADFF2F',     // green yellow
};

// Color palette for ketetapan per buku categories
const ketetapanPerBukuColors: Record<string, string> = {
    'KETETAPAN_NOL': '#FF6347',  // tomato (merah - tidak ada ketetapan)
    '1': '#00BFFF',              // deep sky blue (Buku 1)
    '2': '#FFD700',              // gold (Buku 2)
    '3': '#FF69B4',              // hot pink (Buku 3)
    '4': '#00CED1',              // dark turquoise (Buku 4)
    '5': '#BA55D3',              // medium orchid (Buku 5)
    'default': '#ADFF2F',        // green yellow
};

// Color palette for status pembayaran categories
const statusPembayaranColors: Record<string, string> = {
    'SUDAH_BAYAR': '#00FF7F',   // spring green (hijau - sudah bayar)
    'BELUM_BAYAR': '#FF6347',   // tomato (merah - belum bayar)
    'default': '#ADFF2F',       // green yellow
};

export function getCategoryColor(category: string, tematik?: string): string {
    // For jenis_tanah, use predefined colors
    if (tematik === 'jenis_tanah') {
        return jenisTanahColors[category] || jenisTanahColors['default'];
    }
    // For jenis_bangunan, use predefined colors
    if (tematik === 'jenis_bangunan') {
        return jenisBangunanColors[category] || jenisBangunanColors['default'];
    }
    // For nilai_individu, use predefined colors
    if (tematik === 'nilai_individu') {
        return nilaiIndividuColors[category] || nilaiIndividuColors['default'];
    }
    // For NIK, use predefined colors
    if (tematik === 'nik') {
        return nikColors[category] || nikColors['default'];
    }
    // For ketetapan per buku, use predefined colors
    if (tematik === 'ketetapan_per_buku') {
        return ketetapanPerBukuColors[category] || ketetapanPerBukuColors['default'];
    }
    // For status pembayaran, use predefined colors
    if (tematik === 'status_pembayaran') {
        return statusPembayaranColors[category] || statusPembayaranColors['default'];
    }
    // For kelas_tanah, kelas_bangunan, zona_nilai_tanah and other codes, generate color from string
    return stringToColor(category);
}

interface TematikData {
    [category: string]: Array<{ NOP: string;[key: string]: any }>;
}

// Tematik types that require year parameter
const requiresYear = ['kelas_tanah', 'kelas_bangunan', 'zona_nilai_tanah', 'status_pembayaran', 'ketetapan_per_buku'];

// Opacity for fill (used in both polygon and legend)
export const TEMATIK_FILL_OPACITY = 0.35;

export default function TematikLayer({ desaKode, tematik, visible, onCategoriesChange }: TematikLayerProps) {
    const map = useMap();
    const [data, setData] = useState<TematikData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const geojsonLayersRef = useRef<L.GeoJSON[]>([]);
    const [showYearPopup, setShowYearPopup] = useState(false);
    const [selectedYear, setSelectedYear] = useState<string>('');
    const [pendingFetch, setPendingFetch] = useState(false);

    // Generate year options (current year down to 1990)
    const yearOptions = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const years: string[] = [];
        for (let y = currentYear; y >= 1990; y--) {
            years.push(y.toString());
        }
        return years;
    }, []);

    // Check if this tematik type needs year selection
    const needsYear = requiresYear.includes(tematik);

    // Cleanup function for tematik layers only
    const cleanupLayers = useCallback(() => {
        geojsonLayersRef.current.forEach(layer => {
            if ((layer as any)._labelMarker && map.hasLayer((layer as any)._labelMarker)) {
                map.removeLayer((layer as any)._labelMarker);
            }
            if (map.hasLayer(layer)) {
                map.removeLayer(layer);
            }
        });
        geojsonLayersRef.current = [];
        setData(null);
    }, [map]);

    // Clear ALL GeoJSON/vector layers from the map (except base tile layer)
    const clearAllMapLayers = useCallback(() => {
        map.eachLayer((layer: L.Layer) => {
            // Keep TileLayer (basemap), remove all other layers
            if (!(layer instanceof L.TileLayer)) {
                map.removeLayer(layer);
            }
        });
        geojsonLayersRef.current = [];
    }, [map]);

    // Fetch data function
    const fetchTematikData = useCallback(async (tahun?: string) => {
        setLoading(true);
        setError(null);

        // Clear all existing layers from map first
        clearAllMapLayers();

        try {
            // Fetch tematik data from SISMIOP via dynamic route
            const requestBody: { desaKode: string; tahun?: string } = { desaKode };
            if (tahun) {
                requestBody.tahun = tahun;
            }

            const response = await api.post(`/tematik/${tematik}`, requestBody);

            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to fetch tematik data');
            }

            setData(response.data.data);

            // Collect all NOPs from all categories
            const allNops: string[] = [];
            const nopCategories: Record<string, string> = {};

            Object.entries(response.data.data as TematikData).forEach(([category, items]) => {
                items.forEach(item => {
                    // Convert dotted NOP to 18-digit format
                    const nop18 = item.NOP.replace(/[.\-]/g, '');
                    allNops.push(nop18);
                    nopCategories[nop18] = category;
                });
            });

            if (allNops.length === 0) {
                console.log('No NOPs found in tematik data');
                setLoading(false);
                return;
            }

            // Fetch geometries from our API
            const geoResponse = await api.post('/nops/geometries', { nops: allNops });

            if (!geoResponse.data.success) {
                throw new Error('Failed to fetch geometries');
            }

            // Clear existing layers from map (but don't reset data)
            geojsonLayersRef.current.forEach(layer => {
                if ((layer as any)._labelMarker && map.hasLayer((layer as any)._labelMarker)) {
                    map.removeLayer((layer as any)._labelMarker);
                }
                if (map.hasLayer(layer)) {
                    map.removeLayer(layer);
                }
            });
            geojsonLayersRef.current = [];

            // Create GeoJSON layers by category
            const newLayers: L.GeoJSON[] = [];

            geoResponse.data.data.forEach((feature: any) => {
                const nop = feature.properties.d_nop;
                const category = nopCategories[nop];
                const color = getCategoryColor(category, tematik);

                const layer = L.geoJSON(feature, {
                    style: {
                        color: color,
                        weight: 2,
                        opacity: 1,
                        fillColor: color,
                        fillOpacity: TEMATIK_FILL_OPACITY,
                    },
                });

                layer.bindPopup(`
                    <div>
                        <strong>NOP:</strong> ${nop}<br/>
                        <strong>Kategori:</strong> ${category}
                    </div>
                `);

                layer.addTo(map);
                newLayers.push(layer);
            });

            geojsonLayersRef.current = newLayers;

        } catch (err: any) {
            console.error('Error fetching tematik:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [desaKode, tematik, map, cleanupLayers, clearAllMapLayers]);

    // Handle visibility and initial fetch
    useEffect(() => {
        if (!visible || !desaKode || !tematik) {
            cleanupLayers();
            setShowYearPopup(false);
            setSelectedYear('');
            return;
        }

        // If this type needs year, always show popup first (reset each time tematik changes)
        if (needsYear) {
            // Reset year selection when tematik changes to force popup
            setSelectedYear('');
            setShowYearPopup(true);
            return;
        }

        // Fetch data for non-year types
        fetchTematikData();

        // Cleanup on unmount or when dependencies change
        return () => {
            cleanupLayers();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible, desaKode, tematik]);

    // Handle year selection
    const handleYearSelect = (year: string) => {
        setSelectedYear(year);
        setShowYearPopup(false);
        fetchTematikData(year);
    };

    // Extract unique categories for legend and notify parent
    const categories = useMemo(() => {
        if (!data) return [];
        return Object.keys(data).sort();
    }, [data]);

    // Notify parent about categories change for legend
    useEffect(() => {
        if (onCategoriesChange) {
            onCategoriesChange(categories);
        }
    }, [categories, onCategoriesChange]);

    // Render year selection popup
    if (showYearPopup && needsYear) {
        return (
            <div
                className="absolute inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm"
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                onMouseMove={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                onWheel={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onPointerMove={(e) => e.stopPropagation()}
            >
                <div className="bg-white rounded-xl shadow-2xl p-6 mx-4 max-w-sm w-full relative">
                    <button
                        onClick={() => setShowYearPopup(false)}
                        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 p-1"
                        aria-label="Tutup"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Pilih Tahun Pajak</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Pilih tahun pajak SPPT untuk menampilkan data {tematik.replace(/_/g, ' ')}:
                    </p>
                    <select
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 mb-4"
                        defaultValue=""
                        onChange={(e) => e.target.value && handleYearSelect(e.target.value)}
                    >
                        <option value="" disabled>-- Pilih Tahun --</option>
                        {yearOptions.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
            </div>
        );
    }

    return null; // Legend rendered in MapComponent
}

// Export for MapComponent legend
export { stringToColor };
