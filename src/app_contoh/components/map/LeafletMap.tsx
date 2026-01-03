"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ChevronDown, Layers, Map as MapIcon } from "lucide-react";

// Fix leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface LayerVisibility {
  [key: string]: boolean;
}

export default function LeafletMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<{ [key: string]: any }>({});
  const isInitialized = useRef(false);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://192.168.1.100:3000";

  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({
    desas: true,
    nops: false,
    bangunans: false,
  });
  const [initialLayersLoaded, setInitialLayersLoaded] = useState(false);

  const [basemap, setBasemap] = useState<"osm" | "satellite">("satellite");
  const [showLayerControl, setShowLayerControl] = useState(false);
  const [showBasemapControl, setShowBasemapControl] = useState(false);
  const [kecId, setKecId] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!mapContainer.current || isInitialized.current) return;

    isInitialized.current = true;

    // Initialize map - Center to Pasuruan
    const map = L.map(mapContainer.current).setView([-7.6519, 112.7919], 12);
    mapRef.current = map;

    // Add basemaps
    const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    });

    const satelliteLayer = L.tileLayer(
      "https://api.maptiler.com/tiles/satellite/{z}/{x}/{y}.jpg?key=Y3h7EyJ4AzA9bysQFfak",
      {
        attribution: '&copy; MapTiler',
        maxZoom: 19,
        minZoom: 0,
        tms: false,
      }
    );

    layersRef.current.osm = osmLayer;
    layersRef.current.satellite = satelliteLayer;

    // Add initial basemap
    satelliteLayer.addTo(map);
    
    // Force map to invalidate size and redraw
    setTimeout(() => {
      map.invalidateSize();
      map.setZoom(map.getZoom()); // Force redraw
    }, 100);
    
    // Ensure tiles load properly
    satelliteLayer.on('load', () => {
      console.log('Satellite tiles loaded');
    });

    // Add desas layer (GeoJSON)
    const desasLayer = L.featureGroup() as L.FeatureGroup;
    layersRef.current.desas = desasLayer;
    desasLayer.addTo(map);

    // Add nops layer
    const nopsLayer = L.featureGroup() as L.FeatureGroup;
    layersRef.current.nops = nopsLayer;

    // Add bangunans layer
    const bangunanLayer = L.featureGroup() as L.FeatureGroup;
    layersRef.current.bangunans = bangunanLayer;

    // Load desas data
    fetch(`${baseUrl}/api/desas/geojson`)
      .then((res) => res.json())
      .then((data) => {
        L.geoJSON(data, {
          style: {
            fillColor: "#ff0000",
            fillOpacity: 0.1,
            color: "#ff0000",
            weight: 2,
          },
          onEachFeature: (feature: any, layer: any) => {
            layer.bindPopup(`<strong>${feature.properties?.d_nm_kel || "Desa"}</strong>`);
            desasLayer.addLayer(layer);
          },
        });
      })
      .catch((err) => console.error("Error loading desas:", err));

    // Load nops data
    const loadNopsData = () => {
      const url = kecId
        ? `${baseUrl}/api/nops/geojson?kecId=${kecId}`
        : `${baseUrl}/api/nops/geojson`;

      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          nopsLayer.clearLayers();
          L.geoJSON(data, {
            style: {
              fillColor: "#ffec99",
              fillOpacity: 0.3,
              color: "#ffa500",
              weight: 2,
            },
            onEachFeature: (feature: any, layer: any) => {
              layer.bindPopup(`<strong>${feature.properties?.view_nop || "NOP"}</strong>`);
              nopsLayer.addLayer(layer);
            },
          });
        })
        .catch((err) => console.error("Error loading nops:", err));
    };

    // Load bangunans data
    const loadBangunanData = () => {
      const url = kecId
        ? `${baseUrl}/api/bangunans/geojson?kecId=${kecId}`
        : `${baseUrl}/api/bangunans/geojson`;

      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          bangunanLayer.clearLayers();
          L.geoJSON(data, {
            style: {
              fillColor: "#ff0000",
              fillOpacity: 0.3,
              color: "#ff0000",
              weight: 1,
            },
            onEachFeature: (feature: any, layer: any) => {
              layer.bindPopup(`<strong>${feature.properties?.view_nop || "Bangunan"}</strong>`);
              bangunanLayer.addLayer(layer);
            },
          });
        })
        .catch((err) => console.error("Error loading bangunans:", err));
    };

    loadNopsData();
    loadBangunanData();

    // Handle desas click
    desasLayer.on("click", (e: any) => {
      const feature = e.layer.feature;
      if (feature?.properties?.d_kd_kel) {
        const newKecId = parseInt(feature.properties.d_kd_kel);
        if (!isNaN(newKecId) && newKecId !== kecId) {
          setKecId(newKecId);
          // Zoom to bounds
          const bounds = (e.layer as any).getBounds();
          map.fitBounds(bounds, { padding: [50, 50] });
          // Update layer visibility
          setLayerVisibility((prev) => ({
            ...prev,
            desas: false,
            nops: true,
          }));
        }
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        isInitialized.current = false;
      }
    };
  }, []);

  // Update layer visibility
  useEffect(() => {
    if (!mapRef.current) return;

    Object.entries(layerVisibility).forEach(([layerName, isVisible]) => {
      const layer = layersRef.current[layerName];
      if (layer) {
        if (isVisible) {
          mapRef.current!.addLayer(layer);
        } else {
          mapRef.current!.removeLayer(layer);
        }
      }
    });
  }, [layerVisibility]);

  // Update basemap
  useEffect(() => {
    if (!mapRef.current) return;

    const osmLayer = layersRef.current.osm;
    const satelliteLayer = layersRef.current.satellite;

    if (basemap === "osm") {
      if (satelliteLayer && mapRef.current.hasLayer(satelliteLayer)) {
        mapRef.current.removeLayer(satelliteLayer);
      }
      if (osmLayer && !mapRef.current.hasLayer(osmLayer)) {
        mapRef.current.addLayer(osmLayer);
      }
    } else {
      if (osmLayer && mapRef.current.hasLayer(osmLayer)) {
        mapRef.current.removeLayer(osmLayer);
      }
      if (satelliteLayer && !mapRef.current.hasLayer(satelliteLayer)) {
        mapRef.current.addLayer(satelliteLayer);
      }
    }
  }, [basemap]);

  // Update nops and bangunans when kecId changes
  useEffect(() => {
    if (!mapRef.current) return;

    const nopsLayer = layersRef.current.nops;
    const bangunanLayer = layersRef.current.bangunans;

    const loadNopsData = () => {
      const url = kecId
        ? `${baseUrl}/api/nops/geojson?kecId=${kecId}`
        : `${baseUrl}/api/nops/geojson`;

      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          nopsLayer?.clearLayers();
          L.geoJSON(data, {
            style: {
              fillColor: "#ffec99",
              fillOpacity: 0.3,
              color: "#ffa500",
              weight: 2,
            },
            onEachFeature: (feature: any, layer: any) => {
              layer.bindPopup(`<strong>${feature.properties?.view_nop || "NOP"}</strong>`);
              nopsLayer?.addLayer(layer);
            },
          });
        })
        .catch((err) => console.error("Error loading nops:", err));
    };

    const loadBangunanData = () => {
      const url = kecId
        ? `${baseUrl}/api/bangunans/geojson?kecId=${kecId}`
        : `${baseUrl}/api/bangunans/geojson`;

      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          bangunanLayer?.clearLayers();
          L.geoJSON(data, {
            style: {
              fillColor: "#ff0000",
              fillOpacity: 0.3,
              color: "#ff0000",
              weight: 1,
            },
            onEachFeature: (feature: any, layer: any) => {
              layer.bindPopup(`<strong>${feature.properties?.view_nop || "Bangunan"}</strong>`);
              bangunanLayer?.addLayer(layer);
            },
          });
        })
        .catch((err) => console.error("Error loading bangunans:", err));
    };

    loadNopsData();
    loadBangunanData();
  }, [kecId]);

  return (
    <div className="flex flex-col h-full w-full bg-gray-100">
      {/* Map Container */}
      <div className="flex-1 relative overflow-hidden">
        <div ref={mapContainer} className="w-full h-full absolute inset-0" style={{ background: '#e5e5e5' }} />

        {/* Layer Control - Top Right */}
        <div className="absolute top-4 right-4 z-50 pointer-events-auto">
          <div className="bg-white rounded-lg shadow-lg overflow-visible">
            <button
              onClick={() => setShowLayerControl(!showLayerControl)}
              className="w-full px-4 py-3 flex items-center gap-2 hover:bg-gray-100 border-b border-gray-200"
            >
              <Layers size={20} className="text-gray-700" />
              <span className="text-sm font-medium text-gray-700">Tutupan Hutan</span>
              <ChevronDown
                size={16}
                className={`text-gray-700 transition-transform ${
                  showLayerControl ? "rotate-180" : ""
                }`}
              />
            </button>

            {showLayerControl && (
              <div className="p-4 space-y-3 bg-white border-t border-gray-200 w-64 absolute top-full right-0 mt-1 rounded-b-lg shadow-lg z-50">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-700">LULC 2024</h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={layerVisibility.desas}
                      onChange={(e) =>
                        setLayerVisibility((prev) => ({
                          ...prev,
                          desas: e.target.checked,
                        }))
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">Desas</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={layerVisibility.nops}
                      onChange={(e) =>
                        setLayerVisibility((prev) => ({
                          ...prev,
                          nops: e.target.checked,
                        }))
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">Peta Offisial</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={layerVisibility.bangunans}
                      onChange={(e) =>
                        setLayerVisibility((prev) => ({
                          ...prev,
                          bangunans: e.target.checked,
                        }))
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">RTRW Provinsi</span>
                  </label>
                </div>

                <div className="space-y-2 border-t pt-3">
                  <h3 className="text-sm font-semibold text-gray-700">Kawasan Konservasi</h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4" />
                    <span className="text-sm text-gray-700">Kawasan Konservasi</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Basemap Control - Bottom Right */}
        <div className="absolute bottom-4 right-4 z-40 pointer-events-auto">
          <div className="bg-white rounded-lg shadow-lg overflow-visible">
            <button
              onClick={() => setShowBasemapControl(!showBasemapControl)}
              className="w-full px-4 py-3 flex items-center gap-2 hover:bg-gray-100"
            >
              <MapIcon size={20} className="text-gray-700" />
              <span className="text-sm font-medium text-gray-700">Basemap</span>
              <ChevronDown
                size={16}
                className={`text-gray-700 transition-transform ${
                  showBasemapControl ? "rotate-180" : ""
                }`}
              />
            </button>

            {showBasemapControl && (
              <div className="p-3 space-y-2 bg-white border-t border-gray-200 absolute bottom-full right-0 mb-1 rounded-t-lg shadow-lg z-40">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="basemap"
                    value="osm"
                    checked={basemap === "osm"}
                    onChange={(e) => setBasemap(e.target.value as "osm" | "satellite")}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">OpenStreetMap</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="basemap"
                    value="satellite"
                    checked={basemap === "satellite"}
                    onChange={(e) => setBasemap(e.target.value as "osm" | "satellite")}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">Satellite</span>
                </label>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
