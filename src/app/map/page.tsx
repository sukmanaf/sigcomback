'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center">
        <div className="mb-6">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-200 border-t-emerald-600 mx-auto"></div>
        </div>
        <p className="text-lg font-semibold text-gray-700 mb-2">Loading SmartMap</p>
        <p className="text-sm text-gray-500">Initializing map and layers...</p>
        <div className="mt-4 flex justify-center gap-1">
          <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  ),
});

export default function MapPage() {
  const router = useRouter();
  const { user, loading, canEdit } = useAuth();
  const [basemap, setBasemap] = useState('osm');
  const [editMode, setEditMode] = useState(false);
  const [activeTematik, setActiveTematik] = useState('');
  const [tematikKey, setTematikKey] = useState(0);
  const [desaKode, setDesaKode] = useState('');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  // Handler to always trigger re-mount when same tematik is clicked
  const handleTematikChange = (newTematik: string) => {
    if (newTematik === activeTematik) {
      // Same tematik clicked - increment key to force re-mount
      setTematikKey(prev => prev + 1);
    } else {
      setActiveTematik(newTematik);
    }
  };

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-200 border-t-emerald-600 mx-auto"></div>
          <p className="text-lg font-semibold text-gray-700 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  // Handler to clear tematik
  const handleClearTematik = () => {
    setActiveTematik('');
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-white">
      <Navbar
        editMode={editMode}
        onEditModeChange={canEdit ? setEditMode : undefined}
        onTematikChange={handleTematikChange}
        activeTematik={activeTematik}
        desaKode={desaKode}
      />
      <div className="flex-1 w-full h-full overflow-hidden">
        <MapComponent
          basemap={basemap}
          onBasemapChange={setBasemap}
          editMode={canEdit ? editMode : false}
          activeTematik={activeTematik}
          tematikKey={tematikKey}
          onDesaChange={setDesaKode}
          onClearTematik={handleClearTematik}
          userKodeWilayah={user.kodeWilayah}
          userRole={user.role}
        />
      </div>
    </div>
  );
}

