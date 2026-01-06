// src/components/CountryCircuitList.tsx
import React from "react";
import type { Circuit } from "./models/Circuit";
import "../css/CountryCircuitList.css";

type Props = {
  circuits: Circuit[];
  onSelectCircuit: (circuit: Circuit) => void;
};


const CountryCircuitList: React.FC<Props> = ({circuits, onSelectCircuit}) => {
  if (!circuits.length) {
    return (
      <div className="country-circuit-list__empty">
        No circuits for this country.
      </div>
    );
  }
  
  return (
    <div className="country-circuit-list">
      <strong className="country-circuit-list__title">
        Circuits ({circuits.length})
      </strong>
      <ul className="country-circuit-list__items">
        {circuits.map((circuit) => (
          <li
            key={circuit.circuitId}
            onClick={() => onSelectCircuit(circuit)}
            className="country-circuit-list__item"
          >
            <div className="country-circuit-list__name">{circuit.name}</div>
            <div className="country-circuit-list__location">
              {circuit.location}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};


export default CountryCircuitList;
