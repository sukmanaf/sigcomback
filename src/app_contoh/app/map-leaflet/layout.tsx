export default function MapLeafletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-screen">
      {/* Custom Header for Map Leaflet */}
      <div className="bg-green-700 text-white px-6 py-4 flex items-center gap-3 w-full">
        <div className="bg-white text-green-700 px-3 py-1 rounded font-bold text-sm">
          LOGO DINAS
        </div>
        <h1 className="text-lg font-bold">PENGGUSURAN DAMPAK AKTUAL PROYEK</h1>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
    </div>
  );
}
