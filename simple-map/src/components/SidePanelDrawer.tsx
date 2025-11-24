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
  onSelectCircuit: (c: Circuit) => void;
  selectedCircuit: Circuit | null;
};

const SidePanelDrawer: React.FC<Props> = ({ open, onClose, country, circuits, onSelectCircuit, selectedCircuit }) => {
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
      <button onClick={onClose} style={{ float: "right", border: "none", background: "transparent", fontSize: 20 }}>✕</button>
      <h3 style={{ marginTop: 6 }}>{country ?? "Select a country"}</h3>

      {!country && <div style={{ color: "#666" }}>Click on a country to see its circuits.</div>}

      {country && (
        <>
          <CountryCircuitList circuits={circuits} onSelectCircuit={onSelectCircuit} />
          {selectedCircuit && <CircuitDetails circuit={selectedCircuit} />}
        </>
      )}
    </div>
  );
};

export default SidePanelDrawer;
