'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface CanvasTileLayerProps {
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

interface TileData {
  features: Array<{
    id: number;
    properties: Record<string, any>;
    geometry: {
      type: string;
      coordinates: number[][][];
    };
  }>;
}

export default function CanvasTileLayer({
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
}: CanvasTileLayerProps) {
  const map = useMap();
  const layerRef = useRef<any>(null);
  const tileCache = useRef<Map<string, TileData>>(new Map());
  const renderedTilesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!map) return;

    // If not visible or requires filter but no filter provided, don't load
    if (!visible || (!desaKode && name !== 'Desa')) {
      if (layerRef.current && map.hasLayer(layerRef.current)) {
        map.removeLayer(layerRef.current);
      }
      return;
    }

    // Create custom canvas layer
    const canvasLayer = L.Layer.extend({
      onAdd: function (map: any) {
        this._map = map;
        this._canvas = L.DomUtil.create('canvas', 'leaflet-canvas-layer');
        this._canvas.style.position = 'absolute';
        this._canvas.style.top = '0';
        this._canvas.style.left = '0';
        this._canvas.style.zIndex = '200';
        
        const container = map.getPane('overlayPane');
        if (container) {
          container.appendChild(this._canvas);
        }

        this._redraw();
        map.on('moveend', this._redraw, this);
        map.on('zoom', this._redraw, this);
      },

      onRemove: function (map: any) {
        map.off('moveend', this._redraw, this);
        map.off('zoom', this._redraw, this);
        if (this._canvas && this._canvas.parentNode) {
          this._canvas.parentNode.removeChild(this._canvas);
        }
      },

      _redraw: function () {
        if (!this._map || !this._canvas) return;

        const canvas = this._canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const size = this._map.getSize();
        canvas.width = size.x;
        canvas.height = size.y;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw all cached tiles
        renderedTilesRef.current.forEach((tileKey) => {
          const tileData = tileCache.current.get(tileKey);
          if (tileData) {
            drawTile(ctx, tileData, this._map);
          }
        });
      },
    }) as any;

    const drawTile = (ctx: CanvasRenderingContext2D, tileData: TileData, mapInstance: any) => {
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = weight;
      ctx.globalAlpha = opacity;

      tileData.features.forEach((feature) => {
        if (feature.geometry.type === 'Polygon') {
          feature.geometry.coordinates.forEach((ring) => {
            ctx.beginPath();
            ring.forEach((coord, index) => {
              const point = mapInstance.latLngToContainerPoint([coord[1], coord[0]]);
              if (index === 0) {
                ctx.moveTo(point.x, point.y);
              } else {
                ctx.lineTo(point.x, point.y);
              }
            });
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          });
        }
      });

      ctx.globalAlpha = 1;
    };

    const instance = new canvasLayer();
    layerRef.current = instance;
    instance.addTo(map);

    // Load tiles
    const loadTiles = () => {
      const bounds = map.getBounds();
      const zoom = map.getZoom();

      if (zoom < 10 && name !== 'Desa') {
        renderedTilesRef.current.clear();
        instance._redraw();
        return;
      }

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
      const newTiles = new Set<string>();

      for (let tx = minTx; tx <= maxTx && tilesLoaded < maxTilesToLoad; tx++) {
        for (let ty = minTy; ty <= maxTy && tilesLoaded < maxTilesToLoad; ty++) {
          const tileKey = `${zoom}:${tx}:${ty}:${desaKode || ''}`;
          newTiles.add(tileKey);

          if (!tileCache.current.has(tileKey)) {
            fetchTile(tx, ty, zoom, tileKey);
          }
          tilesLoaded++;
        }
      }

      // Update rendered tiles
      renderedTilesRef.current = newTiles;
      instance._redraw();
    };

    const fetchTile = async (x: number, y: number, z: number, tileKey: string) => {
      try {
        let tileUrl = `${url}?z=${z}&x=${x}&y=${y}`;
        if (desaKode) {
          tileUrl += `&desaKode=${desaKode}`;
        }

        const response = await fetch(tileUrl);
        const tileData = await response.json();

        tileCache.current.set(tileKey, tileData);

        // Redraw canvas after loading tile
        instance._redraw();
      } catch (error) {
        console.error(`Error loading tile ${z}/${x}/${y}:`, error);
      }
    };

    let loadTimeout: NodeJS.Timeout;
    const debouncedLoadTiles = () => {
      clearTimeout(loadTimeout);
      loadTimeout = setTimeout(() => {
        loadTiles();
      }, 300);
    };

    loadTiles();
    map.on('moveend', debouncedLoadTiles);
    map.on('zoom', debouncedLoadTiles);

    return () => {
      clearTimeout(loadTimeout);
      map.off('moveend', debouncedLoadTiles);
      map.off('zoom', debouncedLoadTiles);
      if (instance && map.hasLayer(instance)) {
        map.removeLayer(instance);
      }
    };
  }, [map, url, color, weight, opacity, fillOpacity, desaKode, visible, name]);

  return null;
}
