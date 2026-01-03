'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface GeoJsonTileLayerProps {
  url: string;
  name: string;
  color?: string;
  weight?: number;
  opacity?: number;
  fillOpacity?: number;
  desaKode?: string;
  visible?: boolean;
  onFeatureClick?: (feature: any) => void;
}

export default function GeoJsonTileLayer({
  url,
  name,
  color = '#3388ff',
  weight = 2,
  opacity = 0.8,
  fillOpacity = 0.2,
  desaKode,
  visible = true,
  onFeatureClick,
}: GeoJsonTileLayerProps) {
  const map = useMap();
  const layerRef = useRef<L.FeatureGroup | null>(null);
  const tileCache = useRef<Map<string, any>>(new Map()); // Client-side cache

  useEffect(() => {
    if (!map) return;

    console.log(`[GeoJsonTileLayer ${name}] visible=${visible}, desaKode=${desaKode}`);

    // If not visible or requires filter but no filter provided, don't load
    if (!visible) {
      // Clean up if layer was previously added
      if (layerRef.current && map.hasLayer(layerRef.current)) {
        map.removeLayer(layerRef.current);
      }
      return;
    }

    // For layers that require filter (not Desa), check if desaKode exists
    if (!desaKode && name !== 'Desa') {
      console.log(`[GeoJsonTileLayer ${name}] Skipping - no desaKode`);
      if (layerRef.current && map.hasLayer(layerRef.current)) {
        map.removeLayer(layerRef.current);
      }
      return;
    }

    // Create feature group for this layer
    const featureGroup = L.featureGroup();
    layerRef.current = featureGroup;

    // Limit concurrent requests to prevent overwhelming the server
    const maxConcurrentRequests = 3;
    let activeRequests = 0;

    const loadTiles = () => {
      const bounds = map.getBounds();
      const zoom = map.getZoom();

      // Skip loading if zoom is too low (too many tiles) - but allow for Desa layer
      if (zoom < 10 && name !== 'Desa') {
        featureGroup.clearLayers();
        return;
      }

      // Clear previous tiles
      featureGroup.clearLayers();

      // Calculate tile coordinates - only load visible tiles
      const maxTile = Math.pow(2, zoom);
      const nw = map.project(bounds.getNorthWest(), zoom);
      const se = map.project(bounds.getSouthEast(), zoom);
      const tileSize = 256;

      const minTx = Math.max(0, Math.floor(nw.x / tileSize));
      const maxTx = Math.min(maxTile - 1, Math.ceil(se.x / tileSize));
      const minTy = Math.max(0, Math.floor(nw.y / tileSize));
      const maxTy = Math.min(maxTile - 1, Math.ceil(se.y / tileSize));

      // Limit tiles to prevent overwhelming the browser
      const maxTilesToLoad = 16; // Max 16 tiles at once
      let tilesLoaded = 0;

      for (let tx = minTx; tx <= maxTx && tilesLoaded < maxTilesToLoad; tx++) {
        for (let ty = minTy; ty <= maxTy && tilesLoaded < maxTilesToLoad; ty++) {
          fetchTile(tx, ty, zoom, featureGroup);
          tilesLoaded++;
        }
      }
    };

    const renderTile = (geojson: any, group: L.FeatureGroup) => {
      if (geojson.features && geojson.features.length > 0) {
        L.geoJSON(geojson, {
          style: {
            color,
            weight,
            opacity,
            fillOpacity,
          },
          onEachFeature: (feature, layer) => {
            const props = feature.properties;
            let popupContent = '<div class="text-sm">';
            Object.entries(props).forEach(([key, value]) => {
              popupContent += `<p><strong>${key}:</strong> ${value}</p>`;
            });
            popupContent += '</div>';
            layer.bindPopup(popupContent);


            // Add click handler for desa layer
            if (name === 'Desa' && onFeatureClick) {
              layer.on('click', () => {
                onFeatureClick(feature);
              });
            }
          },
        }).addTo(group);
      }
    };

    const fetchTile = async (x: number, y: number, z: number, group: L.FeatureGroup) => {
      try {
        // Wait if too many concurrent requests
        while (activeRequests >= maxConcurrentRequests) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        activeRequests++;
        const cacheKey = `${url}:${z}:${x}:${y}:${desaKode || ''}`;

        // Check cache first
        if (tileCache.current.has(cacheKey)) {
          const geojson = tileCache.current.get(cacheKey);
          renderTile(geojson, group);
          activeRequests--;
          return;
        }

        let tileUrl = `${url}?z=${z}&x=${x}&y=${y}`;
        if (desaKode) {
          tileUrl += `&desaKode=${desaKode}`;
        }
        const response = await fetch(tileUrl);
        const geojson = await response.json();

        // Store in cache
        tileCache.current.set(cacheKey, geojson);
        renderTile(geojson, group);
      } catch (error) {
        console.error(`Error loading tile ${z}/${x}/${y}:`, error);
      } finally {
        activeRequests--;
      }
    };

    const getTileBounds = (x: number, y: number, z: number): L.LatLngBounds => {
      const n = Math.pow(2, z);
      const lonMin = (x / n) * 360 - 180;
      const lonMax = ((x + 1) / n) * 360 - 180;
      const latMax = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * (180 / Math.PI);
      const latMin = Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n))) * (180 / Math.PI);
      return L.latLngBounds([latMin, lonMin], [latMax, lonMax]);
    };

    // Add to map
    featureGroup.addTo(map);

    // Debounce tile loading to prevent excessive requests
    let loadTimeout: NodeJS.Timeout;
    const debouncedLoadTiles = () => {
      clearTimeout(loadTimeout);
      loadTimeout = setTimeout(() => {
        loadTiles();
      }, 300); // Wait 300ms after pan/zoom ends before loading
    };

    // Load tiles on mount and on map change
    loadTiles();
    map.on('moveend', debouncedLoadTiles);

    return () => {
      clearTimeout(loadTimeout);
      map.off('moveend', debouncedLoadTiles);
      map.removeLayer(featureGroup);
    };
  }, [map, url, color, weight, opacity, fillOpacity, desaKode, visible, name, onFeatureClick]);

  return null;
}
