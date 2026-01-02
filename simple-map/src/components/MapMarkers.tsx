// src/components/MapMarkers.tsx
import React, { useMemo, useState } from "react";
import { Marker, createCoordinates } from "@vnedyalk0v/react19-simple-maps";
import type { Circuit } from "./models/Circuit";


type Props = {
  circuits: Circuit[];
  markerScale: number;
  showLabels: boolean; // ora controlla SOLO se hover è attivo
  selectedCircuit: Circuit | null;
  onSelectCircuit: (circuit: Circuit) => void;
};

const BASE_RADIUS = 3;
const CLUSTER_RADIUS = 5;
const FONT_PX = 10;
const GROUP_PRECISION = 3;

type CircuitGroup = {
  lat: number;
  lng: number;
  circuits: Circuit[];
};

function groupCircuits(circuits: Circuit[]): CircuitGroup[] {
  const map = new Map<string, CircuitGroup>();

  circuits.forEach((c) => {
    const key = `${c.lat.toFixed(GROUP_PRECISION)},${c.lng.toFixed(GROUP_PRECISION)}`;

    if (!map.has(key)) {
      map.set(key, { lat: c.lat, lng: c.lng, circuits: [c] });
    } else {
      map.get(key)!.circuits.push(c);
    }
  });

  return Array.from(map.values());
}

const MapMarkers: React.FC<Props> = ({
  circuits,
  markerScale,
  selectedCircuit,
  onSelectCircuit,
}) => {
  const groups = useMemo(() => groupCircuits(circuits), [circuits]);
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <>
      {groups.map((group, idx) => {
        const isCluster = group.circuits.length > 1;
        const single = group.circuits[0];
        const isSelected =
          !isCluster && selectedCircuit?.circuitId === single.circuitId;

        const showLabel =
          !isCluster && (hovered === idx || isSelected);

        return (
          <Marker
            key={idx}
            coordinates={createCoordinates(group.lng, group.lat)}
          >
            <g
              transform={`scale(${markerScale})`}
              style={{ cursor: isCluster ? "default" : "pointer" }}
              onMouseEnter={() => setHovered(idx)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => {
                if (!isCluster) onSelectCircuit(single);
              }}
            >
              {/* Marker */}
              <circle
                r={isCluster ? CLUSTER_RADIUS : BASE_RADIUS}
                fill={
                  isCluster
                    ? "#DC0000"
                    : isSelected
                    ? "#1E88E5"
                    : "#F44174"
                }
                stroke="#fff"
                strokeWidth={0.6}
              />

              {/* Cluster count */}
              {isCluster && (
                <text
                  y={-CLUSTER_RADIUS - 4}
                  textAnchor="middle"
                  fontSize={8}
                  fontWeight={700}
                  fill="#111"
                  pointerEvents="none"
                >
                  {group.circuits.length}
                </text>
              )}

              {/* Label (hover / selected ONLY) */}
              {showLabel && (
                <text
                  y={-BASE_RADIUS - 6}
                  textAnchor="middle"
                  fontSize={FONT_PX}
                  fill="#111"
                  fontWeight={600}
                  pointerEvents="none"
                  style={{
                    paintOrder: "stroke",
                    stroke: "#fff",
                    strokeWidth: 3,
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                  }}
                >
                  {single.name}
                </text>
              )}
            </g>
          </Marker>
        );
      })}
    </>
  );
};

export default MapMarkers;
