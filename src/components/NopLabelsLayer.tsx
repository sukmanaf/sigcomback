'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface NopLabelsLayerProps {
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

export default function NopLabelsLayer({
  desaKode,
  visible = true,
  minZoom = 20
}: NopLabelsLayerProps) {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup | null>(null);
  const labelsDataRef = useRef<LabelData[]>([]);
  const renderedLabelsRef = useRef<Map<number, L.Marker>>(new Map());
  const abortRef = useRef<AbortController | null>(null);

  // Add only new labels that come into view (incremental)
  const updateVisibleLabels = useCallback(() => {
    if (!map || !layerRef.current) return;

    const zoom = map.getZoom();

    // Hide all labels if zoom level too low
    if (zoom < minZoom) {
      // Remove all rendered labels
      renderedLabelsRef.current.forEach((marker) => {
        layerRef.current?.removeLayer(marker);
      });
      renderedLabelsRef.current.clear();
      return;
    }

    const bounds = map.getBounds();

    // Add labels that are in view and not yet rendered
    labelsDataRef.current.forEach((data) => {
      const isInView = data.centroid_lat && data.centroid_lng &&
        bounds.contains([data.centroid_lat, data.centroid_lng]);
      const isRendered = renderedLabelsRef.current.has(data.id);

      if (isInView && !isRendered) {
        // Add new label
        const label = L.marker([data.centroid_lat, data.centroid_lng], {
          icon: L.divIcon({
            className: 'nop-label',
            html: `<div style="
              background: rgba(26, 35, 126, 0.85);
              color: white;
              padding: 2px 5px;
              border-radius: 3px;
              font-size: 10px;
              font-weight: bold;
              text-align: center;
              white-space: nowrap;
              pointer-events: none;
              border: 1px solid rgba(255,255,255,0.6);
            ">${data.view_nop}</div>`,
            iconSize: [35, 14],
            iconAnchor: [17, 7],
          }),
          interactive: false,
        });
        layerRef.current?.addLayer(label);
        renderedLabelsRef.current.set(data.id, label);
      }
    });
  }, [map, minZoom]);

  useEffect(() => {
    if (!map) return;

    // Cleanup
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    labelsDataRef.current = [];
    renderedLabelsRef.current.clear();

    if (abortRef.current) {
      abortRef.current.abort();
    }

    if (!visible || !desaKode) {
      return;
    }

    // Create layer group
    const labelGroup = L.layerGroup();
    layerRef.current = labelGroup;
    labelGroup.addTo(map);

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
          console.log(`Labels loaded: ${labelsDataRef.current.length}`);
          // Initial render after data loaded
          updateVisibleLabels();
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Error loading labels:', error);
        }
      }
    };

    fetchLabels();

    // Update labels on zoom (show/hide based on minZoom)
    const handleZoomEnd = () => updateVisibleLabels();
    // Update labels on pan (add new visible labels)
    const handleMoveEnd = () => updateVisibleLabels();

    map.on('zoomend', handleZoomEnd);
    map.on('moveend', handleMoveEnd);

    return () => {
      if (abortRef.current) abortRef.current.abort();
      map.off('zoomend', handleZoomEnd);
      map.off('moveend', handleMoveEnd);
      renderedLabelsRef.current.clear();
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, desaKode, visible, updateVisibleLabels]);

  return null;
}

