'use client';

import { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';

interface DrawingToolsProps {
    enabled: boolean;
    onPolygonCreated: (coordinates: number[][]) => void;
}

export default function DrawingTools({ enabled, onPolygonCreated }: DrawingToolsProps) {
    const map = useMap();
    const drawControlRef = useRef<L.Control.Draw | null>(null);
    const drawnItemsRef = useRef<L.FeatureGroup | null>(null);

    useEffect(() => {
        if (!map) return;

        // Create feature group for drawn items
        if (!drawnItemsRef.current) {
            drawnItemsRef.current = new L.FeatureGroup();
            map.addLayer(drawnItemsRef.current);
        }

        if (enabled) {
            // Add draw control
            if (!drawControlRef.current) {
                const drawControl = new L.Control.Draw({
                    position: 'topleft',
                    draw: {
                        polygon: {
                            allowIntersection: false,
                            showArea: true,
                            shapeOptions: {
                                color: '#00FFFF',
                                weight: 2,
                                fillOpacity: 0.3,
                            },
                        },
                        polyline: false,
                        circle: false,
                        rectangle: false,
                        marker: false,
                        circlemarker: false,
                    },
                    edit: {
                        featureGroup: drawnItemsRef.current!,
                        remove: true,
                    },
                });

                drawControlRef.current = drawControl;
                map.addControl(drawControl);

                // Handle polygon created event
                const handleCreated = (e: any) => {
                    const layer = e.layer;
                    drawnItemsRef.current?.addLayer(layer);

                    // Get coordinates
                    const latlngs = layer.getLatLngs()[0];
                    const coordinates = latlngs.map((latlng: L.LatLng) => [latlng.lng, latlng.lat]);
                    // Close the polygon
                    coordinates.push(coordinates[0]);

                    onPolygonCreated(coordinates);

                    // Remove the drawn layer (will be saved to DB)
                    setTimeout(() => {
                        drawnItemsRef.current?.removeLayer(layer);
                    }, 100);
                };

                map.on(L.Draw.Event.CREATED, handleCreated);

                return () => {
                    map.off(L.Draw.Event.CREATED, handleCreated);
                };
            }
        } else {
            // Remove draw control
            if (drawControlRef.current) {
                map.removeControl(drawControlRef.current);
                drawControlRef.current = null;
            }
        }
    }, [map, enabled, onPolygonCreated]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (drawControlRef.current && map) {
                map.removeControl(drawControlRef.current);
            }
            if (drawnItemsRef.current && map) {
                map.removeLayer(drawnItemsRef.current);
            }
        };
    }, [map]);

    return null;
}
