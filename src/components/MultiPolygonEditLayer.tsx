'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-path-drag';

export type EditLayerType = 'nop' | 'blok' | 'bangunan';

interface SelectedPolygon {
    type: EditLayerType;
    id: string | number;
    code: string;
}

interface PolygonData {
    id: number;
    code: string;
    geometry: GeoJSON.Geometry;
    polygon?: L.Polygon;
    originalCoords?: number[][];
}

interface MultiPolygonEditLayerProps {
    selectedPolygons: SelectedPolygon[];
    visible: boolean;
    onSaveAll: (updates: Array<{ type: EditLayerType; id: string | number; code: string; coordinates: number[][] }>) => Promise<void>;
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

export default function MultiPolygonEditLayer({
    selectedPolygons,
    visible,
    onSaveAll,
    onCancel,
}: MultiPolygonEditLayerProps) {
    const map = useMap();
    const polygonsRef = useRef<Map<string, PolygonData>>(new Map());
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loadedCount, setLoadedCount] = useState(0);

    // Shared drag state - using refs so all polygons can access the same state
    const isDraggingRef = useRef(false);
    const dragStartLatLngRef = useRef<L.LatLng | null>(null);
    const draggingPolygonKeyRef = useRef<string | null>(null);

    // Flag to track if cleanup was already done by handleSaveAll
    const isCleanedUpRef = useRef(false);

    const type = selectedPolygons.length > 0 ? selectedPolygons[0].type : 'nop';
    const color = LAYER_COLORS[type];
    const label = LAYER_LABELS[type];

    // Fetch all polygon data
    useEffect(() => {
        if (!visible || selectedPolygons.length === 0) {
            // Skip cleanup if already done by handleSaveAll
            if (isCleanedUpRef.current) {
                isCleanedUpRef.current = false;
                return;
            }
            // Cleanup when not visible or no polygons selected
            polygonsRef.current.forEach(data => {
                if (data.polygon) {
                    try {
                        (data.polygon as any).editing?.disable();
                    } catch (e) { /* ignore */ }
                    try {
                        if (map.hasLayer(data.polygon)) {
                            map.removeLayer(data.polygon);
                        }
                    } catch (e) { /* ignore */ }
                }
            });
            polygonsRef.current.clear();
            setLoadedCount(0);
            return;
        }

        const fetchAllPolygons = async () => {
            setLoading(true);
            setLoadedCount(0);

            // First, cleanup all existing polygons from map before fetching new ones
            // This prevents duplicate polygons when selectedPolygons array changes
            polygonsRef.current.forEach(data => {
                if (data.polygon) {
                    try {
                        (data.polygon as any).editing?.disable();
                    } catch (e) { /* ignore */ }
                    try {
                        if (map.hasLayer(data.polygon)) {
                            map.removeLayer(data.polygon);
                        }
                    } catch (e) { /* ignore */ }
                }
            });
            polygonsRef.current.clear();

            for (const selected of selectedPolygons) {
                try {
                    let url: string;
                    if (selected.type === 'nop') {
                        url = `/api/nops/${encodeURIComponent(String(selected.id))}`;
                    } else if (selected.type === 'blok') {
                        url = `/api/bloks/${selected.id}`;
                    } else {
                        url = `/api/bangunans/${selected.id}`;
                    }

                    const response = await fetch(url);
                    const result = await response.json();

                    if (result.success && result.data) {
                        const feature = result.data;
                        const key = `${selected.type}-${selected.id}`;

                        // Convert GeoJSON to Leaflet polygon
                        const coords = (feature.geometry as GeoJSON.Polygon).coordinates[0];
                        const latLngs = coords.map(([lng, lat]: number[]) => L.latLng(lat, lng));

                        const polygon = L.polygon(latLngs, {
                            color: color,
                            weight: 3,
                            fillOpacity: 0.4,
                            fillColor: color,
                            draggable: true,
                        } as any);

                        polygon.addTo(map);

                        // Enable editing
                        (polygon as any).editing?.enable();

                        // Handle synchronized drag - when one polygon drags, move all others
                        // Using refs so the state is shared across all polygon event handlers
                        polygon.on('dragstart', (e: any) => {
                            isDraggingRef.current = true;
                            dragStartLatLngRef.current = e.target.getCenter();
                            draggingPolygonKeyRef.current = key;
                            // Disable editing on all polygons during drag
                            polygonsRef.current.forEach(data => {
                                if (data.polygon) {
                                    (data.polygon as any).editing?.disable();
                                }
                            });
                        });

                        polygon.on('drag', (e: any) => {
                            if (!isDraggingRef.current || !dragStartLatLngRef.current) return;
                            // Only the dragging polygon should trigger movement of others
                            if (draggingPolygonKeyRef.current !== key) return;

                            const currentLatLng = e.target.getCenter();
                            const deltaLat = currentLatLng.lat - dragStartLatLngRef.current.lat;
                            const deltaLng = currentLatLng.lng - dragStartLatLngRef.current.lng;

                            // Move all OTHER polygons by the same delta
                            polygonsRef.current.forEach((data, otherKey) => {
                                if (otherKey !== key && data.polygon) {
                                    const latLngs = data.polygon.getLatLngs()[0] as L.LatLng[];
                                    const newLatLngs = latLngs.map(ll =>
                                        L.latLng(ll.lat + deltaLat, ll.lng + deltaLng)
                                    );
                                    data.polygon.setLatLngs(newLatLngs);
                                }
                            });

                            // Update drag start for next calculation
                            dragStartLatLngRef.current = currentLatLng;
                        });

                        polygon.on('dragend', () => {
                            isDraggingRef.current = false;
                            dragStartLatLngRef.current = null;
                            draggingPolygonKeyRef.current = null;
                            // Re-enable editing on all polygons after drag with a small delay
                            // This ensures the polygon positions are updated before editing is enabled
                            setTimeout(() => {
                                polygonsRef.current.forEach(data => {
                                    if (data.polygon) {
                                        // Disable then enable to refresh the edit handles positions
                                        try {
                                            (data.polygon as any).editing?.disable();
                                        } catch (e) { /* ignore */ }
                                        try {
                                            (data.polygon as any).editing?.enable();
                                        } catch (e) { /* ignore */ }
                                    }
                                });
                            }, 50);
                        });

                        polygonsRef.current.set(key, {
                            id: feature.properties.id,
                            code: selected.type === 'nop' ? feature.properties.d_nop :
                                selected.type === 'blok' ? feature.properties.d_blok :
                                    feature.properties.d_nop,
                            geometry: feature.geometry,
                            polygon,
                            originalCoords: coords,
                        });

                        setLoadedCount(prev => prev + 1);
                    }
                } catch (error) {
                    console.error(`Error fetching ${selected.type} ${selected.id}:`, error);
                }
            }

            // Fit bounds to all polygons
            if (polygonsRef.current.size > 0) {
                const group = L.featureGroup(
                    Array.from(polygonsRef.current.values())
                        .filter(d => d.polygon)
                        .map(d => d.polygon!)
                );
                map.fitBounds(group.getBounds(), { padding: [50, 50] });
            }

            setLoading(false);
        };

        fetchAllPolygons();

        return () => {
            polygonsRef.current.forEach(data => {
                if (data.polygon) {
                    (data.polygon as any).editing?.disable();
                    map.removeLayer(data.polygon);
                }
            });
            polygonsRef.current.clear();
        };
    }, [visible, selectedPolygons, map, color]);

    // Handle save all
    const handleSaveAll = useCallback(async () => {
        setSaving(true);

        const updates: Array<{ type: EditLayerType; id: string | number; code: string; coordinates: number[][] }> = [];

        selectedPolygons.forEach(selected => {
            const key = `${selected.type}-${selected.id}`;
            const data = polygonsRef.current.get(key);

            if (data?.polygon) {
                const latlngs = data.polygon.getLatLngs()[0] as L.LatLng[];
                const coordinates = latlngs.map(latlng => [latlng.lng, latlng.lat]);
                coordinates.push(coordinates[0]); // Close polygon

                updates.push({
                    type: selected.type,
                    id: selected.id,
                    code: data.code,
                    coordinates,
                });
            }
        });

        // IMPORTANT: Set cleanup flag FIRST to prevent useEffect cleanup from running again
        isCleanedUpRef.current = true;

        // Remove all polygons from map BEFORE saving
        // This prevents old positions from showing when the layer refreshes
        polygonsRef.current.forEach(data => {
            if (data.polygon) {
                try {
                    (data.polygon as any).editing?.disable();
                } catch (e) { /* ignore */ }
                try {
                    if (map.hasLayer(data.polygon)) {
                        map.removeLayer(data.polygon);
                    }
                } catch (e) { /* ignore */ }
            }
        });
        polygonsRef.current.clear();

        try {
            await onSaveAll(updates);
        } catch (error) {
            console.error('Error saving polygons:', error);
        } finally {
            setSaving(false);
        }
    }, [selectedPolygons, onSaveAll, map]);

    // Handle cancel - make sure all polygons are removed from map
    const handleCancel = useCallback(() => {
        // First, disable editing and remove from map
        const polygonsToRemove = Array.from(polygonsRef.current.values());
        polygonsToRemove.forEach(data => {
            if (data.polygon) {
                try {
                    (data.polygon as any).editing?.disable();
                } catch (e) {
                    console.error('Error disabling editing:', e);
                }
                try {
                    if (map.hasLayer(data.polygon)) {
                        map.removeLayer(data.polygon);
                    }
                } catch (e) {
                    console.error('Error removing layer:', e);
                }
            }
        });
        // Clear the ref
        polygonsRef.current.clear();
        // Call parent callback to clear selection state
        onCancel();
    }, [map, onCancel]);

    if (!visible || selectedPolygons.length === 0) return null;

    return (
        <>
            {/* Loading indicator */}
            {loading && (
                <div className="absolute bottom-4 right-52 z-[1000]">
                    <div className="bg-white rounded-lg shadow-lg border border-gray-300 px-4 py-3 flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-gray-700 font-medium text-sm">
                            Memuat {loadedCount}/{selectedPolygons.length} {label}...
                        </span>
                    </div>
                </div>
            )}

            {/* Control buttons */}
            {!loading && (
                <div className="absolute bottom-4 right-52 z-[1000]">
                    <div className="bg-white rounded-lg shadow-lg border border-gray-300 flex overflow-hidden">
                        {/* Layer type indicator with count */}
                        <div
                            className="flex items-center gap-2 px-3 py-3 font-semibold text-white"
                            style={{ backgroundColor: color }}
                        >
                            {label} ({selectedPolygons.length})
                        </div>
                        <button
                            onClick={handleCancel}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-3 text-gray-600 hover:bg-gray-50 transition-all font-medium border-r border-gray-300 disabled:opacity-50"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Batal
                        </button>
                        <button
                            onClick={handleSaveAll}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white hover:bg-emerald-700 transition-all font-medium disabled:opacity-50"
                        >
                            {saving ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Menyimpan...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Simpan Semua
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
