// src/components/SidePanelDrawer.tsx
import React from "react";
import type { Circuit } from "./models/Circuit";
import CountryCircuitList from "./CountryCircuitList";
import CircuitDetails from "./CircuitDetails";

type Props = {
  open: boolean;
  onClose: () => void;
  country: string | null;
  circuits: Circuit[];
  selectedCircuit: Circuit | null;
  onSelectCircuit: (circuit: Circuit | null) => void;
};

const SidePanelDrawer: React.FC<Props> = ({ 
  open, 
  onClose, 
  country, 
  circuits, 
  selectedCircuit, 
  onSelectCircuit 
}) => {
  const displayCountry = country === "USA" ? "United States of America" : country;
 
  return (
    <div
      style={{
        position: "fixed",
        right: open ? 0 : -420,
        top: 0,
        height: "100vh",
        width: 420,
        background: "#fff",
        boxShadow: "rgba(0,0,0,0.2) 0 4px 16px",
        transition: "right 220ms ease",
        zIndex: 1200,
        padding: 16,
        overflowY: "auto",
      }}
      role="dialog"
      aria-hidden={!open}
    >
      <button 
        onClick={onClose} 
        style={{ 
          float: "right", 
          border: "none", 
          background: "transparent", 
          fontSize: 20,
          cursor: "pointer"
        }}
      >
        ✕
      </button>
      
      <h3 style={{ marginTop: 6 }}>{displayCountry ?? "Select a country"}</h3>
      
      {/* First case: country not selected */}
      {!country && (
        <div style={{ color: "#666" }}>
          Click on a country to see its circuits.
        </div>
      )}
      
      {/* Country selected, no circuit selected --> show list */}
      {country && !selectedCircuit && (
        <CountryCircuitList 
          circuits={circuits} 
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
            ← Back to {displayCountry}
          </button>
          <CircuitDetails circuit={selectedCircuit} />
        </>
      )}
    </div>
  );
};

export default SidePanelDrawer;