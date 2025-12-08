// src/components/MapMarkers.tsx
import React from "react";
import { Marker, createCoordinates } from "@vnedyalk0v/react19-simple-maps";
import type { Circuit } from "./models/Circuit";

type Props = {
  data: Circuit[];
  markerScale: number;
  showLabels: boolean;
};

const BASE_MARKER_RADIUS_PX = 3;
const BASE_FONT_PX = 10;

const MapMarkers: React.FC<Props> = ({ data, markerScale, showLabels}) => {

  return (
    <>
      {data.map((c, idx) => {
        if (!c) return null;        
        const invZoom = markerScale;

        return (
          <Marker key={`${c.circuitId}-${idx}`} coordinates={createCoordinates(c.lng, c.lat)}>
            <g
              transform={`scale(${invZoom})`}
              style={{ transformOrigin: "0 0", pointerEvents: "auto", cursor: "pointer" }}
            >
              <circle 
                r={BASE_MARKER_RADIUS_PX} 
                fill="#F44174" 
                stroke="#fff" 
                strokeWidth={Math.max(0.5, BASE_MARKER_RADIUS_PX * 0.08)} 
              />
              {showLabels && (
                <text
                  x={0}
                  y={-BASE_MARKER_RADIUS_PX - 4}
                  textAnchor="middle"
                  style={{
                    fontSize: `${BASE_FONT_PX}px`,
                    fill: "#333",
                    pointerEvents: "none",
                    userSelect: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.name}
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