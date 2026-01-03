'use client';

import { useState } from 'react';
import { ChevronDown, Eye, EyeOff, Layers, Palette } from 'lucide-react';

interface Layer {
  id: string;
  name: string;
  category: string;
  visible: boolean;
  opacity: number;
  url?: string;
  color?: string;
  requiresFilter?: boolean;
}

interface LayerCategory {
  name: string;
  layers: Layer[];
}

export interface LayerStyle {
  color: string;
  opacity: number;
}

interface LayerPanelProps {
  selectedDesaKode?: string;
  onDesaSelect?: (desaKode: string) => void;
  visibleLayers?: Set<string>;
  onLayerVisibilityChange?: (layerId: string, visible: boolean) => void;
  layerStyles?: Record<string, LayerStyle>;
  onLayerStyleChange?: (layerId: string, style: LayerStyle) => void;
}

export default function LayerPanel({
  selectedDesaKode,
  onDesaSelect,
  visibleLayers = new Set(['desas']),
  onLayerVisibilityChange,
  layerStyles = {},
  onLayerStyleChange,
}: LayerPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['Data Spasial'])
  );
  const [expandedStyles, setExpandedStyles] = useState<Set<string>>(new Set());
  const [layers, setLayers] = useState<LayerCategory[]>([
    {
      name: 'Data Spasial',
      layers: [
        {
          id: 'desas',
          name: 'Desa',
          category: 'Data Spasial',
          visible: true,
          opacity: 1,
          url: '/api/tiles/desas',
          color: '#10b981',
          requiresFilter: false,
        },
        {
          id: 'nops',
          name: 'NOP',
          category: 'Data Spasial',
          visible: false,
          opacity: 1,
          url: '/api/tiles/nops',
          color: '#3388ff',
          requiresFilter: true,
        },
        {
          id: 'bloks',
          name: 'Blok',
          category: 'Data Spasial',
          visible: false,
          opacity: 1,
          url: '/api/tiles/bloks',
          color: '#ff7800',
          requiresFilter: true,
        },
        {
          id: 'bangunans',
          name: 'Bangunan',
          category: 'Data Spasial',
          visible: false,
          opacity: 1,
          url: '/api/tiles/bangunans',
          color: '#ff0000',
          requiresFilter: true,
        },
      ],
    },
  ]);

  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleStylePanel = (layerId: string) => {
    const newExpanded = new Set(expandedStyles);
    if (newExpanded.has(layerId)) {
      newExpanded.delete(layerId);
    } else {
      newExpanded.add(layerId);
    }
    setExpandedStyles(newExpanded);
  };

  // Default styles for each layer
  const defaultStyles: Record<string, LayerStyle> = {
    desas: { color: '#10b981', opacity: 0.3 },
    nops: { color: '#00FFFF', opacity: 0.15 },
    bloks: { color: '#FF00FF', opacity: 0.1 },
    bangunans: { color: '#ff0000', opacity: 0.3 },
  };

  const handleColorChange = (layerId: string, color: string) => {
    if (onLayerStyleChange) {
      const currentStyle = layerStyles[layerId] || defaultStyles[layerId] || { color: '#3388ff', opacity: 0.3 };
      onLayerStyleChange(layerId, { ...currentStyle, color });
    }
  };

  const handleOpacityChange = (layerId: string, opacity: number) => {
    if (onLayerStyleChange) {
      const currentStyle = layerStyles[layerId] || defaultStyles[layerId] || { color: '#3388ff', opacity: 0.3 };
      onLayerStyleChange(layerId, { ...currentStyle, opacity });
    }
  };

  const handleResetStyle = (layerId: string) => {
    if (onLayerStyleChange && defaultStyles[layerId]) {
      onLayerStyleChange(layerId, defaultStyles[layerId]);
    }
  };

  const toggleLayerVisibility = (layerId: string) => {
    const layer = layers
      .flatMap((c) => c.layers)
      .find((l) => l.id === layerId);

    // Jika layer memerlukan filter dan tidak ada desa yang dipilih, jangan toggle
    if (layer?.requiresFilter && !selectedDesaKode) {
      alert('Pilih desa terlebih dahulu untuk menampilkan layer ini');
      return;
    }

    const isCurrentlyVisible = visibleLayers.has(layerId);
    const newVisibility = !isCurrentlyVisible;

    // Special handling for desa layer
    if (layerId === 'desas' && newVisibility) {
      // When showing desa layer, hide other layers and reset selected desa
      if (onLayerVisibilityChange) {
        // Hide all other layers
        ['nops', 'bloks', 'bangunans'].forEach((id) => {
          if (visibleLayers.has(id)) {
            onLayerVisibilityChange(id, false);
          }
        });
        // Show desa layer
        onLayerVisibilityChange('desas', true);
      }
      // Reset selected desa
      if (onDesaSelect) {
        onDesaSelect('');
      }
      return;
    }

    // Notify parent component
    if (onLayerVisibilityChange) {
      onLayerVisibilityChange(layerId, newVisibility);
    }

    setLayers(
      layers.map((category) => ({
        ...category,
        layers: category.layers.map((l) =>
          l.id === layerId ? { ...l, visible: newVisibility } : l
        ),
      }))
    );
  };

  const deleteLayer = (layerId: string) => {
    setLayers(
      layers.map((category) => ({
        ...category,
        layers: category.layers.filter((layer) => layer.id !== layerId),
      }))
    );
  };

  return (
    <div className="absolute top-4 landscape:top-2 right-4 z-[1000]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white hover:bg-gray-50 text-emerald-600 rounded-lg p-3 landscape:p-2 shadow-lg transition-colors border border-gray-300"
        title="Layer Control"
      >
        <Layers size={24} className="landscape:w-5 landscape:h-5" />
      </button>

      {isOpen && (
        <div className="absolute top-14 right-0 bg-white rounded-xl shadow-2xl border border-gray-100 w-72 max-h-[70vh] md:max-h-none overflow-hidden z-[1001]">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-3 rounded-t-xl">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-white/90" />
              <h2 className="text-sm font-semibold text-white">Layer Control</h2>
            </div>
          </div>

          {/* Layer list */}
          <div className="p-3 space-y-2 max-h-[50vh] overflow-y-auto">
            {layers.flatMap((category) => category.layers).map((layer) => {
              const isDisabled = layer.requiresFilter && !selectedDesaKode;
              const isVisible = visibleLayers.has(layer.id);
              const currentStyle = layerStyles[layer.id] || { color: layer.color || '#3388ff', opacity: 0.3 };
              const isStyleExpanded = expandedStyles.has(layer.id);

              return (
                <div
                  key={layer.id}
                  className={`rounded-lg border transition-all duration-200 ${isStyleExpanded
                    ? 'border-emerald-200 shadow-md'
                    : 'border-gray-100 hover:border-gray-200'
                    }`}
                >
                  {/* Layer row */}
                  <div
                    className={`flex items-center justify-between p-2.5 ${isDisabled
                      ? 'opacity-50 cursor-not-allowed bg-gray-50'
                      : 'hover:bg-gray-50/50'
                      }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {/* Color indicator dot */}
                      <div
                        className="w-3 h-3 rounded-full ring-2 ring-white shadow-sm shrink-0"
                        style={{ backgroundColor: currentStyle.color }}
                      />
                      {/* Visibility toggle */}
                      <button
                        onClick={() => !isDisabled && toggleLayerVisibility(layer.id)}
                        className={`p-1.5 rounded-lg transition-all duration-200 ${isDisabled
                          ? 'cursor-not-allowed'
                          : isVisible
                            ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                            : 'text-gray-400 hover:bg-gray-100'
                          }`}
                        disabled={isDisabled}
                        title={isDisabled ? 'Pilih desa terlebih dahulu' : `Toggle ${layer.name}`}
                      >
                        {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                      {/* Layer name */}
                      <span className={`text-sm font-medium flex-1 ${isDisabled ? 'text-gray-400' : 'text-gray-700'}`}>
                        {layer.name}
                        {isDisabled && (
                          <span className="text-xs text-gray-400 ml-1 font-normal">(Pilih desa)</span>
                        )}
                      </span>
                    </div>
                    {/* Style button */}
                    <button
                      onClick={() => toggleStylePanel(layer.id)}
                      className={`p-1.5 rounded-lg transition-all duration-200 ${isStyleExpanded
                        ? 'bg-emerald-100 text-emerald-600 rotate-0'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                        }`}
                      title="Ubah warna & transparansi"
                    >
                      <Palette size={16} />
                    </button>
                  </div>

                  {/* Style controls panel - animated */}
                  {isStyleExpanded && (
                    <div className="px-3 pb-3 pt-2 bg-gradient-to-b from-gray-50 to-white border-t border-gray-100">
                      <div className="space-y-3">
                        {/* Color picker */}
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 w-12">Warna</span>
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="color"
                              value={currentStyle.color}
                              onChange={(e) => handleColorChange(layer.id, e.target.value)}
                              className="w-8 h-8 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-emerald-300 transition-colors"
                            />
                            <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-1 rounded">{currentStyle.color}</span>
                          </div>
                        </div>
                        {/* Opacity slider */}
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 w-12">Opacity</span>
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={Math.round(currentStyle.opacity * 100)}
                              onChange={(e) => handleOpacityChange(layer.id, parseInt(e.target.value) / 100)}
                              className="flex-1 h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-emerald-500"
                            />
                            <span className="text-xs text-gray-500 font-medium w-10 text-right">{Math.round(currentStyle.opacity * 100)}%</span>
                          </div>
                        </div>
                        {/* Reset button */}
                        <button
                          onClick={() => handleResetStyle(layer.id)}
                          className="w-full text-xs text-gray-500 hover:text-emerald-600 bg-gray-100 hover:bg-emerald-50 py-2 px-3 rounded-lg transition-all duration-200 font-medium"
                        >
                          ↺ Reset ke Default
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
