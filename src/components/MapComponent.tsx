'use client';

import { MapContainer, TileLayer, Popup, Marker, useMap, useMapEvents, GeoJSON } from 'react-leaflet';
import { Search } from 'lucide-react';

// Component to log zoom level on zoom events
function ZoomLogger() {
  useMapEvents({
    zoomend: (e) => {
      const zoom = e.target.getZoom();
      console.log('Zoom Level:', zoom);
    },
  });
  return null;
}

// Component to capture map instance reference
function MapRefSetter({ mapRef }: { mapRef: React.MutableRefObject<L.Map | null> }) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);
  return null;
}
import L from 'leaflet';
import { useEffect, useState, useCallback, useRef } from 'react';
import BasemapSelector from './BasemapSelector';
import LayerPanel, { LayerStyle } from './LayerPanel';
import GeoJsonTileLayer from './GeoJsonTileLayer';
import MVTTileLayer from './MVTTileLayer';
import DesaFullLayer from './DesaFullLayer';
import BlokFullLayer from './BlokFullLayer';
import NopLabelsCanvasLayer from './NopLabelsCanvasLayer';
import DrawingTools from './DrawingTools';
import SavePolygonModal, { SavePolygonData } from './SavePolygonModal';
import NopInfoModal from './NopInfoModal';
import PolygonEditModal, { PolygonEditData } from './PolygonEditModal';
import PolygonEditLayer, { EditLayerType } from './PolygonEditLayer';
import MultiPolygonEditLayer from './MultiPolygonEditLayer';
import TematikLayer, { getCategoryColor, TEMATIK_FILL_OPACITY } from './TematikLayer';
import SearchModal from './SearchModal';
import { mapConfig } from '@/lib/mapConfig';
import Swal from 'sweetalert2';

// Note: Initial zoom is now determined by DesaFullLayer based on all desas bounds


interface Basemap {
  id: string;
  name: string;
  url: string;
  attribution: string;
}

interface MapComponentProps {
  basemap: string;
  onBasemapChange: (basemap: string) => void;
  editMode?: boolean;
  multiEditMode?: boolean;
  activeTematik?: string;
  tematikKey?: number;
  onDesaChange?: (desaKode: string) => void;
  onClearTematik?: () => void;
  userKodeWilayah?: string | null;
  userRole?: string;
}

export default function MapComponent({
  basemap,
  onBasemapChange,
  editMode = false,
  multiEditMode = false,
  activeTematik = '',
  tematikKey = 0,
  onDesaChange,
  onClearTematik,
  userKodeWilayah,
  userRole,
}: MapComponentProps) {
  const [selectedDesaKode, setSelectedDesaKode] = useState<string>();
  const [selectedDesaNama, setSelectedDesaNama] = useState<string>();
  const [selectedDesaBounds, setSelectedDesaBounds] = useState<L.LatLngBounds | null>(null);
  // Initially no layers visible, desas will load after basemap is ready
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(new Set());
  const [basemapReady, setBasemapReady] = useState(false);

  // Detect mobile for zoom adjustment - check immediately during state initialization
  const [initialZoom] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 13; // Mobile: zoom level 13
    }
    return mapConfig.initialZoom; // Desktop: default zoom
  });

  // Drawing state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [drawnCoordinates, setDrawnCoordinates] = useState<number[][]>([]);
  const [nopRefreshKey, setNopRefreshKey] = useState(0);

  // Polygon Edit state - generic for NOP, Blok, Bangunan
  const [editingType, setEditingType] = useState<EditLayerType | null>(null);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editPolygonCoordinates, setEditPolygonCoordinates] = useState<number[][]>([]);
  const [editPolygonCode, setEditPolygonCode] = useState<string>('');
  const [editPolygonImages, setEditPolygonImages] = useState<string[]>([]);
  const [showNopInfoModal, setShowNopInfoModal] = useState(false);
  const [showPolygonEditModal, setShowPolygonEditModal] = useState(false);
  const [infoNop, setInfoNop] = useState<string | null>(null);
  const [infoTematikCategory, setInfoTematikCategory] = useState<string | null>(null);
  const [tematikCategories, setTematikCategories] = useState<string[]>([]);
  const [savedLayersBeforeTematik, setSavedLayersBeforeTematik] = useState<Set<string> | null>(null);
  const [blokRefreshKey, setBlokRefreshKey] = useState(0);
  const [bangunanRefreshKey, setBangunanRefreshKey] = useState(0);

  // Highlighted NOP from search - stores GeoJSON data for red highlight
  const [highlightedNopData, setHighlightedNopData] = useState<any>(null);

  // Internal search state (moved from Navbar/page.tsx)
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchNop, setSearchNop] = useState<string | null>(null);
  const [searchDesaKode, setSearchDesaKode] = useState<string | null>(null);

  // Multi-edit state
  const [selectedPolygonsForMultiEdit, setSelectedPolygonsForMultiEdit] = useState<Array<{ type: EditLayerType, id: string | number, code: string }>>([]);

  // Default layer styles
  const defaultLayerStyles: Record<string, LayerStyle> = {
    desas: { color: '#10b981', opacity: 0.3 },
    nops: { color: '#00FFFF', opacity: 0.15 },
    bloks: { color: '#FF00FF', opacity: 0.1 },
    bangunans: { color: '#ff0000', opacity: 0.3 },
  };

  // Layer style state for dynamic colors and opacity - load from localStorage
  const [layerStyles, setLayerStyles] = useState<Record<string, LayerStyle>>(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mapLayerStyles');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Error parsing saved layer styles:', e);
        }
      }
    }
    return defaultLayerStyles;
  });

  // Save layer styles to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mapLayerStyles', JSON.stringify(layerStyles));
    }
  }, [layerStyles]);

  const handleLayerStyleChange = (layerId: string, style: LayerStyle) => {
    setLayerStyles(prev => ({
      ...prev,
      [layerId]: style,
    }));
  };

  // Store map reference for external control
  const mapRef = useRef<L.Map | null>(null);

  // Handle zoom to layer - set to initial center and zoom
  const handleLayerZoom = useCallback((layerId: string) => {
    if (!mapRef.current) {
      console.error('mapRef.current is null!');
      return;
    }

    if (layerId === 'desas') {
      // Set map to initial center and zoom (like first page load)
      mapRef.current.setView(
        [mapConfig.center.lat, mapConfig.center.lng],
        initialZoom
      );
    }
  }, [initialZoom]);

  const [currentBasemap, setCurrentBasemap] = useState<Basemap>({
    id: 'satellite',
    name: 'Satellite',
    url: 'http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
  });

  const basemaps: Record<string, Basemap> = {
    osm: {
      id: 'osm',
      name: 'OpenStreetMap',
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
    satellite: {
      id: 'satellite',
      name: 'Satellite',
      url: 'http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      attribution: 'Google Maps Satellite',
    },
    terrain: {
      id: 'terrain',
      name: 'Terrain',
      url: 'http://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
      attribution: '&copy; Google Maps',
    },
    dark: {
      id: 'dark',
      name: 'Dark',
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
  };

  const handleBasemapChange = (newBasemap: Basemap) => {
    setCurrentBasemap(newBasemap);
    onBasemapChange(newBasemap.id);
  };

  // Fix Leaflet icon issue
  useEffect(() => {
    const iconRetinaUrl =
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png';
    const iconUrl =
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png';
    const shadowUrl =
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png';

    L.Icon.Default.mergeOptions({
      iconRetinaUrl,
      iconUrl,
      shadowUrl,
    });
  }, []);

  // Enable desas layer immediately (no delay)
  useEffect(() => {
    setBasemapReady(true);
    setVisibleLayers(new Set(['desas']));
  }, []);


  // Handle polygon created from drawing tools
  const handlePolygonCreated = useCallback((coordinates: number[][]) => {
    setDrawnCoordinates(coordinates);
    setShowSaveModal(true);
  }, []);

  // Handle save polygon
  const handleSavePolygon = useCallback(async (data: SavePolygonData) => {
    try {
      const formData = new FormData();
      formData.append('type', data.type);
      formData.append('code', data.nop);
      formData.append('coordinates', JSON.stringify(data.coordinates));

      if (data.files) {
        data.files.forEach((file) => {
          formData.append('files', file);
        });
      }

      const response = await fetch('/api/polygons/save', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message);
      }

      // Refresh NOP layer without changing zoom
      if (data.type === 'nop') {
        setNopRefreshKey(prev => prev + 1);
      }

      // Show success message
      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: `${data.type.toUpperCase()} berhasil disimpan`,
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal!',
        text: error.message || 'Terjadi kesalahan saat menyimpan',
      });
      throw error;
    }
  }, []);

  // Handle NOP click when in edit mode - enter polygon edit mode
  const handleNopClick = useCallback(async (nopCode: string, luas: string, latlng: L.LatLng) => {
    if (editMode) {
      if (multiEditMode) {
        // Multi-edit mode: add/remove from selection
        setSelectedPolygonsForMultiEdit(prev => {
          const exists = prev.find(p => p.type === 'nop' && p.id === nopCode);
          if (exists) {
            // Remove from selection
            return prev.filter(p => !(p.type === 'nop' && p.id === nopCode));
          } else {
            // Check if trying to mix types
            if (prev.length > 0 && prev[0].type !== 'nop') {
              alert('Mode multi hanya bisa untuk 1 tipe polygon (NOP/Blok/Bangunan)');
              return prev;
            }
            // Add to selection
            return [...prev, { type: 'nop', id: nopCode, code: nopCode }];
          }
        });
      } else {
        // Single edit mode: start editing the polygon
        setEditingType('nop');
        setEditingId(nopCode);
      }
    } else {
      // Not in edit mode: show NOP info modal (modal will fetch from SISMIOP API)
      setInfoNop(nopCode);
      setShowNopInfoModal(true);
    }
  }, [editMode, multiEditMode]);

  // Handle Blok click when in edit mode
  const handleBlokClick = useCallback((id: number, code: string, latlng: L.LatLng) => {
    if (editMode) {
      if (multiEditMode) {
        // Multi-edit mode: add/remove from selection
        setSelectedPolygonsForMultiEdit(prev => {
          const exists = prev.find(p => p.type === 'blok' && p.id === id);
          if (exists) {
            return prev.filter(p => !(p.type === 'blok' && p.id === id));
          } else {
            if (prev.length > 0 && prev[0].type !== 'blok') {
              alert('Mode multi hanya bisa untuk 1 tipe polygon (NOP/Blok/Bangunan)');
              return prev;
            }
            return [...prev, { type: 'blok', id, code }];
          }
        });
      } else {
        setEditingType('blok');
        setEditingId(id);
      }
    }
  }, [editMode, multiEditMode]);

  // Handle Bangunan click when in edit mode
  const handleBangunanClick = useCallback((id: number, code: string, latlng: L.LatLng) => {
    if (editMode) {
      if (multiEditMode) {
        // Multi-edit mode: add/remove from selection
        setSelectedPolygonsForMultiEdit(prev => {
          const exists = prev.find(p => p.type === 'bangunan' && p.id === id);
          if (exists) {
            return prev.filter(p => !(p.type === 'bangunan' && p.id === id));
          } else {
            if (prev.length > 0 && prev[0].type !== 'bangunan') {
              alert('Mode multi hanya bisa untuk 1 tipe polygon (NOP/Blok/Bangunan)');
              return prev;
            }
            return [...prev, { type: 'bangunan', id, code }];
          }
        });
      } else {
        setEditingType('bangunan');
        setEditingId(id);
      }
    }
  }, [editMode, multiEditMode]);

  // Handle save button click from PolygonEditLayer
  const handlePolygonEditSaveClick = useCallback((type: EditLayerType, id: string | number, coordinates: number[][], code: string, existingImages?: string[]) => {
    setEditPolygonCoordinates(coordinates);
    setEditPolygonCode(code);
    setEditPolygonImages(existingImages || []);
    setShowPolygonEditModal(true);
  }, []);

  // Handle save polygon edit (generic for all types)
  const handleSavePolygonEdit = useCallback(async (data: PolygonEditData) => {
    try {
      let apiUrl: string;
      let body: any;

      if (data.type === 'nop') {
        // NOP uses FormData for file uploads
        const formData = new FormData();
        formData.append('nop', data.code);
        formData.append('coordinates', JSON.stringify(data.coordinates));

        if (data.deletedImages && data.deletedImages.length > 0) {
          formData.append('deletedImages', JSON.stringify(data.deletedImages));
        }

        if (data.files) {
          data.files.forEach((file: File) => {
            formData.append('files', file);
          });
        }

        const response = await fetch('/api/nops/update', {
          method: 'PUT',
          body: formData,
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.message);
      } else {
        // Blok and Bangunan use JSON
        apiUrl = data.type === 'blok' ? '/api/bloks/update' : '/api/bangunans/update';
        body = {
          id: data.id,
          coordinates: data.coordinates,
          ...(data.type === 'blok' ? { d_blok: data.code } : { d_nop: data.code }),
        };

        const response = await fetch(apiUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.message);
      }

      // Reset edit state and refresh appropriate layer
      setEditingType(null);
      setEditingId(null);

      if (data.type === 'nop') {
        setNopRefreshKey(prev => prev + 1);
      } else if (data.type === 'blok') {
        setBlokRefreshKey(prev => prev + 1);
      } else {
        setBangunanRefreshKey(prev => prev + 1);
      }

      // Show success message
      const typeLabel = data.type === 'nop' ? 'NOP' : data.type === 'blok' ? 'Blok' : 'Bangunan';
      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: `${typeLabel} berhasil diperbarui`,
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal!',
        text: error.message || 'Terjadi kesalahan saat memperbarui',
      });
      throw error;
    }
  }, []);

  // Handle cancel polygon edit
  const handleCancelPolygonEdit = useCallback(() => {
    setEditingType(null);
    setEditingId(null);
  }, []);

  // Handle delete polygon (generic for all types)
  const handleDeletePolygon = useCallback(async (type: EditLayerType, id: string | number, code: string) => {
    try {
      let apiUrl: string;
      let body: any;

      if (type === 'nop') {
        apiUrl = '/api/nops/delete';
        body = { nop: code };
      } else if (type === 'blok') {
        apiUrl = '/api/bloks/delete';
        body = { id };
      } else {
        apiUrl = '/api/bangunans/delete';
        body = { id };
      }

      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message);
      }

      // Reset state and refresh layer
      setEditingType(null);
      setEditingId(null);

      if (type === 'nop') {
        setNopRefreshKey(prev => prev + 1);
      } else if (type === 'blok') {
        setBlokRefreshKey(prev => prev + 1);
      } else {
        setBangunanRefreshKey(prev => prev + 1);
      }

      // Show success message
      const typeLabel = type === 'nop' ? 'NOP' : type === 'blok' ? 'Blok' : 'Bangunan';
      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: `${typeLabel} berhasil dihapus`,
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error: any) {
      console.error('Error deleting polygon:', error);
      Swal.fire({
        icon: 'error',
        title: 'Gagal!',
        text: error.message || 'Terjadi kesalahan saat menghapus',
      });
    }
  }, []);

  // Handle batch save for multi-polygon edit
  const handleBatchSave = useCallback(async (updates: Array<{ type: EditLayerType; id: string | number; code: string; coordinates: number[][] }>) => {
    try {
      const type = updates[0]?.type;
      let successCount = 0;

      for (const update of updates) {
        try {
          if (update.type === 'nop') {
            const formData = new FormData();
            formData.append('nop', update.code);
            formData.append('coordinates', JSON.stringify(update.coordinates));

            const response = await fetch('/api/nops/update', {
              method: 'PUT',
              body: formData,
            });
            const result = await response.json();
            if (result.success) successCount++;
          } else {
            const apiUrl = update.type === 'blok' ? '/api/bloks/update' : '/api/bangunans/update';
            const body = {
              id: update.id,
              coordinates: update.coordinates,
              ...(update.type === 'blok' ? { d_blok: update.code } : { d_nop: update.code }),
            };

            const response = await fetch(apiUrl, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            });
            const result = await response.json();
            if (result.success) successCount++;
          }
        } catch (error) {
          console.error(`Error saving ${update.type} ${update.id}:`, error);
        }
      }

      // Clear selection
      setSelectedPolygonsForMultiEdit([]);

      // Refresh layer
      if (type === 'nop') {
        setNopRefreshKey(prev => prev + 1);
      } else if (type === 'blok') {
        setBlokRefreshKey(prev => prev + 1);
      } else {
        setBangunanRefreshKey(prev => prev + 1);
      }

      // Show success message
      const typeLabel = type === 'nop' ? 'NOP' : type === 'blok' ? 'Blok' : 'Bangunan';
      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: `${successCount}/${updates.length} ${typeLabel} berhasil disimpan`,
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal!',
        text: error.message || 'Terjadi kesalahan saat menyimpan',
      });
      throw error;
    }
  }, []);

  // Handle cancel multi-edit
  const handleCancelMultiEdit = useCallback(() => {
    setSelectedPolygonsForMultiEdit([]);
  }, []);

  // Force clear Leaflet cache on mount
  useEffect(() => {
    // Clear localStorage yang mungkin menyimpan map state
    if (typeof window !== 'undefined') {
      localStorage.removeItem('leaflet.map');
      sessionStorage.clear();
    }
  }, []);

  // Auto-hide layers when tematik is active, restore when closed
  // Also zoom to desa bounds when tematik is selected
  useEffect(() => {
    if (activeTematik) {
      // Save current visible layers before hiding
      if (savedLayersBeforeTematik === null) {
        setSavedLayersBeforeTematik(new Set(visibleLayers));
      }
      // Hide nops, bloks, bangunans when tematik is active
      const newLayers = new Set(visibleLayers);
      newLayers.delete('nops');
      newLayers.delete('bloks');
      newLayers.delete('bangunans');
      setVisibleLayers(newLayers);

      // Zoom back to desa bounds when tematik is selected
      if (selectedDesaBounds && mapRef.current) {
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        mapRef.current.fitBounds(selectedDesaBounds, {
          padding: [30, 30],
          maxZoom: isMobile ? 13 : 18
        });
      }
    } else {
      // Restore layers when tematik is closed
      if (savedLayersBeforeTematik !== null) {
        setVisibleLayers(savedLayersBeforeTematik);
        setSavedLayersBeforeTematik(null);
      }
      // Clear tematik categories
      setTematikCategories([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTematik, tematikKey]);

  // Handle search result - navigate to desa, show NOP polygon, and open info modal
  useEffect(() => {
    if (!searchNop || !searchDesaKode || !mapRef.current) return;

    const handleSearch = async () => {
      try {
        // First, show desas layer and reset to desas view
        const newLayers = new Set(['desas']);
        setVisibleLayers(newLayers);

        // Fetch desas to find the target one  
        const url = `/api/desas/all?desa=${searchDesaKode}`;
        const response = await fetch(url);
        const geojson = await response.json();

        if (geojson.features && geojson.features.length > 0) {
          const targetFeature = geojson.features[0];
          const props = targetFeature.properties;

          // Create GeoJSON layer to get bounds
          const geoJsonLayer = L.geoJSON(targetFeature);
          const bounds = geoJsonLayer.getBounds();

          // Set selected desa
          setSelectedDesaKode(props.d_kd_kel);
          setSelectedDesaNama(props.d_nm_kel);
          setSelectedDesaBounds(bounds);

          // Notify parent
          if (onDesaChange) {
            onDesaChange(props.d_kd_kel);
          }

          // Hide desa layer, show NOP layer
          const nopLayers = new Set(['nops']);
          setVisibleLayers(nopLayers);

          // Zoom to desa first
          const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
          mapRef.current?.fitBounds(bounds, {
            padding: [30, 30],
            maxZoom: isMobile ? 13 : 18
          });

          // Now fetch the specific NOP polygon
          const nopResponse = await fetch(`/api/nops/${searchNop}`);
          const nopData = await nopResponse.json();

          if (nopData.success && nopData.data && nopData.data.geometry) {
            // Create GeoJSON layer for NOP to get bounds
            const nopGeoJson = L.geoJSON(nopData.data);
            const nopBounds = nopGeoJson.getBounds();

            // Zoom to NOP polygon and highlight it with red color
            setTimeout(() => {
              mapRef.current?.fitBounds(nopBounds, {
                padding: [50, 50],
                maxZoom: 21
              });

              // Set highlighted NOP data for red highlight effect
              setHighlightedNopData(nopData.data);
            }, 500);
          } else {
            // NOP polygon not found in local database, show info modal for SISMIOP data
            setInfoNop(searchNop);
            setShowNopInfoModal(true);
          }
        }

        // Clear internal search state
        setSearchNop(null);
        setSearchDesaKode(null);

      } catch (error) {
        console.error('Error handling search:', error);
        // Clear internal search state on error
        setSearchNop(null);
        setSearchDesaKode(null);
      }
    };

    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchNop, searchDesaKode]);

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={[mapConfig.center.lat, mapConfig.center.lng] as any}
        zoom={initialZoom}
        maxZoom={mapConfig.maxZoom}
        className="w-full h-full"
      >
        {/* Zoom Logger - Console log zoom level on zoom */}
        <ZoomLogger />
        {/* Map Ref Setter - Capture map instance for external control */}
        <MapRefSetter mapRef={mapRef} />
        {/* Render TileLayer with key to force re-render on basemap change */}
        {currentBasemap && (
          <TileLayer
            key={currentBasemap.id}
            url={currentBasemap.url}
            attribution={currentBasemap.attribution}
            maxZoom={21}
            subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
          />
        )}

        {/* Desa Layer - Load all desas at once (filtered by user role) */}
        <DesaFullLayer
          visible={visibleLayers.has('desas')}
          userKodeWilayah={userKodeWilayah}
          userRole={userRole}
          color={layerStyles.desas?.color || '#10b981'}
          fillOpacity={layerStyles.desas?.opacity || 0.3}
          onDesaClick={(feature) => {
            // Hide desa layer
            const newLayers = new Set(visibleLayers);
            newLayers.delete('desas');

            // Show nops layer only (bloks and bangunan can be enabled manually)
            newLayers.add('nops');
            setVisibleLayers(newLayers);

            // Set selected desa kode and nama for filtering
            setSelectedDesaKode(feature.properties.d_kd_kel);
            setSelectedDesaNama(feature.properties.d_nm_kel);

            // Save desa bounds for later zoom reset
            if (feature.geometry && mapRef.current) {
              try {
                const geoJsonLayer = L.geoJSON(feature);
                setSelectedDesaBounds(geoJsonLayer.getBounds());
              } catch (e) {
                console.error('Error getting desa bounds:', e);
              }
            }

            // Notify parent of desa change
            if (onDesaChange) {
              onDesaChange(feature.properties.d_kd_kel);
            }
          }}
        />

        {/* MVT Tile Layer for NOP - Binary vector tiles (hidden when tematik active) */}
        {/* Keep visible during multi-edit mode so user can click more polygons to add to selection */}
        <MVTTileLayer
          key={`nops-${nopRefreshKey}`}
          url="/api/tiles/nops/mvt"
          name="NOP"
          color={layerStyles.nops?.color || '#00FFFF'}
          weight={2}
          opacity={1}
          fillOpacity={layerStyles.nops?.opacity || 0.15}
          desaKode={selectedDesaKode}
          visible={visibleLayers.has('nops') && !activeTematik}
          editMode={editMode}
          onNopClick={handleNopClick}
          refreshKey={nopRefreshKey}
        />

        {/* Highlighted NOP from Search - Red highlight polygon */}
        {highlightedNopData && (
          <GeoJSON
            key={`highlight-${highlightedNopData.properties?.d_nop || 'nop'}`}
            data={highlightedNopData}
            style={{
              color: '#ff0000',
              weight: 4,
              opacity: 1,
              fillColor: '#ff0000',
              fillOpacity: 0.3,
            }}
            eventHandlers={{
              click: () => {
                // Open NOP info modal when clicking the highlighted polygon
                const nop = highlightedNopData.properties?.d_nop;
                if (nop) {
                  setInfoNop(nop);
                  setShowNopInfoModal(true);
                }
                // Clear highlight after click
                setHighlightedNopData(null);
              },
            }}
          />
        )}

        {/* Polygon Edit Layer - Shown when editing a specific polygon */}
        {editingType && editingId && (
          <PolygonEditLayer
            type={editingType}
            id={editingId}
            visible={!!editingType}
            onSaveClick={handlePolygonEditSaveClick}
            onDelete={handleDeletePolygon}
            onCancel={handleCancelPolygonEdit}
          />
        )}

        {/* Multi-Polygon Edit Layer - Shown when in multi-edit mode with selections */}
        {multiEditMode && selectedPolygonsForMultiEdit.length > 0 && (
          <MultiPolygonEditLayer
            selectedPolygons={selectedPolygonsForMultiEdit}
            visible={multiEditMode && selectedPolygonsForMultiEdit.length > 0}
            onSaveAll={handleBatchSave}
            onCancel={handleCancelMultiEdit}
          />
        )}

        {/* Canvas-based NOP Labels Layer (much lighter than marker-based) */}
        {/* Keep labels visible even during edit mode so user can see NOP numbers */}
        <NopLabelsCanvasLayer
          desaKode={selectedDesaKode}
          visible={visibleLayers.has('nops') && !activeTematik}
          minZoom={18}
        />

        {/* Tematik Layer - Always render so cleanup runs properly */}
        {selectedDesaKode && (
          <TematikLayer
            key={`tematik-layer-${tematikKey}`}
            desaKode={selectedDesaKode}
            tematik={activeTematik}
            visible={!!activeTematik}
            onCategoriesChange={setTematikCategories}
            onNopClick={(nop, category) => {
              setInfoNop(nop);
              setInfoTematikCategory(category);
              setShowNopInfoModal(true);
            }}
          />
        )}

        {/* Blok Layer - Load all bloks for selected desa */}
        <BlokFullLayer
          key={`bloks-${blokRefreshKey}`}
          desaKode={selectedDesaKode}
          visible={visibleLayers.has('bloks') && !(multiEditMode && selectedPolygonsForMultiEdit.length > 0)}
          color={layerStyles.bloks?.color || '#FF00FF'}
          weight={2}
          opacity={1}
          fillOpacity={layerStyles.bloks?.opacity || 0.1}
          editMode={editMode}
          onFeatureClick={handleBlokClick}
          refreshKey={blokRefreshKey}
        />

        {/* MVT Tile Layer for Bangunan - same method as NOP */}
        <MVTTileLayer
          key={`bangunans-${bangunanRefreshKey}`}
          url="/api/tiles/bangunans/mvt"
          name="Bangunan"
          color={layerStyles.bangunans?.color || '#ff0000'}
          weight={1}
          opacity={1}
          fillOpacity={layerStyles.bangunans?.opacity || 0.3}
          desaKode={selectedDesaKode}
          visible={visibleLayers.has('bangunans') && !(multiEditMode && selectedPolygonsForMultiEdit.length > 0)}
          editMode={editMode}
          onFeatureClick={handleBangunanClick}
          refreshKey={bangunanRefreshKey}
        />

        {/* Drawing Tools - Only visible in edit mode and not editing existing polygon */}
        <DrawingTools
          enabled={editMode && !editingType}
          onPolygonCreated={handlePolygonCreated}
        />

      </MapContainer>

      {/* Clear Tematik Button - Next to Layer Control button (top right) */}
      {activeTematik && onClearTematik && (
        <div className="absolute top-4 landscape:top-2 right-16 landscape:right-14 z-[1000]">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClearTematik();
            }}
            className="bg-white hover:bg-gray-50 text-red-500 hover:text-red-600 rounded-lg p-3 landscape:p-2 shadow-lg transition-colors border border-gray-300"
            title="Hapus Layer Tematik"
          >
            <svg className="w-6 h-6 landscape:w-5 landscape:h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.36 2.72l1.42 1.42-5.72 5.71c1.07 1.54 1.22 3.39.32 4.59L9.06 8.12c1.2-.9 3.05-.75 4.59.32l5.71-5.72zM5.93 17.57c-2.01-2.01-3.24-4.41-3.58-6.65l4.88-2.09 7.44 7.44-2.09 4.88c-2.24-.34-4.64-1.57-6.65-3.58z" />
            </svg>
          </button>
        </div>
      )}

      {/* Combined Desa and Tematik Indicators - Top Left (after zoom controls), stacked vertically on mobile */}
      {(selectedDesaNama || activeTematik) && (
        <div className="absolute top-3 left-12 sm:left-14 z-[999] flex flex-col sm:flex-row items-start sm:items-center gap-2">
          {/* Selected Desa Indicator - Shows first (on top in mobile) */}
          {selectedDesaNama && (
            <div className="bg-emerald-600 text-white px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg shadow-lg flex items-center gap-1 sm:gap-2">
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs sm:text-sm font-semibold">{selectedDesaNama}</span>
            </div>
          )}

          {/* Active Tematik Indicator - Shows second (below in mobile) */}
          {activeTematik && (
            <div className="bg-emerald-600 text-white px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg shadow-lg flex items-center gap-1 sm:gap-2">
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <span className="text-xs sm:text-sm font-semibold">{activeTematik.replace(/_/g, ' ').toUpperCase()}</span>
              {onClearTematik && (
                <button
                  onClick={onClearTematik}
                  className="p-0.5 hover:bg-white/20 rounded transition-colors"
                  title="Hapus Layer Tematik"
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Search Button - Top Right, next to Layer Panel */}
      <div className="absolute top-4 landscape:top-2 right-16 z-[1000]">
        <button
          onClick={() => {
            // Clear tematik before opening search
            if (onClearTematik) {
              onClearTematik();
            }
            setShowSearchModal(true);
          }}
          className="bg-white hover:bg-gray-50 text-emerald-600 rounded-lg p-3 landscape:p-2 shadow-lg transition-colors border border-gray-300"
          title="Pencarian Objek Pajak"
        >
          <Search size={24} className="landscape:w-5 landscape:h-5" />
        </button>
      </div>

      {/* Layer Panel - Top Right */}
      <LayerPanel
        selectedDesaKode={selectedDesaKode}
        onDesaSelect={(desaKode) => {
          if (desaKode === '') {
            // Reset desa selection
            setSelectedDesaKode(undefined);
            setSelectedDesaNama(undefined);
          } else {
            setSelectedDesaKode(desaKode);
          }
        }}
        visibleLayers={visibleLayers}
        onLayerVisibilityChange={(layerId, visible) => {
          const newLayers = new Set(visibleLayers);
          if (visible) {
            newLayers.add(layerId);
            // Auto zoom to layer bounds when layer is made visible
            if (layerId === 'desas') {
              handleLayerZoom(layerId);
            }
          } else {
            newLayers.delete(layerId);
          }
          setVisibleLayers(newLayers);
        }}
        layerStyles={layerStyles}
        onLayerStyleChange={handleLayerStyleChange}
      />

      {/* Basemap Selector - Bottom Right */}
      <BasemapSelector
        currentBasemap={currentBasemap.id}
        onBasemapChange={handleBasemapChange}
      />

      {/* Tematik Legend - Bottom Left */}
      {activeTematik && tematikCategories.length > 0 && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-white rounded-xl shadow-lg border border-gray-200 p-2 md:p-5 max-w-[150px] md:max-w-sm max-h-28 md:max-h-[30vh] md:min-h-[150px] overflow-y-auto">
          <h4 className="text-xs md:text-base font-semibold text-gray-800 mb-2 md:mb-4">Legenda</h4>
          <div className="space-y-1 md:space-y-3">
            {tematikCategories.map(category => (
              <div
                key={category}
                className="flex items-center gap-1 md:gap-3 cursor-pointer hover:bg-gray-100 rounded p-0.5 -m-0.5 transition-colors"
                onClick={() => {
                  // Zoom back to desa bounds when clicking legend item
                  if (selectedDesaBounds && mapRef.current) {
                    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
                    mapRef.current.fitBounds(selectedDesaBounds, {
                      padding: [30, 30],
                      maxZoom: isMobile ? 13 : 18
                    });
                  }
                }}
                title="Klik untuk zoom ke desa"
              >
                <div
                  className="w-3 h-3 md:w-5 md:h-5 rounded-sm shrink-0"
                  style={{
                    backgroundColor: getCategoryColor(category, activeTematik),
                    border: `2px solid ${getCategoryColor(category, activeTematik)}`
                  }}
                />
                <span className="text-[10px] md:text-sm text-gray-700">{category}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save Polygon Modal */}
      <SavePolygonModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSavePolygon}
        coordinates={drawnCoordinates}
        defaultDesaKode={selectedDesaKode || ''}
      />

      {/* NOP Info Modal - Show when not in edit mode */}
      {infoNop && (
        <NopInfoModal
          isOpen={showNopInfoModal}
          onClose={() => {
            setShowNopInfoModal(false);
            setInfoNop(null);
            setInfoTematikCategory(null);
          }}
          nop={infoNop}
          userRole={userRole}
          tematikCategory={infoTematikCategory || undefined}
        />
      )}

      {/* Polygon Edit Modal - Show after clicking save in edit layer */}
      {editingType && editingId && (
        <PolygonEditModal
          isOpen={showPolygonEditModal}
          onClose={() => {
            setShowPolygonEditModal(false);
            // Reset edit state so MVT layer reappears
            setEditingType(null);
            setEditingId(null);
          }}
          onSave={handleSavePolygonEdit}
          type={editingType}
          id={editingId}
          code={editPolygonCode}
          coordinates={editPolygonCoordinates}
          existingImages={editPolygonImages}
        />
      )}

      {/* Search Modal */}
      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSearchResult={(nop, desaKode) => {
          // Clear active tematik before searching
          if (onClearTematik) {
            onClearTematik();
          }
          // Set search state to trigger navigation
          setSearchNop(nop);
          setSearchDesaKode(desaKode);
        }}
        userRole={userRole}
        userKodeWilayah={userKodeWilayah}
      />
    </div>
  );
}
