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
    onNopClick?: (nop: string, category: string) => void;
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

// 100 unique, maximally distinct colors for dynamic coloring
// Each color has different hue - no similar colors included
// Shuffled so adjacent colors have maximum visual contrast
const UNIQUE_COLOR_PALETTE: string[] = [
    // Row 1: Red, Cyan, Brown, Lime, Magenta, Navy
    '#FF0000', '#00CED1', '#8B4513', '#32CD32', '#FF00FF', '#000080',
    // Row 2: Gold, Purple, Teal, Orange, Pink, Olive
    '#FFD700', '#800080', '#008080', '#FF8C00', '#FF1493', '#808000',
    // Row 3: Aqua, Maroon, Chartreuse, Indigo, Coral, DarkCyan
    '#00FFFF', '#800000', '#7FFF00', '#4B0082', '#FF7F50', '#008B8B',
    // Row 4: Yellow, DarkViolet, SeaGreen, Crimson, DeepSkyBlue, Sienna
    '#FFFF00', '#9400D3', '#2E8B57', '#DC143C', '#00BFFF', '#A0522D',
    // Row 5: Blue, Tomato, MediumSpringGreen, DarkOrange, SlateBlue, Peru
    '#0000FF', '#FF6347', '#00FA9A', '#FF4500', '#6A5ACD', '#CD853F',
    // Row 6: Lime, MediumVioletRed, DarkSlateGray, Goldenrod, RoyalBlue, SaddleBrown
    '#00FF00', '#C71585', '#2F4F4F', '#DAA520', '#4169E1', '#8B4513',
    // Row 7: Magenta, DarkGreen, LightCoral, DodgerBlue, Khaki, DarkMagenta
    '#FF00FF', '#006400', '#F08080', '#1E90FF', '#F0E68C', '#8B008B',
    // Row 8: SpringGreen, Firebrick, CadetBlue, OrangeRed, MediumOrchid, DarkOliveGreen
    '#00FF7F', '#B22222', '#5F9EA0', '#FF4500', '#BA55D3', '#556B2F',
    // Row 9: Cyan, Brown, LawnGreen, BlueViolet, Salmon, DarkSeaGreen
    '#00FFFF', '#A52A2A', '#7CFC00', '#8A2BE2', '#FA8072', '#8FBC8F',
    // Row 10: HotPink, DarkSlateBlue, LightGreen, Indian Red, SteelBlue, Tan
    '#FF69B4', '#483D8B', '#90EE90', '#CD5C5C', '#4682B4', '#D2B48C',
    // Row 11: Aquamarine, DarkRed, MediumSeaGreen, DarkOrange, MediumPurple, RosyBrown
    '#7FFFD4', '#8B0000', '#3CB371', '#FF8C00', '#9370DB', '#BC8F8F',
    // Row 12: Turquoise, Chocolate, YellowGreen, Orchid, LightSeaGreen, DarkGoldenrod
    '#40E0D0', '#D2691E', '#9ACD32', '#DA70D6', '#20B2AA', '#B8860B',
    // Row 13: PaleVioletRed, MediumTurquoise, OliveDrab, Plum, LightSteelBlue, BurlyWood
    '#DB7093', '#48D1CC', '#6B8E23', '#DDA0DD', '#B0C4DE', '#DEB887',
    // Row 14: GreenYellow, MediumSlateBlue, DarkKhaki, Thistle, CornflowerBlue, NavajoWhite
    '#ADFF2F', '#7B68EE', '#BDB76B', '#D8BFD8', '#6495ED', '#FFDEAD',
    // Row 15: PaleTurquoise, Violet, MediumAquamarine, LightPink, PowderBlue, Wheat
    '#AFEEEE', '#EE82EE', '#66CDAA', '#FFB6C1', '#B0E0E6', '#F5DEB3',
    // Row 16: Remaining distinct colors
    '#E6E6FA', '#7B68EE', '#00CED1', '#FFE4B5', '#87CEEB', '#DDA0DD',
    '#98FB98', '#F0E68C', '#87CEFA', '#FAFAD2',
];

// Cache to track assigned colors per tematik type to avoid duplicates
const categoryColorCache: Map<string, Map<string, string>> = new Map();
// Track used colors per tematik to ensure uniqueness
const usedColorsCache: Map<string, Set<string>> = new Map();

// Get or assign a unique color for a category within a tematik type
function getOrAssignUniqueColor(category: string, tematikType: string): string {
    // Initialize caches for this tematik type if needed
    if (!categoryColorCache.has(tematikType)) {
        categoryColorCache.set(tematikType, new Map());
        usedColorsCache.set(tematikType, new Set());
    }

    const tematikCache = categoryColorCache.get(tematikType)!;
    const usedColors = usedColorsCache.get(tematikType)!;

    // Return cached color if already assigned
    if (tematikCache.has(category)) {
        return tematikCache.get(category)!;
    }

    // Find next available color from palette
    let assignedColor: string | null = null;

    // First, try to find an unused color from the palette
    for (const color of UNIQUE_COLOR_PALETTE) {
        if (!usedColors.has(color)) {
            assignedColor = color;
            break;
        }
    }

    // If all palette colors are used, generate additional HSL colors
    if (!assignedColor) {
        // Generate more colors using golden ratio for even distribution
        const goldenAngle = 137.508;
        let colorIndex = usedColors.size;
        let attempts = 0;
        const maxAttempts = 1000;

        while (!assignedColor && attempts < maxAttempts) {
            const hue = (colorIndex * goldenAngle) % 360;
            // Vary saturation and lightness for more variety
            const satVariation = (colorIndex % 3);
            const saturation = 70 + satVariation * 10; // 70%, 80%, 90%
            const lightVariation = Math.floor(colorIndex / 3) % 4;
            const lightness = 45 + lightVariation * 10; // 45%, 55%, 65%, 75%

            const newColor = `hsl(${Math.round(hue)}, ${saturation}%, ${lightness}%)`;

            if (!usedColors.has(newColor)) {
                assignedColor = newColor;
            }
            colorIndex++;
            attempts++;
        }

        // Fallback if somehow still no color (should never happen)
        if (!assignedColor) {
            assignedColor = `hsl(${Math.random() * 360}, 85%, 60%)`;
        }
    }

    // Cache the assignment
    tematikCache.set(category, assignedColor);
    usedColors.add(assignedColor);

    return assignedColor;
}

// Legacy function for backward compatibility - now uses unique color system
function stringToColor(str: string, tematikType: string = 'default'): string {
    return getOrAssignUniqueColor(str, tematikType);
}

// Clear color cache for a specific tematik type (call when switching layers)
export function clearTematikColorCache(tematikType?: string) {
    if (tematikType) {
        categoryColorCache.delete(tematikType);
        usedColorsCache.delete(tematikType);
    } else {
        categoryColorCache.clear();
        usedColorsCache.clear();
    }
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
    // Pass tematik type to ensure unique colors per layer type
    return stringToColor(category, tematik || 'default');
}

interface TematikData {
    [category: string]: Array<{ NOP: string;[key: string]: any }>;
}

// Tematik types that require year parameter
const requiresYear = ['kelas_tanah', 'kelas_bangunan', 'zona_nilai_tanah', 'status_pembayaran', 'ketetapan_per_buku'];

// Opacity for fill (used in both polygon and legend)
export const TEMATIK_FILL_OPACITY = 0.35;

export default function TematikLayer({ desaKode, tematik, visible, onCategoriesChange, onNopClick }: TematikLayerProps) {
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

    // Cleanup function for tematik layers only - more robust version
    const cleanupLayers = useCallback(() => {
        // Clear color cache for this tematik type to allow fresh color assignment
        clearTematikColorCache(tematik);

        // First, clean tracked layers
        geojsonLayersRef.current.forEach(layer => {
            if ((layer as any)._labelMarker && map.hasLayer((layer as any)._labelMarker)) {
                map.removeLayer((layer as any)._labelMarker);
            }
            if (map.hasLayer(layer)) {
                map.removeLayer(layer);
            }
        });
        geojsonLayersRef.current = [];

        // Also scan and remove any stray tematik GeoJSON layers (safety net)
        // This catches any layers that weren't properly tracked
        map.eachLayer((layer: any) => {
            // Check if it's a GeoJSON layer (has feature property) but NOT a TileLayer
            if (layer.feature && !(layer instanceof L.TileLayer)) {
                map.removeLayer(layer);
            }
            // Also check for layers that have _layers (GeoJSON group)
            if (layer._layers && !(layer instanceof L.TileLayer)) {
                const hasGeoJsonFeatures = Object.values(layer._layers).some(
                    (l: any) => l.feature
                );
                if (hasGeoJsonFeatures) {
                    map.removeLayer(layer);
                }
            }
        });

        setData(null);
    }, [map, tematik]);

    // Fetch data function
    const fetchTematikData = useCallback(async (tahun?: string) => {
        setLoading(true);
        setError(null);

        // Clear existing tematik layers only (not all map layers!)
        cleanupLayers();

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

                // Click handler to open NOP info modal with category info
                layer.on('click', () => {
                    if (onNopClick) {
                        onNopClick(nop, category);
                    }
                });

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
    }, [desaKode, tematik, map, cleanupLayers, onNopClick]);

    // Handle visibility and initial fetch
    useEffect(() => {
        // ALWAYS cleanup previous layers first when this effect runs
        // This ensures old tematik layers are removed before showing new ones
        cleanupLayers();

        // Exit early if not visible or missing required data
        if (!visible || !desaKode || !tematik) {
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
        // Always cleanup before fetching new data
        cleanupLayers();
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
