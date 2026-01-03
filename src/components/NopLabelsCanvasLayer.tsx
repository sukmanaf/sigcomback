'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface NopLabelsCanvasLayerProps {
    desaKode?: string;
    visible?: boolean;
    minZoom?: number;
}

interface LabelData {
    id: number;
    view_nop: string;
    centroid_lat: number;
    centroid_lng: number;
}

export default function NopLabelsCanvasLayer({
    desaKode,
    visible = true,
    minZoom = 18
}: NopLabelsCanvasLayerProps) {
    const map = useMap();
    const canvasLayerRef = useRef<L.Layer | null>(null);
    const labelsDataRef = useRef<LabelData[]>([]);
    const abortRef = useRef<AbortController | null>(null);

    // Create and update canvas layer
    const createCanvasLayer = useCallback(() => {
        if (!map || labelsDataRef.current.length === 0) return null;

        // Custom canvas layer class
        const CanvasLabelsLayer = L.Layer.extend({
            onAdd: function (map: L.Map) {
                this._map = map;

                // Create canvas
                const pane = map.getPane('overlayPane');
                this._canvas = L.DomUtil.create('canvas', 'leaflet-canvas-labels');
                pane?.appendChild(this._canvas);

                // Set canvas size
                const size = map.getSize();
                this._canvas.width = size.x;
                this._canvas.height = size.y;
                this._canvas.style.position = 'absolute';
                this._canvas.style.pointerEvents = 'none';

                // Initial draw
                this._draw();

                // Update on map events
                map.on('moveend', this._draw, this);
                map.on('zoomend', this._draw, this);
                map.on('resize', this._resize, this);
            },

            onRemove: function (map: L.Map) {
                map.off('moveend', this._draw, this);
                map.off('zoomend', this._draw, this);
                map.off('resize', this._resize, this);
                if (this._canvas && this._canvas.parentNode) {
                    this._canvas.parentNode.removeChild(this._canvas);
                }
            },

            _resize: function () {
                const size = this._map.getSize();
                this._canvas.width = size.x;
                this._canvas.height = size.y;
                this._draw();
            },

            _draw: function () {
                if (!this._canvas) return;

                const ctx = this._canvas.getContext('2d');
                if (!ctx) return;

                // Clear canvas
                ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

                const zoom = this._map.getZoom();
                console.log('Current zoom level:', zoom);
                if (zoom < minZoom) return;

                // Position canvas
                const topLeft = this._map.containerPointToLayerPoint([0, 0]);
                L.DomUtil.setPosition(this._canvas, topLeft);

                const bounds = this._map.getBounds();

                // Zoom-based filtering: show fewer labels at lower zoom levels
                // z18: show every 4th label, z19: every 2nd, z20+: all labels
                let skipFactor = 1;
                if (zoom === 18) {
                    skipFactor = 4;
                } else if (zoom === 19) {
                    skipFactor = 2;
                }

                // Set improved font style - larger and bolder
                ctx.font = 'bold 12px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Draw labels with filtering
                labelsDataRef.current.forEach((data, index) => {
                    // Skip labels based on zoom level
                    if (index % skipFactor !== 0) return;

                    if (!data.centroid_lat || !data.centroid_lng) return;
                    if (!bounds.contains([data.centroid_lat, data.centroid_lng])) return;

                    const point = this._map.latLngToContainerPoint([data.centroid_lat, data.centroid_lng]);
                    const text = data.view_nop;

                    // Draw text with stroke for readability (no background)
                    // Draw black outline/stroke first
                    ctx.strokeStyle = '#000000';
                    ctx.lineWidth = 3;
                    ctx.lineJoin = 'round';
                    ctx.strokeText(text, point.x, point.y);

                    // Draw white text on top
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillText(text, point.x, point.y);
                });
            }
        });

        return new CanvasLabelsLayer();
    }, [map, minZoom]);

    useEffect(() => {
        if (!map) return;

        // Cleanup
        if (canvasLayerRef.current) {
            map.removeLayer(canvasLayerRef.current);
            canvasLayerRef.current = null;
        }
        labelsDataRef.current = [];

        if (abortRef.current) {
            abortRef.current.abort();
        }

        if (!visible || !desaKode) {
            return;
        }

        // Fetch labels
        const fetchLabels = async () => {
            abortRef.current = new AbortController();
            try {
                const response = await fetch(
                    `/api/tiles/nops/labels?desaKode=${desaKode}`,
                    { signal: abortRef.current.signal }
                );
                if (response.ok) {
                    const data = await response.json();
                    labelsDataRef.current = data.labels || [];
                    console.log(`Canvas labels loaded: ${labelsDataRef.current.length}`);

                    // Create and add canvas layer
                    const layer = createCanvasLayer();
                    if (layer) {
                        layer.addTo(map);
                        canvasLayerRef.current = layer;
                    }
                }
            } catch (error: any) {
                if (error.name !== 'AbortError') {
                    console.error('Error loading labels:', error);
                }
            }
        };

        fetchLabels();

        return () => {
            if (abortRef.current) abortRef.current.abort();
            if (canvasLayerRef.current) {
                map.removeLayer(canvasLayerRef.current);
                canvasLayerRef.current = null;
            }
        };
    }, [map, desaKode, visible, createCanvasLayer]);

    return null;
}
