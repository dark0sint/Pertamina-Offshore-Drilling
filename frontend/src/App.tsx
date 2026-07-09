import { useState } from "react";
import Navbar, { type TabKey } from "./components/Navbar";
import DrillingCalculator from "./components/DrillingCalculator";
import UnitConverter from "./components/UnitConverter";
import KillSheet from "./components/KillSheet";
import WellboreGeometry from "./components/WellboreGeometry";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("calculator");

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar active={activeTab} onChange={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {activeTab === "calculator" && <DrillingCalculator />}
        {activeTab === "conversion" && <UnitConverter />}
        {activeTab === "killsheet" && <KillSheet />}
        {activeTab === "geometry" && <WellboreGeometry />}
      </main>

      <footer className="text-center text-xs text-slate-400 py-4">
        Pertamina Offshore Drilling Engineering Suite — Internal Engineering Tool
      </footer>
    </div>
  );
}
