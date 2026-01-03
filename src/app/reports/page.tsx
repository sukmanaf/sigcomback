'use client';

import Navbar from '@/components/Navbar';

export default function ReportsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-emerald-900 mb-6">Reports & Analytics</h1>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-600 mb-4">Reports and analytics interface coming soon...</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="border-2 border-dashed border-emerald-300 rounded-lg p-8 text-center">
                <div className="text-4xl mb-2">📈</div>
                <h3 className="font-semibold text-emerald-900">Statistics</h3>
                <p className="text-sm text-gray-600 mt-2">View spatial statistics</p>
              </div>
              
              <div className="border-2 border-dashed border-emerald-300 rounded-lg p-8 text-center">
                <div className="text-4xl mb-2">📋</div>
                <h3 className="font-semibold text-emerald-900">Reports</h3>
                <p className="text-sm text-gray-600 mt-2">Generate custom reports</p>
              </div>

              <div className="border-2 border-dashed border-emerald-300 rounded-lg p-8 text-center">
                <div className="text-4xl mb-2">📊</div>
                <h3 className="font-semibold text-emerald-900">Charts</h3>
                <p className="text-sm text-gray-600 mt-2">Visualize data trends</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
