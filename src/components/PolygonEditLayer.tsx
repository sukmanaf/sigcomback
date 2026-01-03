'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';

export type EditLayerType = 'nop' | 'blok' | 'bangunan';

interface PolygonData {
    id: number;
    code: string; // d_nop, d_blok, or d_nop (for bangunan)
    images?: string[];
    geometry: GeoJSON.Geometry;
}

interface PolygonEditLayerProps {
    type: EditLayerType;
    id: string | number; // d_nop for NOP, id for Blok/Bangunan
    visible: boolean;
    onSaveClick: (type: EditLayerType, id: string | number, coordinates: number[][], code: string, existingImages?: string[]) => void;
    onDelete: (type: EditLayerType, id: string | number, code: string) => void;
    onCancel: () => void;
}

// Colors for different layer types
const LAYER_COLORS: Record<EditLayerType, string> = {
    nop: '#FF6B00',
    blok: '#FF00FF',
    bangunan: '#FF0000',
};

// Labels for different layer types
const LAYER_LABELS: Record<EditLayerType, string> = {
    nop: 'NOP',
    blok: 'Blok',
    bangunan: 'Bangunan',
};

export default function PolygonEditLayer({
    type,
    id,
    visible,
    onSaveClick,
    onDelete,
    onCancel,
}: PolygonEditLayerProps) {
    const map = useMap();
    const polygonRef = useRef<L.Polygon | null>(null);
    const [polygonData, setPolygonData] = useState<PolygonData | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);

    const color = LAYER_COLORS[type];
    const label = LAYER_LABELS[type];

    // Fetch polygon data based on type
    useEffect(() => {
        if (!visible || !id) {
            // Cleanup when hidden
            if (polygonRef.current) {
                map.removeLayer(polygonRef.current);
                polygonRef.current = null;
            }
            setPolygonData(null);
            setIsEditing(false);
            return;
        }

        const fetchPolygonData = async () => {
            setLoading(true);
            try {
                let url: string;
                if (type === 'nop') {
                    url = `/api/nops/${encodeURIComponent(String(id))}`;
                } else if (type === 'blok') {
                    url = `/api/bloks/${id}`;
                } else {
                    url = `/api/bangunans/${id}`;
                }

                const response = await fetch(url);
                const result = await response.json();

                if (result.success && result.data) {
                    const feature = result.data;
                    setPolygonData({
                        id: feature.properties.id,
                        code: type === 'nop' ? feature.properties.d_nop :
                            type === 'blok' ? feature.properties.d_blok :
                                feature.properties.d_nop,
                        images: feature.properties.images || [],
                        geometry: feature.geometry,
                    });
                }
            } catch (error) {
                console.error(`Error fetching ${type} data:`, error);
            } finally {
                setLoading(false);
            }
        };

        fetchPolygonData();
    }, [visible, id, type, map]);

    // Create and display polygon
    useEffect(() => {
        if (!polygonData || !visible) return;

        // Remove existing polygon
        if (polygonRef.current) {
            map.removeLayer(polygonRef.current);
        }

        // Convert GeoJSON to Leaflet polygon
        const coords = (polygonData.geometry as GeoJSON.Polygon).coordinates[0];
        const latLngs = coords.map(([lng, lat]) => L.latLng(lat, lng));

        const polygon = L.polygon(latLngs, {
            color: color,
            weight: 3,
            fillOpacity: 0.3,
            fillColor: color,
        });

        polygon.addTo(map);
        polygonRef.current = polygon;

        // Fit bounds to polygon
        map.fitBounds(polygon.getBounds(), { padding: [50, 50] });

        // Enable editing immediately (leaflet-draw adds editing to polygon)
        (polygon as any).editing?.enable();
        setIsEditing(true);

        return () => {
            if (polygonRef.current) {
                (polygonRef.current as any).editing?.disable();
                map.removeLayer(polygonRef.current);
                polygonRef.current = null;
            }
        };
    }, [polygonData, visible, map, color]);

    // Handle save button click
    const handleSave = useCallback(() => {
        if (!polygonRef.current || !polygonData) return;

        // Get updated coordinates
        const latlngs = polygonRef.current.getLatLngs()[0] as L.LatLng[];
        const coordinates = latlngs.map(latlng => [latlng.lng, latlng.lat]);
        // Close the polygon
        coordinates.push(coordinates[0]);

        // Disable editing
        (polygonRef.current as any).editing?.disable();
        setIsEditing(false);

        // Call parent callback
        onSaveClick(type, type === 'nop' ? polygonData.code : polygonData.id, coordinates, polygonData.code, polygonData.images);
    }, [polygonData, onSaveClick, type]);

    // Handle cancel
    const handleCancel = useCallback(() => {
        if (polygonRef.current) {
            (polygonRef.current as any).editing?.disable();
            map.removeLayer(polygonRef.current);
            polygonRef.current = null;
        }
        setIsEditing(false);
        setPolygonData(null);
        onCancel();
    }, [map, onCancel]);

    // Handle delete
    const handleDelete = useCallback(() => {
        if (!polygonData) return;

        if (confirm(`Apakah Anda yakin ingin menghapus ${label} ${polygonData.code}? Tindakan ini tidak dapat dibatalkan.`)) {
            // Clean up polygon
            if (polygonRef.current) {
                (polygonRef.current as any).editing?.disable();
                map.removeLayer(polygonRef.current);
                polygonRef.current = null;
            }
            setIsEditing(false);
            setPolygonData(null);
            onDelete(type, type === 'nop' ? polygonData.code : polygonData.id, polygonData.code);
        }
    }, [polygonData, map, onDelete, type, label]);

    if (!visible) return null;

    return (
        <>
            {/* Loading indicator */}
            {loading && (
                <div className="absolute bottom-4 right-52 z-[1000]">
                    <div className="bg-white rounded-lg shadow-lg border border-gray-300 px-4 py-3 flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-gray-700 font-medium text-sm">Memuat {label}...</span>
                    </div>
                </div>
            )}

            {/* Batal / Hapus / Simpan Buttons - Next to basemap selector, same height */}
            {isEditing && !loading && (
                <div className="absolute bottom-4 right-52 z-[1000]">
                    <div className="bg-white rounded-lg shadow-lg border border-gray-300 flex overflow-hidden">
                        {/* Layer type indicator */}
                        <div
                            className="flex items-center gap-2 px-3 py-3 font-semibold text-white"
                            style={{ backgroundColor: color }}
                        >
                            {label}
                        </div>
                        <button
                            onClick={handleCancel}
                            className="flex items-center gap-2 px-4 py-3 text-gray-600 hover:bg-gray-50 transition-all font-medium border-r border-gray-300"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Batal
                        </button>
                        <button
                            onClick={handleDelete}
                            className="flex items-center gap-2 px-4 py-3 text-red-600 hover:bg-red-50 transition-all font-medium border-r border-gray-300"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Hapus
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white hover:bg-emerald-700 transition-all font-medium"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Simpan
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
