'use client';

import { useState } from 'react';
import { Map, Satellite, Mountain, Moon } from 'lucide-react';

interface Basemap {
  id: string;
  name: string;
  url: string;
  attribution: string;
  icon: React.ReactNode;
}

interface BasemapSelectorProps {
  onBasemapChange: (basemap: Basemap) => void;
  currentBasemap: string;
}

export default function BasemapSelector({
  onBasemapChange,
  currentBasemap,
}: BasemapSelectorProps) {
  const basemaps: Basemap[] = [
    {
      id: 'osm',
      name: 'OpenStreetMap',
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      icon: <Map size={20} />,
    },
    {
      id: 'satellite',
      name: 'Satellite',
      url: 'http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      attribution: '&copy; Google Maps',
      icon: <Satellite size={20} />,
    },
    {
      id: 'terrain',
      name: 'Terrain',
      url: 'http://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
      attribution: '&copy; Google Maps',
      icon: <Mountain size={20} />,
    },
    {
      id: 'dark',
      name: 'Dark',
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      icon: <Moon size={20} />,
    },
  ];

  const selectedBasemap = basemaps.find((b) => b.id === currentBasemap) || basemaps[0];

  return (
    <div className="absolute bottom-4 right-4 z-[1000] flex flex-col landscape:flex-row bg-white rounded-lg shadow-lg border border-gray-300 overflow-hidden">
      {basemaps.map((basemap, index) => (
        <button
          key={basemap.id}
          onClick={() => onBasemapChange(basemap)}
          className={`p-2 transition-all flex items-center justify-center ${index !== basemaps.length - 1 ? 'border-b landscape:border-b-0 landscape:border-r border-gray-300' : ''
            } ${currentBasemap === basemap.id
              ? 'bg-emerald-600 text-white'
              : 'text-gray-600 hover:bg-gray-50'
            }`}
          title={basemap.name}
        >
          <span className="scale-75">{basemap.icon}</span>
        </button>
      ))}
    </div>
  );
}
