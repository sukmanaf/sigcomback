'use client';

import Navbar from '@/components/Navbar';

export default function SettingsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      <main className="flex-1 p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-emerald-900 mb-6">Settings</h1>

          <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-xl font-semibold text-emerald-900 mb-4">Application Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Basemap
                  </label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900">
                    <option>OpenStreetMap</option>
                    <option>Satellite</option>
                    <option>Terrain</option>
                    <option>Dark</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-xl font-semibold text-emerald-900 mb-4">Map Settings</h2>
              <div className="space-y-4">
                <label className="flex items-center gap-3">
                  <input type="checkbox" defaultChecked className="w-4 h-4 text-emerald-600" />
                  <span className="text-gray-700">Show layer panel by default</span>
                </label>
                <label className="flex items-center gap-3">
                  <input type="checkbox" defaultChecked className="w-4 h-4 text-emerald-600" />
                  <span className="text-gray-700">Show basemap selector</span>
                </label>
              </div>
            </div>

            <div>
              <button className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors">
                Save Settings
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
