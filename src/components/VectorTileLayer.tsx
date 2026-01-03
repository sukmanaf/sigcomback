'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface VectorTileLayerProps {
  url: string;
  name: string;
  color?: string;
  weight?: number;
  opacity?: number;
  fillOpacity?: number;
  desaKode?: string;
  visible?: boolean;
  labelField?: string;
  labelExtractor?: (value: string) => string;
}

export default function VectorTileLayer({
  url,
  name,
  color = '#3388ff',
  weight = 2,
  opacity = 0.8,
  fillOpacity = 0.2,
  desaKode,
  visible = true,
  labelField,
  labelExtractor,
}: VectorTileLayerProps) {
  const map = useMap();
  const layerRef = useRef<L.FeatureGroup | null>(null);
  const tileCache = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    if (!map) return;

    // If not visible or requires filter but no filter provided, don't load
    if (!visible || (!desaKode && name !== 'Desa')) {
      if (layerRef.current && map.hasLayer(layerRef.current)) {
        map.removeLayer(layerRef.current);
      }
      return;
    }

    // Create feature group for this layer
    const featureGroup = L.featureGroup();
    layerRef.current = featureGroup;

    // Limit concurrent requests
    const maxConcurrentRequests = 3;
    let activeRequests = 0;

    const loadTiles = () => {
      const bounds = map.getBounds();
      const zoom = map.getZoom();

      // Skip loading if zoom is too low
      if (zoom < 10 && name !== 'Desa') {
        featureGroup.clearLayers();
        return;
      }

      featureGroup.clearLayers();

      // Calculate tile coordinates
      const maxTile = Math.pow(2, zoom);
      const nw = map.project(bounds.getNorthWest(), zoom);
      const se = map.project(bounds.getSouthEast(), zoom);
      const tileSize = 256;

      const minTx = Math.max(0, Math.floor(nw.x / tileSize));
      const maxTx = Math.min(maxTile - 1, Math.ceil(se.x / tileSize));
      const minTy = Math.max(0, Math.floor(nw.y / tileSize));
      const maxTy = Math.min(maxTile - 1, Math.ceil(se.y / tileSize));

      const maxTilesToLoad = 16;
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
            
            // Create popup content
            let popupContent = '<div class="text-sm">';
            Object.entries(props).forEach(([key, value]) => {
              popupContent += `<p><strong>${key}:</strong> ${value}</p>`;
            });
            popupContent += '</div>';
            layer.bindPopup(popupContent);

            // Add label if labelField is provided
            if (labelField && props[labelField] && feature.geometry.type === 'Polygon') {
              const labelValue = labelExtractor 
                ? labelExtractor(props[labelField])
                : props[labelField];

              const coordinates = feature.geometry.coordinates[0];
              const center = L.latLngBounds(
                coordinates.map((coord: any) => [coord[1], coord[0]])
              ).getCenter();

              const label = L.marker(center, {
                icon: L.divIcon({
                  className: `${name.toLowerCase()}-label`,
                  html: `<div style="
                    background: rgba(51, 136, 255, 0.8);
                    color: white;
                    padding: 3px 6px;
                    border-radius: 3px;
                    font-size: 11px;
                    font-weight: bold;
                    text-align: center;
                    white-space: nowrap;
                    pointer-events: none;
                  ">${labelValue}</div>`,
                  iconSize: [60, 18],
                  iconAnchor: [30, 9],
                }),
              }).addTo(group);
            }
          },
        }).addTo(group);
      }
    };

    const fetchTile = async (x: number, y: number, z: number, group: L.FeatureGroup) => {
      try {
        while (activeRequests >= maxConcurrentRequests) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        activeRequests++;
        const cacheKey = `${url}:${z}:${x}:${y}:${desaKode || ''}`;

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

        tileCache.current.set(cacheKey, geojson);
        renderTile(geojson, group);
      } catch (error) {
        console.error(`Error loading tile ${z}/${x}/${y}:`, error);
      } finally {
        activeRequests--;
      }
    };

    featureGroup.addTo(map);

    let loadTimeout: NodeJS.Timeout;
    const debouncedLoadTiles = () => {
      clearTimeout(loadTimeout);
      loadTimeout = setTimeout(() => {
        loadTiles();
      }, 300);
    };

    loadTiles();
    map.on('moveend', debouncedLoadTiles);

    return () => {
      clearTimeout(loadTimeout);
      map.off('moveend', debouncedLoadTiles);
      if (featureGroup && map.hasLayer(featureGroup)) {
        map.removeLayer(featureGroup);
      }
    };
  }, [map, url, color, weight, opacity, fillOpacity, desaKode, visible, name, labelField, labelExtractor]);

  return null;
}
