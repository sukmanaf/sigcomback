"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export default function Map() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const isInitialized = useRef(false);
  const [kecId, setKecId] = useState<number | undefined>(undefined);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://192.168.1.100:3000";

  // Fungsi untuk menghitung bounds dari geometri Desas
  const getDesasBounds = (feature: maplibregl.MapGeoJSONFeature) => {
    const geometry = feature.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon;
    let bounds: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];

    if (geometry.type === "Polygon") {
      geometry.coordinates[0].forEach(([lng, lat]) => {
        bounds[0] = Math.min(bounds[0], lng);
        bounds[1] = Math.min(bounds[1], lat);
        bounds[2] = Math.max(bounds[2], lng);
        bounds[3] = Math.max(bounds[3], lat);
      });
    } else if (geometry.type === "MultiPolygon") {
      geometry.coordinates.forEach((polygon) => {
        polygon[0].forEach(([lng, lat]) => {
          bounds[0] = Math.min(bounds[0], lng);
          bounds[1] = Math.min(bounds[1], lat);
          bounds[2] = Math.max(bounds[2], lng);
          bounds[3] = Math.max(bounds[3], lat);
        });
      });
    }

    return bounds as maplibregl.LngLatBoundsLike;
  };

  // Fungsi untuk zoom ke bounds
  const zoomToBounds = (bounds: maplibregl.LngLatBoundsLike, kecId: number) => {
    const map = mapRef.current;
    if (!map) return;

    map.fitBounds(bounds, {
      padding: 50,
      maxZoom: 15,
    });
    console.log(`Zoomed to Desas bounds with kecId: ${kecId}`);
  };

  const handleDesasClick = (e: maplibregl.MapMouseEvent) => {
    console.log("Desas layer clicked");
    const features = mapRef.current!.queryRenderedFeatures(e.point, { layers: ["desas-layer"] });
    if (features.length > 0) {
      const feature = features[0];
      const newKecId = parseInt(feature.properties?.d_kd_kel);
      console.log("Clicked Desas, properties:", feature.properties, "newKecId:", newKecId, "current kecId:", kecId);
      if (!isNaN(newKecId) && newKecId !== kecId) {
        console.log("Setting new kecId:", newKecId);
        const bounds = getDesasBounds(feature); // Hitung bounds dari Desas yang diklik
        setKecId((prevKecId) => {
          console.log("Inside setKecId, prevKecId:", prevKecId, "newKecId:", newKecId);
          return newKecId;
        });
        zoomToBounds(bounds, newKecId); // Zoom segera setelah setKecId
        const desasCheckbox = document.querySelector('input[value="desas-layer"]') as HTMLInputElement;
        const nopsCheckbox = document.querySelector('input[value="nops-layer"]') as HTMLInputElement;
        if (desasCheckbox) {
          desasCheckbox.checked = false;
          desasCheckbox.dispatchEvent(new Event("change"));
        }
        if (nopsCheckbox && !nopsCheckbox.checked) {
          nopsCheckbox.checked = true;
          nopsCheckbox.dispatchEvent(new Event("change"));
        }
      } else {
        console.log("Invalid or unchanged kecId:", newKecId, "current kecId:", kecId);
      }
    } else {
      console.log("No features found at click point");
    }
  };
  const handleNopsClick = (e: maplibregl.MapMouseEvent) => {
    console.log("Nops layer clicked");
    const features = mapRef.current!.queryRenderedFeatures(e.point, { layers: ["nops-layer"] });
    if (features.length > 0) {
      const feature = features[0];
        console.log("Setting new kecId:", feature);
      
    } else {
      console.log("No features found at click point");
    }
  };


  useEffect(() => {
    if (!mapContainer.current || isInitialized.current) {
      console.log("Map not initialized: container missing or already initialized");
      return;
    }

    console.log("Initializing map...");
    isInitialized.current = true;

    console.log("Base URL:", baseUrl);

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'google-satellite': {
            type: 'raster',
            tiles: [
              'https://mt0.google.com/vt?lyrs=s&x={x}&y={y}&z={z}',
              'https://mt1.google.com/vt?lyrs=s&x={x}&y={y}&z={z}',
              'https://mt2.google.com/vt?lyrs=s&x={x}&y={y}&z={z}',
              'https://mt3.google.com/vt?lyrs=s&x={x}&y={y}&z={z}',
            ],
            tileSize: 256,
            attribution: '&copy; Google',
          },
        },
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        layers: [
          {
            id: 'google-satellite',
            type: 'raster',
            source: 'google-satellite',
            paint: {},
          },
        ],
      },
      center: [112.9175, -7.6519],
      zoom: 13,
      contextAttributes: {
        antialias: false,
        alpha: true,
        preserveDrawingBuffer: false,
        failIfMajorPerformanceCaveat: true, // Allow software fallback
      },
      preferWebGL2: false,
    } as any);

    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl(), "top-left");

    map.on("load", () => {
      console.log("Map loaded");

      if (!map.getSource("osm")) {
        map.addSource("osm", {
          type: "raster",
          tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
        });
        map.addLayer({
          id: "osm-layer",
          type: "raster",
          source: "osm",
          minzoom: 0,
          maxzoom: 22,
          layout: { visibility: "none" },
        });
      }

      if (!map.getSource("maptiler-satellite")) {
        map.addSource("maptiler-satellite", {
          type: "raster",
          tiles: ["https://api.maptiler.com/tiles/satellite/{z}/{x}/{y}.jpg?key=Y3h7EyJ4AzA9bysQFfak"],
          tileSize: 256,
        });
        map.addLayer({
          id: "maptiler-satellite-layer",
          type: "raster",
          source: "maptiler-satellite",
          minzoom: 0,
          maxzoom: 22,
          layout: { visibility: "visible" },
        });
      }

      if (!map.getSource("desas")) {
        console.log("Adding desas source...");
        map.addSource("desas", {
          type: "vector",
          tiles: [`${baseUrl}/api/desas/tiles/{z}/{x}/{y}`],
        });
        map.addLayer({
          id: "desas-layer",
          type: "fill",
          source: "desas",
          "source-layer": "desas",
          paint: { "fill-color": "#f00", "fill-opacity": 0.1 },
          layout: { visibility: "visible" },
        });
        map.addLayer({
          id: "desas-outline",
          type: "line",
          source: "desas",
          "source-layer": "desas",
          paint: {
            "line-color": "#f00", // Warna garis (sesuaikan)
            "line-width": 2, // Lebar garis dalam piksel (sesuaikan)
          },
          layout: { visibility: "visible" },
        });
        map.addLayer({
          id: "desas-labels",
          type: "symbol",
          source: "desas",
          "source-layer": "desas",
          layout: {
            "text-field": ["get", "d_nm_kel"],
            "text-size": 12,
            visibility: "visible",
          },
          paint: {
            "text-color": "#ff0000", // Red color (you can use any hex color)
            "text-halo-color": "#ffffff", // White halo/outline around text
            "text-halo-width": 1 // Width of the halo
          }
        });
        console.log("Desas layer added");
      }

      const updateNopsSource = () => {
        if (map.getSource("nops")) {
          map.removeSource("nops");
        }
        
        const tileUrl = kecId 
          ? `${baseUrl}/api/nops/tiles/{z}/{x}/{y}?kecId=${kecId}`
          : `${baseUrl}/api/nops/tiles/{z}/{x}/{y}`;
          
        map.addSource("nops", {
          type: "vector",
          tiles: [tileUrl],
          minzoom: 0,
          maxzoom: 22
        });
        
        console.log("Nops source updated with kecId:", kecId || "none");
      };

      // Initial NOPs source setup
      if (!map.getSource("nops")) {
        updateNopsSource();
      }

      // Update NOPs source when kecId changes
      const currentKecId = kecId;
      if (currentKecId !== undefined) {
        updateNopsSource();
      }

      const updateDesasLayer = (checked: boolean) => {
        const visibility = checked ? "visible" : "none";
        
        // Set visibility for desas layers
        map.setLayoutProperty("desas-layer", "visibility", visibility);
        map.setLayoutProperty("desas-labels", "visibility", visibility);
        map.setLayoutProperty("desas-outline", "visibility", visibility);
        
        // If desas is being turned on, ensure nops is turned off
        if (checked) {
          const nopsCheckbox = document.querySelector('input[value="nops-layer"]') as HTMLInputElement;
          if (nopsCheckbox && nopsCheckbox.checked) {
            nopsCheckbox.checked = false;
            updateNopsLayer(false);
          }
        }
      };

      const updateNopsLayer = (checked: boolean) => {
        if (checked) {
          // Update source with current kecId
          updateNopsSource();

          // If nops is being turned on, ensure desas is turned off
          const desasCheckbox = document.querySelector('input[value="desas-layer"]') as HTMLInputElement;
          if (desasCheckbox && desasCheckbox.checked) {
            desasCheckbox.checked = false;
            updateDesasLayer(false);
          }

          // Add fill layer
          if (!map.getLayer("nops-fill")) {
            map.addLayer({
              id: "nops-fill",
              type: "fill",
              source: "nops",
              'source-layer': 'nops',
              paint: {
                'fill-color': '#ffec99',
                'fill-opacity': 0.3,
                'fill-outline-color': '#ffa500'
              },
              minzoom: 0
            });
          } else {
            map.setLayoutProperty("nops-fill", "visibility", "visible");
          }

          // Add outline layer
          if (!map.getLayer("nops-outline")) {
            map.addLayer({
              id: "nops-outline",
              type: "line",
              source: "nops",
              'source-layer': 'nops',
              paint: {
                'line-color': '#ffa500',
                'line-width': 2,
                'line-opacity': 0.9
              },
              minzoom: 0
            });
          } else {
            map.setLayoutProperty("nops-outline", "visibility", "visible");
          }

          // Add labels
          if (!map.getLayer("nops-labels")) {
            map.addLayer({
              id: "nops-labels",
              type: "symbol",
              source: "nops",
              'source-layer': 'nops',
              layout: {
                'text-field': ['get', 'view_nop'],
                'text-size': 12,
                'text-allow-overlap': true
              },
              paint: {
                'text-color': '#1a237e',
                'text-halo-color': '#ffffff',
                'text-halo-width': 1
              },
              minzoom: 0
            });
          } else {
            map.setLayoutProperty("nops-labels", "visibility", "visible");
          }
        } else {
          // Just hide the layers instead of removing them
          if (map.getLayer("nops-fill")) map.setLayoutProperty("nops-fill", "visibility", "none");
          if (map.getLayer("nops-outline")) map.setLayoutProperty("nops-outline", "visibility", "none");
          if (map.getLayer("nops-labels")) map.setLayoutProperty("nops-labels", "visibility", "none");
        }
      };

      const updateBangunansSource = () => {
        if (map.getSource("bangunans")) {
          map.removeSource("bangunans");
        }
        
        const tileUrl = kecId 
          ? `${baseUrl}/api/bangunans/tiles/{z}/{x}/{y}?kecId=${kecId}`
          : `${baseUrl}/api/bangunans/tiles/{z}/{x}/{y}`;
          
        map.addSource("bangunans", {
          type: "vector",
          tiles: [tileUrl],
          minzoom: 0,
          maxzoom: 22
        });
        
        console.log("Bangunans source updated with kecId:", kecId || "none");
      };

      // Initial bangunans source setup
      if (!map.getSource("bangunans")) {
        updateBangunansSource();
      }

      // Update bangunans source when kecId changes
      if (kecId !== undefined) {
        updateBangunansSource();
      }

      const updateBangunansLayer = (checked: boolean) => {
        if (checked) {
          // Update source with current kecId
          updateBangunansSource();

          // Add fill layer
          if (!map.getLayer("bangunans-fill")) {
            map.addLayer({
              id: "bangunans-fill",
              type: "fill",
              source: "bangunans",
              'source-layer': 'bangunans',
              paint: {
                'fill-color': '#ff0000',
                'fill-opacity': 0.3,
                'fill-outline-color': '#ff0000'
              },
              minzoom: 0
            });
          }

          // Add outline layer
          if (!map.getLayer("bangunans-outline")) {
            map.addLayer({
              id: "bangunans-outline",
              type: "line",
              source: "bangunans",
              'source-layer': 'bangunans',
              paint: {
                'line-color': '#ff0000',
                'line-width': 1,
                'line-opacity': 0.8
              },
              minzoom: 0
            });
          }

          // Add labels
          if (!map.getLayer("bangunans-labels")) {
            map.addLayer({
              id: "bangunans-labels",
              type: "symbol",
              source: "bangunans",
              'source-layer': 'bangunans',
              layout: {
                'text-field': ['get', 'view_nop'],
                'text-size': 10,
                'text-allow-overlap': true
              },
              paint: {
                'text-color': '#ffffff',
                'text-halo-color': '#000000',
                'text-halo-width': 1
              },
              minzoom: 0
            });
          }
        } else {
          // Remove layers
          if (map.getLayer("bangunans-fill")) map.removeLayer("bangunans-fill");
          if (map.getLayer("bangunans-outline")) map.removeLayer("bangunans-outline");
          if (map.getLayer("bangunans-labels")) map.removeLayer("bangunans-labels");
        }
      };

      map.on("click", "desas-layer", handleDesasClick);
      map.on("click", "nops-layer", handleNopsClick);
      map.on("mouseenter", "desas-layer", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "desas-layer", () => {
        map.getCanvas().style.cursor = "";
      });

      const layerControl = document.createElement("div");
      layerControl.className = "maplibregl-ctrl maplibregl-ctrl-group";
      layerControl.innerHTML = `
        <div style="padding: 10px; background: white; border-radius: 4px;">
          <h4 style="margin: 0 0 5px;">Layer Control</h4>
          <div>
            <h5>Basemap</h5>
            <label>
              <input type="radio" name="basemap" value="osm-layer"> OSM
            </label>
            <br>
            <label>
              <input type="radio" name="basemap" value="maptiler-satellite-layer" checked> Maptiler Satellite
            </label>
          </div>
          <div style="margin-top: 10px;">
            <h5>Overlay</h5>
            <label>
              <input type="checkbox" name="overlay" value="desas-layer" checked> Desas
            </label>
            <br>
            <label>
              <input type="checkbox" name="overlay" value="nops-layer"> Nops
            </label>
            <br>
             <label>
              <input type="checkbox" name="overlay" value="bangunans-layer"> Bangunan
            </label>
          </div>
        </div>
      `;

      layerControl.querySelectorAll('input[name="basemap"]').forEach((input) => {
        input.addEventListener("change", (e) => {
          const target = e.target as HTMLInputElement;
          const layerId = target.value;
          map.setLayoutProperty("osm-layer", "visibility", layerId === "osm-layer" ? "visible" : "none");
          map.setLayoutProperty("maptiler-satellite-layer", "visibility", layerId === "maptiler-satellite-layer" ? "visible" : "none");
        });
      });

      layerControl.querySelectorAll('input[name="overlay"]').forEach((input) => {
        input.addEventListener("change", async (e) => {
          const target = e.target as HTMLInputElement;
          const layerId = target.value;
          const checked = target.checked;

          if (layerId === "desas-layer") {
            updateDesasLayer(checked);
          } else if (layerId === "nops-layer") {
            updateNopsLayer(checked);
          } else if (layerId === "bangunans-layer") {
            updateBangunansLayer(checked);
          }
          
        });
      });

      map.addControl({ onAdd: () => layerControl, onRemove: () => {} }, "top-right");
      console.log("Layer control added");
    });

    return () => {
      console.log("Cleaning up map...");
      if (mapRef.current) {
        mapRef.current.remove();
        isInitialized.current = false;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const nopsSource = map.getSource("nops") as maplibregl.VectorTileSource;
    if (nopsSource) {
      const timestamp = Date.now();
      const newTiles = kecId !== undefined
        ? [`${baseUrl}/api/nops/tiles/{z}/{x}/{y}?id=${kecId}&t=${timestamp}`]
        : [`${baseUrl}/api/nops/tiles/{z}/{x}/{y}?t=${timestamp}`];
      nopsSource.setTiles(newTiles);
      console.log("Nops source updated with kecId:", kecId ?? "none", "Tiles:", newTiles);

      const nopsCheckbox = document.querySelector('input[value="nops-layer"]') as HTMLInputElement;
      if (nopsCheckbox && nopsCheckbox.checked) {
        if (map.getLayer("nops-layer")) map.removeLayer("nops-layer");
        if (map.getLayer("nops-labels")) map.removeLayer("nops-labels");
        
        map.addLayer({
          id: "nops-layer",
          type: "fill",
          source: "nops",
          "source-layer": "nops",
          paint: { 
            "fill-color": "#ffec99",
            "fill-opacity": 0.05
          },
        });
        map.addLayer({
          id: "nops-labels",
          type: "symbol",
          source: "nops",
          "source-layer": "nops",
          layout: {
            "text-field": ["get", "view_nop"],
            "text-size": 12,
          },
          paint: {
            "text-color": "#ff0000", // Red color (you can use any hex color)
            "text-halo-color": "#ffffff", // White halo/outline around text
            "text-halo-width": 0.7 // Width of the halo
          }
        });
        console.log("Nops layers added with kecId:", kecId);
      }
    }
  }, [kecId]);

  return <div ref={mapContainer} className="h-screen w-full" />;
}