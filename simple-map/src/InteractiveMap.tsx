// File: src/components/InteractiveMap.tsx
import React, { useEffect, useState, useRef } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
  createCoordinates,
  createScaleExtent,
  createTranslateExtent,
} from "@vnedyalk0v/react19-simple-maps";
import type { Feature, Geometry } from "geojson";
import { csv } from "d3-fetch";
import { fromStringCircuit, type Circuit } from "./Circuit";
import { fromStringRace, type Race } from "./Race";
import CircuitPopup from "./CircuitPopup";

const geoUrl = "https://unpkg.com/world-atlas@2/countries-50m.json";

const InteractiveMap: React.FC = () => {
  const [data, setData] = useState<Circuit[]>([]);
  const [racesMap, setRacesMap] = useState<Map<number, Race[]>>(new Map());

  // popup state
  const [selectedCircuitId, setSelectedCircuitId] = useState<number | null>(null);
  const [popupXY, setPopupXY] = useState<{ x: number; y: number } | null>(null);

  // marker UI / zoom refs
  const zoomRef = useRef<number>(1);
  const [markerScale, setMarkerScale] = useState<number>(1);
  const [showLabels, setShowLabels] = useState<boolean>(false);
  const debounceTimer = useRef<number | null>(null);

  const STEP = 0.05;
  const EPS = 0.002;
  const DEBOUNCE_MS = 50;
  const SHOW_LABEL_ZOOM_THRESHOLD = 2;

  // to center map on zoom/move end ? We need it 
  const centerRef = useRef(createCoordinates(0, 0));

  useEffect(() => {
    Promise.all([csv(`/circuits.csv`), csv(`/races.csv`)]).then(([circuitsRaw, racesRaw]) => {

      const races = (racesRaw as any[]).map((r) => fromStringRace(r));
      const map = new Map<number, Race[]>();
      const circuits = (circuitsRaw as any[]).map((r) => fromStringCircuit(r));
      setData(circuits);

      for (const race of races) {
        const arr = map.get(race.circuitId) ?? [];
        arr.push(race);
        map.set(race.circuitId, arr);
      }
      // sort lists
      for (const [cid, arr] of map.entries()) {
        arr.sort((a, b) => (a.year !== b.year ? a.year - b.year : a.round - b.round));
      }
      setRacesMap(map);
    });
  }, []);

  const handleMarkerClick = (e: React.MouseEvent, circuit: Circuit) => {
    // show popup and center it near the click position
    const x = e.pageX;
    const y = e.pageY;
    setPopupXY({ x, y });
    setSelectedCircuitId(circuit.circuitId);
  };

  const selectedCircuit = data.find((d) => d.circuitId === selectedCircuitId) ?? null;
  const selectedRaces = selectedCircuitId ? racesMap.get(selectedCircuitId) ?? [] : [];

  return (
    <div>
        <ComposableMap projection="geoEqualEarth" width={780} height={520}>
          <ZoomableGroup
            minZoom={1}
            maxZoom={8}
            scaleExtent={createScaleExtent(1, 8)}
            translateExtent={createTranslateExtent(createCoordinates(-2000, -1000), createCoordinates(2000, 1000))}
            onMoveEnd={(position: any) => {
              const rawZoom = position?.k ?? position?.scale ?? position?.zoom ?? 1;
              const snapped = Math.round(rawZoom / STEP) * STEP;
              const prevZoom = zoomRef.current;
              zoomRef.current = Math.round(snapped * 1000) / 1000;
              if (Math.abs(snapped - prevZoom) > EPS) {
                if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
                debounceTimer.current = window.setTimeout(() => {
                  setMarkerScale(1 / Math.max(0.001, zoomRef.current));
                  setShowLabels(zoomRef.current >= SHOW_LABEL_ZOOM_THRESHOLD);
                  debounceTimer.current = null;
                }, DEBOUNCE_MS);
              }

              // optional center handling
              let newCenter = null;
              if (Array.isArray(position?.coordinates) && position.coordinates.length >= 2) {
                newCenter = createCoordinates(position.coordinates[0], position.coordinates[1]);
              } else if (position?.center && Array.isArray(position.center) && position.center.length >= 2) {
                newCenter = createCoordinates(position.center[0], position.center[1]);
              } else if (position?.center && typeof position.center === "object") {
                newCenter = position.center;
              }
              if (newCenter) centerRef.current = newCenter;
            }}
          >
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    style={{
                      default: { fill: "#D6D6DA", outline: "none", stroke: "#fff", strokeWidth: 0.5, userSelect: "none" },
                      hover: { fill: "#F53", cursor: "pointer", outline: "none" },
                      pressed: { fill: "#E42", outline: "none" },
                    }}
                  />
                ))
              }
            </Geographies>

            {data.map((circuit, idx) => {
              const BASE_MARKER_RADIUS_PX = 3;
              const BASE_FONT_PX = 10;
              const invZoom = markerScale;

              return (
                <Marker key={`${circuit.circuitId}-${idx}`} coordinates={createCoordinates(circuit.lng, circuit.lat)}>
                  <g
                    transform={`scale(${invZoom})`}
                    style={{ transformOrigin: "0 0", pointerEvents: "auto", cursor: "pointer" }}
                    onClick={(e) => handleMarkerClick(e, circuit)}
                  >
                    <circle r={BASE_MARKER_RADIUS_PX} fill="#F44174" stroke="#fff" strokeWidth={Math.max(0.5, BASE_MARKER_RADIUS_PX * 0.08)} />
                    {showLabels && (
                      <text x={0} y={-BASE_MARKER_RADIUS_PX - 4} textAnchor="middle" style={{ fontSize: `${BASE_FONT_PX}px`, fill: "#333", pointerEvents: "none", userSelect: "none", whiteSpace: "nowrap" }}>
                        {circuit.name}
                      </text>
                    )}
                  </g>
                </Marker>
              );
            })}
          </ZoomableGroup>
        </ComposableMap>

        {selectedCircuit && popupXY && (
          <CircuitPopup circuit={selectedCircuit} races={selectedRaces} x={popupXY.x} y={popupXY.y} onClose={() => { setSelectedCircuitId(null); setPopupXY(null); }} />
        )}
    </div>
  );
};

export default InteractiveMap;
