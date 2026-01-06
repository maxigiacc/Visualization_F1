// src/components/SidePanelDrawer.tsx
import React from "react";
import type { Circuit } from "./models/Circuit";
import CountryCircuitList from "./CountryCircuitList";
import CircuitDetails from "./CircuitDetails";
import ContinentPieChart from "./ContinentPieChart";
import { sameCountry } from "./utils/countryUtils";
import "../css/SidePanelDrawer.css";

type Props = {
  country: string | null;
  circuits: Circuit[];
  selectedCircuit: Circuit | null;
  onSelectCircuit: (circuit: Circuit | null) => void;
  onSelectCountry: (circuit: string | null) => void;
};

const SidePanelDrawer: React.FC<Props> = ({
  country,
  circuits,
  selectedCircuit,
  onSelectCircuit,
  onSelectCountry,
}) => {

    if (selectedCircuit) {
    return (
      <CircuitDetails
        circuit={selectedCircuit}
        onBack={() => onSelectCircuit(null)}/>
    );
  }

  const circuitsForCountry = circuits.filter(c => sameCountry(c.country, country));
  
  return (
    <div className="side-panel" role="complementary">
      
      <h3 className="side-panel__title">
        {country ?? "Select a country"}
      </h3>
      
      {/* First case: country not selected */}
      {!country && (
          <>
            <div className="side-panel__muted">
              All circuits worldwide
            </div>

            <ContinentPieChart circuits={circuits} />

            <hr className="side-panel__divider" />

            <CountryCircuitList
              circuits={circuits}
              onSelectCircuit={onSelectCircuit}
            />
          </>
      )}
      
      {/* Country selected, no circuit selected --> show list */}
      {country && !selectedCircuit && (
        <>
        <button
            onClick={() => onSelectCountry(null)}
            className="side-panel__back-btn"
          >
            Back to circuits list
        </button>
        <CountryCircuitList 
          circuits={circuitsForCountry} 
          onSelectCircuit={onSelectCircuit}
        />
        </>
      )}

      
      {/* Circuit selected --> show details */}
      {selectedCircuit && (
        <>
          <button
            onClick={() => onSelectCircuit(null)}
            className="side-panel__back-btn"
          >
            ← Back to {country}
          </button>
          <CircuitDetails 
            circuit={selectedCircuit} 
            onBack={() => onSelectCircuit(null)}
          />
        </>
      )}
    </div>
  );
};

export default SidePanelDrawer;
