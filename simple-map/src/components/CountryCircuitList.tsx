// src/components/CountryCircuitList.tsx
import React from "react";
import type { Circuit } from "./models/Circuit";
import CircuitDetails from "./CircuitDetails";

type Props = {
  circuits: Circuit[];
  onSelectCircuit: (circuit: Circuit) => void;
};


const CountryCircuitList: React.FC<Props> = ({circuits, onSelectCircuit}) => {
  if (!circuits.length) return <div style={{ color: "#666" }}>No circuits for this country.</div>;
  
  return (
    <div style={{ marginTop: 16 }}>
      <strong>Circuits ({circuits.length})</strong>
      <ul style={{ listStyle: "none", padding: 0, marginTop: 8 }}>
        {circuits.map((circuit) => (
          <li
            key={circuit.circuitId}
            onClick={() => onSelectCircuit(circuit)}
            style={{
              padding: "8px 12px",
              marginBottom: 6,
              background: "#f9f9f9",
              borderRadius: 4,
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#e8e8e8")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#f9f9f9")}
          >
            <div style={{ fontWeight: 500 }}>{circuit.name}</div>
            <div style={{ fontSize: 12, color: "#666" }}>{circuit.location}</div>
          </li>
        ))}
      </ul>
    </div>
  );
};


export default CountryCircuitList;
