import { useState } from "react";

import { CensusProfile } from "@/types/geo";

import Sidebar from "@/components/Sidebar";
import MapComponent from "@/components/MapComponent";

const Index = () => {
  const [censusProfile, setCensusProfile] = useState<CensusProfile | null>(
    null
  );

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-white border-b border-gray-200 py-3 px-6 relative z-20">
        <h1 className="text-2xl font-bold text-gray-800">
          Boundary Data Explorer
        </h1>
        <p className="text-sm text-gray-600">
          Explore geographic boundaries, demographics, and geospatial data
        </p>
      </header>

      <main className="flex flex-1 overflow-hidden relative">
        <Sidebar censusProfile={censusProfile} />
        <div className="flex-1 relative">
          <MapComponent onCensusProfileChange={setCensusProfile} />
        </div>
      </main>
    </div>
  );
};

export default Index;
