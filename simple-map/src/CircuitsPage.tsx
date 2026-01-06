import { useEffect, useState } from "react";
import InteractiveCountriesMap from "./components/InteractiveCountriesMap";
import SidePanelDrawer from "./components/SidePanelDrawer";
import { getCircuits } from "./components/utils/dataLoader";
import type { Circuit } from "./components/models/Circuit";
import "./css/Page.css";

const CircuitsPage = () => {
    const [circuits, setCircuits] = useState<Circuit[]>([]);
    const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
    const [selectedCircuit, setSelectedCircuit] = useState<Circuit | null>(
        null,
    );

    useEffect(() => {
        getCircuits().then(setCircuits).catch(console.error);
    }, []);

    return (
        <div className="Page PageWithSidebar">
            <div className="main-panel">
                <InteractiveCountriesMap
                    circuits={circuits}
                    selectedCountry={selectedCountry}
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
                    onSelectCountry={setSelectedCountry}
                />
            </div>
        </div>
    );
};

export default CircuitsPage;
