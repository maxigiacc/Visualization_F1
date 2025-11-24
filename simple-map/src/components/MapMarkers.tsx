// src/components/MapMarkers.tsx
import React from "react";
import { Marker, createCoordinates } from "@vnedyalk0v/react19-simple-maps";
import type { Circuit } from "./models/Circuit";

type Props = {
  data: Circuit[];
  markerScale: number;      // = 1 / zoom
  showLabels: boolean;
  handleMarkerClick: (e: React.MouseEvent, circuit: Circuit) => void;
};

const BASE_R = 6;

const MapMarkers: React.FC<Props> = ({ data, markerScale, showLabels, handleMarkerClick }) => {
  const scale = Math.max(0.0001, markerScale);

  return (
    <>
      {data.map((c) => {
        if (!c || Number.isNaN(c.lat) || Number.isNaN(c.lng)) return null;

        const r = Math.max(1, Math.round(BASE_R * scale));

        // #### TRY both orders (comment/uncomment depending on test result)
        // option 1 (common): createCoordinates(lon, lat)
        const coordsA = createCoordinates(c.lng, c.lat);
        // option 2 (in case library expects lat,lon): createCoordinates(lat, lon)
        const coordsB = createCoordinates(c.lat, c.lng);

        // Use coordsA by default — if debug shows coordsB is correct, swap to coordsB.
        const coordsToUse = coordsA; // << change to coordsB if the "B" markers were correct in the debug test

        return (
          <Marker key={c.circuitId} coordinates={coordsToUse}>
            <g
              style={{ pointerEvents: "auto", cursor: "pointer" }}
              onClick={(e) => handleMarkerClick(e, c)}
            >
              <circle r={r} fill="#F44174" stroke="#fff" strokeWidth={Math.max(0.5, r * 0.08)} />
              {showLabels && (
                <text x={0} y={-r - 6} textAnchor="middle" style={{ fontSize: `${Math.max(8, Math.round(10 * scale))}px`, fill: "#333", pointerEvents: "none", userSelect: "none", whiteSpace: "nowrap" }}>
                  {c.name}
                </text>
              )}

              {/* DEBUG attr: remove in production */}
              <title>{`id:${c.circuitId} lat:${c.lat} lng:${c.lng}`}</title>
            </g>
          </Marker>
        );
      })}
    </>
  );
};

export default MapMarkers;
