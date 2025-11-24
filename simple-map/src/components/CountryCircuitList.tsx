// src/components/CountryCircuitList.tsx
import React from "react";
import type { Circuit } from "./models/Circuit";

type Props = { circuits: Circuit[]; onSelectCircuit: (c: Circuit) => void };

const CountryCircuitList: React.FC<Props> = ({ circuits, onSelectCircuit }) => {
  if (!circuits.length) return <div style={{ color: "#666" }}>No circuits for this country.</div>;
  return (
    <ul style={{ padding: 0, listStyle: "none" }}>
      {circuits.map((c) => (
        <li key={c.circuitId} style={{ padding: "8px 4px", borderBottom: "1px solid #eee", cursor: "pointer" }} onClick={() => onSelectCircuit(c)}>
          <div style={{ fontWeight: 600 }}>{c.name}</div>
          <div style={{ fontSize: 12, color: "#666" }}>{c.location}</div>
        </li>
      ))}
    </ul>
  );
};

export default CountryCircuitList;
