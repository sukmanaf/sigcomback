'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface DesaFullLayerProps {
  visible?: boolean;
  onDesaClick?: (feature: any) => void;
  userKodeWilayah?: string | null;
  userRole?: string;
  color?: string;
  fillOpacity?: number;
}

// Minimum zoom level to show labels (prevents overlap on small screens)
const MIN_ZOOM_FOR_LABELS = 13;

export default function DesaFullLayer({
  visible = true,
  onDesaClick,
  userKodeWilayah,
  userRole,
  color = '#10b981',
  fillOpacity = 0.1,
}: DesaFullLayerProps) {
  const map = useMap();
  const layerRef = useRef<L.FeatureGroup | null>(null);
  const labelLayerRef = useRef<L.FeatureGroup | null>(null);
  // Use ref to store onDesaClick to avoid dependency issues
  const onDesaClickRef = useRef(onDesaClick);
  onDesaClickRef.current = onDesaClick;

  // Build API URL based on user role
  const getApiUrl = useCallback(() => {
    let url = '/api/desas/all';

    // Add filter params based on role
    if (userRole === 'kecamatan' && userKodeWilayah) {
      url += `?kecamatan=${userKodeWilayah}`;
    } else if (userRole === 'desa' && userKodeWilayah) {
      url += `?desa=${userKodeWilayah}`;
    }
    // For admin/bapenda/bpn - no filter, get all desas

    return url;
  }, [userRole, userKodeWilayah]);

  // Update label visibility based on zoom level
  const updateLabelVisibility = useCallback(() => {
    if (!labelLayerRef.current || !map) return;

    const currentZoom = map.getZoom();
    if (currentZoom >= MIN_ZOOM_FOR_LABELS) {
      if (!map.hasLayer(labelLayerRef.current)) {
        labelLayerRef.current.addTo(map);
      }
    } else {
      if (map.hasLayer(labelLayerRef.current)) {
        map.removeLayer(labelLayerRef.current);
      }
    }
  }, [map]);

  // Helper function to safely remove all desa layers from map
  const cleanupLayers = useCallback(() => {
    if (!map) return;

    // Remove layer from ref
    if (layerRef.current) {
      try {
        if (map.hasLayer(layerRef.current)) {
          map.removeLayer(layerRef.current);
        }
      } catch (e) {
        // Ignore
      }
      layerRef.current = null;
    }

    // Remove label layer from ref
    if (labelLayerRef.current) {
      try {
        if (map.hasLayer(labelLayerRef.current)) {
          map.removeLayer(labelLayerRef.current);
        }
      } catch (e) {
        // Ignore
      }
      labelLayerRef.current = null;
    }
  }, [map]);

  useEffect(() => {
    if (!map) return;

    // Clean up any existing layers first to prevent double layer
    cleanupLayers();

    // If not visible, just return after cleanup
    if (!visible) {
      return;
    }

    // Track if this effect is still active (not cleaned up)
    let isMounted = true;

    // Create feature groups
    const featureGroup = L.featureGroup();
    const labelGroup = L.featureGroup();

    // Detect mobile for zoom adjustment
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const desaClickMaxZoom = isMobile ? 13 : 18;

    // Load desas from API with appropriate filters
    const loadDesas = async () => {
      try {
        const url = getApiUrl();
        const response = await fetch(url);

        // Check if component is still mounted
        if (!isMounted) return;

        const geojson = await response.json();

        // Check again after async operation
        if (!isMounted) return;

        if (geojson.features && geojson.features.length > 0) {
          L.geoJSON(geojson, {
            style: {
              color: color,
              weight: 2,
              opacity: 0.8,
              fillOpacity: fillOpacity,
            },
            onEachFeature: (feature, layer) => {
              const props = feature.properties;
              let popupContent = '<div class="text-sm">';
              Object.entries(props).forEach(([key, value]) => {
                popupContent += `<p><strong>${key}:</strong> ${value}</p>`;
              });
              popupContent += '</div>';
              layer.bindPopup(popupContent);

              // Add label showing d_nm_kel - use layer bounds for accurate center
              if (props.d_nm_kel && (layer as L.Polygon).getBounds) {
                try {
                  const bounds = (layer as L.Polygon).getBounds();
                  const center = bounds.getCenter();

                  const labelMarker = L.marker(center, {
                    icon: L.divIcon({
                      className: 'desa-label',
                      html: `<div style="
                        background: ${color};
                        color: white;
                        padding: 3px 6px;
                        border-radius: 4px;
                        font-size: 11px;
                        font-weight: bold;
                        text-align: center;
                        white-space: nowrap;
                        cursor: pointer;
                        border: 1px solid white;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                      ">${props.d_nm_kel}</div>`,
                      iconSize: [100, 18],
                      iconAnchor: [50, 9],
                    }),
                  });

                  // Make label clickable to select desa
                  labelMarker.on('click', () => {
                    map.fitBounds(bounds, {
                      padding: [30, 30],
                      maxZoom: desaClickMaxZoom
                    });

                    if (onDesaClickRef.current) {
                      onDesaClickRef.current(feature);
                    }
                  });

                  labelMarker.addTo(labelGroup);
                } catch (e) {
                  // Ignore if getBounds fails
                }
              }

              // Add click handler
              layer.on('click', () => {
                try {
                  if ((layer as L.Polygon).getBounds) {
                    const bounds = (layer as L.Polygon).getBounds();
                    map.fitBounds(bounds, {
                      padding: [30, 30],
                      maxZoom: desaClickMaxZoom
                    });
                  }
                } catch (e) {
                  // Ignore if getBounds fails
                }

                if (onDesaClickRef.current) {
                  onDesaClickRef.current(feature);
                }
              });
            },
          }).addTo(featureGroup);
        }

        // Check again before adding to map
        if (!isMounted) {
          featureGroup.clearLayers();
          labelGroup.clearLayers();
          return;
        }

        // Store refs and add to map
        layerRef.current = featureGroup;
        labelLayerRef.current = labelGroup;

        featureGroup.addTo(map);

        if (map.getZoom() >= MIN_ZOOM_FOR_LABELS) {
          labelGroup.addTo(map);
        }
      } catch (error) {
        console.error('Error loading desas:', error);
      }
    };

    loadDesas();

    map.on('zoomend', updateLabelVisibility);

    return () => {
      isMounted = false;
      map.off('zoomend', updateLabelVisibility);
      cleanupLayers();
    };
  }, [map, visible, userRole, userKodeWilayah, getApiUrl, updateLabelVisibility, cleanupLayers, color, fillOpacity]);

  return null;
}
