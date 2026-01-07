'use client';

import { useEffect, useRef, useMemo } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.vectorgrid';

// Deklarasi tipe untuk Leaflet.VectorGrid
declare global {
  namespace L {
    namespace vectorGrid {
      function protobuf(url: string, options: any): any;
    }
  }
}

interface MVTTileLayerProps {
  url: string;
  name: string;
  color?: string;
  weight?: number;
  opacity?: number;
  fillOpacity?: number;
  desaKode?: string;
  visible?: boolean;
  editMode?: boolean;
  onNopClick?: (nop: string, luas: string, latlng: L.LatLng) => void;
  onFeatureClick?: (id: number, code: string, latlng: L.LatLng) => void;
  refreshKey?: number;
}

export default function MVTTileLayer({
  url,
  name,
  color = '#ffa500',
  weight = 2,
  opacity = 0.9,
  fillOpacity = 0.3,
  desaKode,
  visible = true,
  editMode = false,
  onNopClick,
  onFeatureClick,
  refreshKey = 0,
}: MVTTileLayerProps) {
  const map = useMap();
  const layerRef = useRef<any>(null);

  // Style untuk vektor tile - dynamic based on layer name
  const vectorTileStyle = useMemo(() => {
    const style = {
      fill: true,
      fillColor: color,
      fillOpacity: fillOpacity,
      color: color,
      opacity: opacity,
      weight: weight,
    };
    // Return style for both nops and bangunans layer names
    return {
      nops: style,
      bangunans: style,
    };
  }, [color, weight, opacity, fillOpacity]);

  useEffect(() => {
    if (!map) return;

    // Cleanup existing layer - clear cache more aggressively
    if (layerRef.current) {
      try {
        // Force redraw to clear any cached tiles
        layerRef.current.redraw();
      } catch (e) { /* ignore */ }
      try {
        map.removeLayer(layerRef.current);
      } catch (e) { /* ignore */ }
      layerRef.current = null;
    }

    // Don't add layer if not visible or no desaKode
    if (!visible || !desaKode) {
      return;
    }

    try {
      const vectorGrid = (L as any).vectorGrid;

      if (!vectorGrid || typeof vectorGrid.protobuf !== 'function') {
        console.error('VectorGrid.protobuf is not available');
        return;
      }

      // Build tile URL with cache-busting parameter using both refreshKey and timestamp
      // This ensures browser fetches fresh tiles after polygon edits
      const cacheKey = `${refreshKey}_${Date.now()}`;
      const tileUrl = `${url}/{z}/{x}/{y}?desaKode=${desaKode}&_t=${cacheKey}`;

      const layer = vectorGrid.protobuf(tileUrl, {
        vectorTileLayerStyles: vectorTileStyle,
        interactive: true,
        maxZoom: 22,
        minZoom: 0,
        // Performance optimizations
        updateWhenIdle: false,       // Update while moving for smoother experience
        updateWhenZooming: true,     // Update during zoom for better responsiveness
        keepBuffer: 4,               // Increased buffer for smoother panning
        pane: 'overlayPane',
        getFeatureId: (f: any) => f.properties?.id || f.id,
      });

      // Click handler
      layer.on('click', (e: any) => {
        if (e.layer && e.layer.properties) {
          const props = e.layer.properties;

          // Call onNopClick for NOP layer (backward compatibility)
          if (onNopClick && props.d_nop) {
            onNopClick(props.d_nop, props.d_luas || '-', e.latlng);
          }

          // Call onFeatureClick for any feature with an id
          if (onFeatureClick && props.id) {
            // For bangunan, use d_nop; for other layers use first code-like property
            const code = props.d_nop || props.d_blok || String(props.id);
            onFeatureClick(props.id, code, e.latlng);
          }
        }
      });

      layer.addTo(map);
      layerRef.current = layer;
      console.log(`Layer ${name} added`, { desaKode });

    } catch (error) {
      console.error('Error creating vector tile layer:', error);
    }

    // Cleanup
    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, url, desaKode, visible, vectorTileStyle, name, editMode, onNopClick, onFeatureClick, refreshKey]);

  return null;
}



