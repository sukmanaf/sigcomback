import Map from "../../components/map/Map";
import Navbar from "../../components/Navbar";

export default function MapPage() {
  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <main className="flex-1">
        <Map />
      </main>
    </div>
  );
}