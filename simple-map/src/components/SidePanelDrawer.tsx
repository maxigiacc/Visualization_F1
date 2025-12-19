// src/components/SidePanelDrawer.tsx
import React from "react";
import type { Circuit } from "./models/Circuit";
import CountryCircuitList from "./CountryCircuitList";
import CircuitDetails from "./CircuitDetails";
import ContinentPieChart from "./ContinentPieChart";
import { sameCountry } from "./utils/countryUtils";

type Props = {
  country: string;
  circuits: Circuit[];
  selectedCircuit: Circuit | null;
  onSelectCircuit: (circuit: Circuit | null) => void;
};

const SidePanelDrawer: React.FC<Props> = ({
  country,
  circuits,
  selectedCircuit,
  onSelectCircuit,
}) => {

  const circuitsForCountry = circuits.filter(c => sameCountry(c.country, country));
  
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        height: "90vh",
        background: "#fff",
        boxShadow: "rgba(0,0,0,0.2) 0 4px 16px",
        padding: 16,
        overflowY: "auto",
      }}
      role="complementary"
    >
      
      <h3 style={{ marginTop: 6 }}>{country ?? "Select a country"}</h3>
      
      {/* First case: country not selected */}
      {!country && (
          <>
            <div style={{ color: "#666", marginBottom: 12 }}>
              All circuits worldwide
            </div>

            <ContinentPieChart circuits={circuits} />

            <hr style={{ margin: "16px 0" }} />

            <CountryCircuitList
              circuits={circuits}
              onSelectCircuit={onSelectCircuit}
            />
          </>
      )}
      
      {/* Country selected, no circuit selected --> show list */}
      {country && !selectedCircuit && (
        <CountryCircuitList 
          circuits={circuitsForCountry} 
          onSelectCircuit={onSelectCircuit}
        />
      )}
      
      {/* Circuit selected --> show details */}
      {selectedCircuit && (
        <>
          <button
            onClick={() => onSelectCircuit(null)}
            style={{
              marginTop: 8,
              padding: "4px 12px",
              background: "#f0f0f0",
              border: "1px solid #ccc",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 13
            }}
          >
            ← Back to {country}
          </button>
          <CircuitDetails circuit={selectedCircuit} />
        </>
      )}
    </div>
  );
};

export default SidePanelDrawer;