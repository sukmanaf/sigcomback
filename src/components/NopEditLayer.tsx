'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';

interface NopData {
    id: number;
    d_nop: string;
    d_luas: string;
    images: string[];
    geometry: GeoJSON.Geometry;
}

interface NopEditLayerProps {
    nop: string;
    visible: boolean;
    onSaveClick: (nop: string, coordinates: number[][], existingImages: string[]) => void;
    onDelete: (nop: string) => void;
    onCancel: () => void;
}

export default function NopEditLayer({
    nop,
    visible,
    onSaveClick,
    onDelete,
    onCancel,
}: NopEditLayerProps) {
    const map = useMap();
    const polygonRef = useRef<L.Polygon | null>(null);
    const editHandlerRef = useRef<any>(null);
    const [nopData, setNopData] = useState<NopData | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);

    // Fetch NOP data
    useEffect(() => {
        if (!visible || !nop) {
            // Cleanup when hidden
            if (polygonRef.current) {
                map.removeLayer(polygonRef.current);
                polygonRef.current = null;
            }
            setNopData(null);
            setIsEditing(false);
            return;
        }

        const fetchNopData = async () => {
            setLoading(true);
            try {
                const response = await fetch(`/api/nops/${encodeURIComponent(nop)}`);
                const result = await response.json();

                if (result.success && result.data) {
                    const feature = result.data;
                    setNopData({
                        id: feature.properties.id,
                        d_nop: feature.properties.d_nop,
                        d_luas: feature.properties.d_luas,
                        images: feature.properties.images || [],
                        geometry: feature.geometry,
                    });
                }
            } catch (error) {
                console.error('Error fetching NOP data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchNopData();
    }, [visible, nop, map]);

    // Create and display polygon
    useEffect(() => {
        if (!nopData || !visible) return;

        // Remove existing polygon
        if (polygonRef.current) {
            map.removeLayer(polygonRef.current);
        }

        // Convert GeoJSON to Leaflet polygon
        const coords = (nopData.geometry as GeoJSON.Polygon).coordinates[0];
        const latLngs = coords.map(([lng, lat]) => L.latLng(lat, lng));

        const polygon = L.polygon(latLngs, {
            color: '#FF6B00',
            weight: 3,
            fillOpacity: 0.3,
            fillColor: '#FF6B00',
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
    }, [nopData, visible, map]);

    // Handle save button click
    const handleSave = useCallback(() => {
        if (!polygonRef.current || !nopData) return;

        // Get updated coordinates
        const latlngs = polygonRef.current.getLatLngs()[0] as L.LatLng[];
        const coordinates = latlngs.map(latlng => [latlng.lng, latlng.lat]);
        // Close the polygon
        coordinates.push(coordinates[0]);

        // Disable editing
        (polygonRef.current as any).editing?.disable();
        setIsEditing(false);

        // Call parent callback
        onSaveClick(nopData.d_nop, coordinates, nopData.images);
    }, [nopData, onSaveClick]);

    // Handle cancel
    const handleCancel = useCallback(() => {
        if (polygonRef.current) {
            (polygonRef.current as any).editing?.disable();
            map.removeLayer(polygonRef.current);
            polygonRef.current = null;
        }
        setIsEditing(false);
        setNopData(null);
        onCancel();
    }, [map, onCancel]);

    // Handle delete
    const handleDelete = useCallback(() => {
        if (!nopData) return;

        // Confirm deletion
        if (confirm(`Apakah Anda yakin ingin menghapus NOP ${nopData.d_nop}? Tindakan ini tidak dapat dibatalkan.`)) {
            // Clean up polygon
            if (polygonRef.current) {
                (polygonRef.current as any).editing?.disable();
                map.removeLayer(polygonRef.current);
                polygonRef.current = null;
            }
            setIsEditing(false);
            setNopData(null);
            onDelete(nopData.d_nop);
        }
    }, [nopData, map, onDelete]);

    if (!visible) return null;

    return (
        <>
            {/* Loading indicator */}
            {loading && (
                <div className="absolute bottom-4 right-52 z-[1000]">
                    <div className="bg-white rounded-lg shadow-lg border border-gray-300 px-4 py-3 flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-gray-700 font-medium text-sm">Memuat...</span>
                    </div>
                </div>
            )}

            {/* Batal / Hapus / Simpan Buttons - Next to basemap selector, same height */}
            {isEditing && !loading && (
                <div className="absolute bottom-4 right-52 z-[1000]">
                    <div className="bg-white rounded-lg shadow-lg border border-gray-300 flex overflow-hidden">
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
