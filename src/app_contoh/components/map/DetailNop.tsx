import React from 'react';
import { MapGeoJSONFeature } from 'maplibre-gl';

interface DetailNopProps {
  feature?: MapGeoJSONFeature;
  onClose: () => void;
  visible: boolean;
}

const DetailNop: React.FC<DetailNopProps> = ({ feature, onClose, visible }) => {
  if (!visible || !feature) return null;

  // Extract properties from the feature
  const properties = feature.properties || {};
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Detail Objek Pajak PBB</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Left Column */}
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">NOP</p>
              <p className="font-medium">{properties.d_nop || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Nama Wajib Pajak</p>
              <p className="font-medium">{properties.nama_wp || 'Nama WP'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Alamat Wajib Pajak</p>
              <p className="font-medium">{properties.alamat_wp || 'Alamat WP'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Kelurahan</p>
              <p className="font-medium">{properties.kelurahan || '-'}</p>
            </div>
          </div>
          
          {/* Right Column */}
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Luas Tanah</p>
              <p className="font-medium">{properties.d_luas || '-'} m²</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Kelas Tanah</p>
              <p className="font-medium">{properties.kelas_tanah || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">NJOP Tanah</p>
              <p className="font-medium">Rp {properties.njop_tanah || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Tahun Pajak</p>
              <p className="font-medium">{properties.tahun || new Date().getFullYear()}</p>
            </div>
          </div>
        </div>
        
        {/* Additional information section */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h3 className="font-semibold mb-2">Informasi Bangunan</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Luas Bangunan</p>
              <p className="font-medium">{properties.luas_bangunan || '-'} m²</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">NJOP Bangunan</p>
              <p className="font-medium">Rp {properties.njop_bangunan || '-'}</p>
            </div>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="mt-6 flex justify-end space-x-2">
          <button 
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            onClick={onClose}
          >
            Tutup
          </button>
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => {
              // Handle print or export action
              console.log('Print or export data', properties);
            }}
          >
            Cetak
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetailNop;