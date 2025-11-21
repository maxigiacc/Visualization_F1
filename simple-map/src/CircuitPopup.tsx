// File: src/components/CircuitPopup.tsx
import React from "react";
import type { Race } from "./components/models/Race";
import type { Circuit } from "./components/models/Circuit";

type Props = {
  circuit: Circuit;
  races: Race[];
  x?: number;
  y?: number; 
  onClose: () => void;
};

const popupWidth = 340;
const popupHeight = 320;

const CircuitPopup: React.FC<Props> = ({ circuit, races, x, y, onClose }) => {
  // If x/y provided, position the popup near them; else default top-right.
  const style: React.CSSProperties = {
    position: "absolute",
    left: x,
    top: y,
    zIndex: 9999,
    width: popupWidth,
    maxHeight: popupHeight,
    overflowY: "auto",
    background: "#fff",
    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
    borderRadius: 8,
    padding: 12,
    fontFamily: "sans-serif",
  };

  if (typeof x === "number" && typeof y === "number") {
    // position using viewport coords but keep inside window
    const margin = 12;
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    let left = x + 12;
    let top = y - popupHeight / 2;
    // clamp
    if (left + popupWidth + margin > winW) left = x - popupWidth - 12;
    if (top + popupHeight + margin > winH) top = winH - popupHeight - margin;
    if (top < margin) top = margin;
    style.left = left;
    style.top = top;
  } else {
    // default top-right
    style.right = 12;
    style.top = 12;
  }

  return (
    <div style={style} role="dialog" aria-modal="true">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div>
          <strong style={{ fontSize: 16 }}>{circuit.name}</strong>
          <div style={{ fontSize: 12, color: "#666" }}>{circuit.location}, {circuit.country}</div>
          <div style={{ fontSize: 10, color: "#666" }}>{circuit.lat}, {circuit.lng}</div>
        </div>

        <button onClick={onClose} aria-label="Close" style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 18 }}>✕</button>
      </div>

      <div style={{ marginBottom: 8 }}>
        <a href={circuit.url} target="_blank" rel="noreferrer">Circuit page</a>
      </div>

      <div style={{ fontWeight: 600, marginBottom: 6 }}>Races ({races.length})</div>
      {races.length === 0 && <div style={{ color: "#666", marginBottom: 8 }}>No races found for this circuit.</div>}

      <ul style={{ paddingLeft: 16, margin: 0 }}>
        {races.map((race) => (
          <li key={race.raceId} style={{ marginBottom: 8 }}>
            <div style={{ fontWeight: 600 }}>{race.year} — {race.name}</div>
            <div style={{ fontSize: 12, color: "#555" }}>{race.date} {race.time}</div>
            <div><a href={race.url} target="_blank" rel="noreferrer">Info</a></div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CircuitPopup;
