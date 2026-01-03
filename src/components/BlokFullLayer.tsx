'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface BlokFullLayerProps {
    desaKode?: string;
    visible?: boolean;
    color?: string;
    weight?: number;
    opacity?: number;
    fillOpacity?: number;
    editMode?: boolean;
    onFeatureClick?: (id: number, code: string, latlng: L.LatLng) => void;
    refreshKey?: number;
}

export default function BlokFullLayer({
    desaKode,
    visible = true,
    color = '#FF00FF',
    weight = 2,
    opacity = 1,
    fillOpacity = 0.1,
    editMode = false,
    onFeatureClick,
    refreshKey = 0,
}: BlokFullLayerProps) {
    const map = useMap();
    const layerRef = useRef<L.GeoJSON | null>(null);
    const labelsLayerRef = useRef<L.LayerGroup | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (!map) return;

        // Cleanup previous layers
        if (layerRef.current) {
            map.removeLayer(layerRef.current);
            layerRef.current = null;
        }
        if (labelsLayerRef.current) {
            map.removeLayer(labelsLayerRef.current);
            labelsLayerRef.current = null;
        }

        if (abortRef.current) {
            abortRef.current.abort();
        }

        // Don't load if not visible or no desaKode
        if (!visible || !desaKode) {
            return;
        }

        const loadBloks = async () => {
            abortRef.current = new AbortController();

            try {
                console.log(`[BlokFullLayer] Loading bloks for desaKode=${desaKode}`);

                const response = await fetch(`/api/bloks?desaKode=${desaKode}&_t=${refreshKey}`, {
                    signal: abortRef.current.signal,
                    cache: 'no-store',
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch bloks');
                }

                const geojson = await response.json();
                console.log(`[BlokFullLayer] Loaded ${geojson.features?.length || 0} bloks`);

                if (geojson.features && geojson.features.length > 0) {
                    // Create labels layer group
                    const labelsLayer = L.layerGroup();

                    const layer = L.geoJSON(geojson, {
                        style: {
                            color,
                            weight,
                            opacity,
                            fillOpacity,
                            fillColor: color,
                        },
                        onEachFeature: (feature, featureLayer) => {
                            const props = feature.properties;

                            // Get blok label from last 3 digits (the actual blok number)
                            const blokLabel = props.d_blok ? props.d_blok.slice(-3) : '';

                            // Click handler for edit mode
                            if (editMode && onFeatureClick) {
                                featureLayer.on('click', (e: L.LeafletMouseEvent) => {
                                    onFeatureClick(props.id || feature.id, props.d_blok || '', e.latlng);
                                });
                            } else {
                                // Bind popup when not in edit mode
                                featureLayer.bindPopup(`
                    <div class="text-sm">
                      <p><strong>Kode Blok:</strong> ${props.d_blok}</p>
                      <p><strong>No Blok:</strong> ${blokLabel}</p>
                    </div>
                  `);
                            }

                            // Add label at centroid
                            if (feature.geometry && blokLabel) {
                                try {
                                    const bounds = (featureLayer as L.Polygon).getBounds();
                                    const center = bounds.getCenter();

                                    const labelMarker = L.marker(center, {
                                        icon: L.divIcon({
                                            className: 'blok-label',
                                            html: `<div style="
                        color: #FF00FF;
                        font-size: 10px;
                        font-weight: bold;
                        white-space: nowrap;
                        text-shadow: -1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white, 1px 1px 0 white;
                      ">${blokLabel}</div>`,
                                            iconSize: [0, 0],
                                            iconAnchor: [10, 5],
                                        }),
                                        interactive: false,
                                    });

                                    labelsLayer.addLayer(labelMarker);
                                } catch (e) {
                                    // Ignore errors for invalid geometries
                                }
                            }
                        },
                    });

                    layer.addTo(map);
                    labelsLayer.addTo(map);
                    layerRef.current = layer;
                    labelsLayerRef.current = labelsLayer;
                }
            } catch (error: any) {
                if (error.name !== 'AbortError') {
                    console.error('[BlokFullLayer] Error loading bloks:', error);
                }
            }
        };

        loadBloks();

        return () => {
            if (abortRef.current) {
                abortRef.current.abort();
            }
            if (layerRef.current) {
                map.removeLayer(layerRef.current);
                layerRef.current = null;
            }
            if (labelsLayerRef.current) {
                map.removeLayer(labelsLayerRef.current);
                labelsLayerRef.current = null;
            }
        };
    }, [map, desaKode, visible, color, weight, opacity, fillOpacity, editMode, onFeatureClick, refreshKey]);

    return null;
}
