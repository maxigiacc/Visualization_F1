// src/pages/CircuitsPage.tsx
import { useEffect, useMemo, useState } from "react";
import InteractiveCountriesMap from "./components/InteractiveCountriesMap";
import SidePanelDrawer from "./components/SidePanelDrawer";
import { getCircuits } from "./components/utils/dataLoader";
import type { Circuit } from "./components/models/Circuit";
import { sameCountry } from "./components/utils/countryUtils";
import "./css/Page.css";

const CircuitsPage = () => {
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedCircuit, setSelectedCircuit] = useState<Circuit | null>(null);

  useEffect(() => {
    getCircuits().then(setCircuits).catch(console.error);
  }, []);

  const circuitsForCountry = useMemo(() => {
    if (!selectedCountry) return [];
    return circuits.filter(c =>
      sameCountry(c.country, selectedCountry)
    );
  }, [circuits, selectedCountry]);

  return (
    <div className="Page">
      <div className="main-panel">
        <InteractiveCountriesMap
          circuits={circuits}
          onCountrySelect={(country) => {
            setSelectedCountry(country);
            setSelectedCircuit(null);
          }}
          onCircuitSelect={setSelectedCircuit}
          selectedCircuit={selectedCircuit}
        />
      </div>

      <div className="Sidebar">
        <SidePanelDrawer
          country={selectedCountry}
          circuits={circuits}
          selectedCircuit={selectedCircuit}
          onSelectCircuit={setSelectedCircuit}
        />
      </div>
    </div>
  );
};

export default CircuitsPage;
