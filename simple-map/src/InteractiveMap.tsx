import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Line,
  Marker,
  ZoomableGroup,
  createCoordinates,
  createScaleExtent,
  createTranslateExtent,
  type Coordinates,
  useMapContext,
} from "@vnedyalk0v/react19-simple-maps";
import { csv } from "d3-fetch";
import { fromStringCircuit, type Circuit } from "./components/models/Circuit";
import { fromStringRace, type Race } from "./components/models/Race";
import CircuitPopup from "./CircuitPopup";

const geoUrl = "https://unpkg.com/world-atlas@2/countries-50m.json";

type RaceWithCircuit = Race & {
  circuit: Circuit;
  coordinates: Coordinates;
  label: string;
};

const SEGMENT_COLORS = [
  "#FF6B6B",
  "#FFA94D",
  "#FFD43B",
  "#69DB7C",
  "#4DABF7",
  "#9775FA",
  "#F06595",
  "#63C5DA",
];

type RouteSegment = {
  id: string;
  from: RaceWithCircuit;
  to: RaceWithCircuit;
  coordinates: Coordinates[];
  color: string;
  order: number;
  labelCoordinates: Coordinates;
  arrowCoordinates: Coordinates;
};

const InteractiveMap: React.FC = () => {
  const [data, setData] = useState<Circuit[]>([]);
  const [racesMap, setRacesMap] = useState<Map<number, Race[]>>(new Map());
  const [racesWithCircuit, setRacesWithCircuit] = useState<RaceWithCircuit[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

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
      const circuits = (circuitsRaw as any[]).map((r) => fromStringCircuit(r));
      setData(circuits);

      const races = (racesRaw as any[]).map((r) => fromStringRace(r));
      const map = new Map<number, Race[]>();
      for (const race of races) {
        const arr = map.get(race.circuitId) ?? [];
        arr.push(race);
        map.set(race.circuitId, arr);
      }
      // sort lists
      for (const arr of map.values()) {
        arr.sort((a, b) => (a.year !== b.year ? a.year - b.year : a.round - b.round));
      }
      setRacesMap(map);

      const circuitLookup = new Map<number, Circuit>();
      circuits.forEach((circuit) => circuitLookup.set(circuit.circuitId, circuit));

      const racesWithCircuit: RaceWithCircuit[] = races
        .map((race) => {
          const circuit = circuitLookup.get(race.circuitId);
          if (!circuit) return null;
          const label = `${race.year} • R${String(race.round).padStart(2, "0")} • ${race.name}`;
          return {
            ...race,
            circuit,
            coordinates: createCoordinates(circuit.lng, circuit.lat),
            label,
          };
        })
        .filter((race): race is RaceWithCircuit => Boolean(race))
        .sort((a, b) => (a.year !== b.year ? a.year - b.year : a.round - b.round));

      setRacesWithCircuit(racesWithCircuit);
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
  const yearOptions = useMemo(() => {
    const years = Array.from(new Set(racesWithCircuit.map((race) => race.year)));
    years.sort((a, b) => a - b);
    return years;
  }, [racesWithCircuit]);

  useEffect(() => {
    if (selectedYear === null && yearOptions.length > 0) {
      setSelectedYear(yearOptions[yearOptions.length - 1]);
    }
  }, [selectedYear, yearOptions]);

  const selectedYearRaces = useMemo(() => {
    if (!selectedYear) return [];
    return racesWithCircuit
      .filter((race) => race.year === selectedYear)
      .sort((a, b) => a.round - b.round);
  }, [racesWithCircuit, selectedYear]);

  const routeSegments = useMemo<RouteSegment[]>(() => {
    if (selectedYearRaces.length <= 1) return [];
    return selectedYearRaces.slice(0, -1).map((race, idx) => {
      const nextRace = selectedYearRaces[idx + 1];
      const coordinates = generateCurvedLine(race.coordinates, nextRace.coordinates, 0.25, 64);
      const labelCoordinates = coordinates[Math.floor(coordinates.length / 2)] ?? race.coordinates;
      const arrowIndex = Math.max(coordinates.length - 3, 0);
      const arrowCoordinates = coordinates[arrowIndex] ?? nextRace.coordinates;
      return {
        id: `${race.raceId}-${nextRace.raceId}`,
        from: race,
        to: nextRace,
        coordinates,
        color: SEGMENT_COLORS[idx % SEGMENT_COLORS.length],
        order: idx + 1,
        labelCoordinates,
        arrowCoordinates,
      };
    });
  }, [selectedYearRaces]);

  return (
    <div style={{ position: "relative" }}>
        <div className="filterBar">
          <div className="year-select-wrapper">
            <label htmlFor="year-select">Season</label>
            <select id="year-select" value={selectedYear ?? ""} onChange={(event) => setSelectedYear(event.target.value ? Number(event.target.value) : null)}>
              <option value="">Select a year</option>
              {yearOptions.map((year) => (
                <option key={`year-${year}`} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

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
                geographies.map((geo, idx) => (
                  <Geography
                    key={`${geo.id ?? "geo"}-${idx}`}
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

            <RouteSegmentsLayer segments={routeSegments} markerScale={markerScale} />
          </ZoomableGroup>
        </ComposableMap>

        {selectedCircuit && popupXY && (
          <CircuitPopup circuit={selectedCircuit} races={selectedRaces} x={popupXY.x} y={popupXY.y} onClose={() => { setSelectedCircuitId(null); setPopupXY(null); }} />
        )}
    </div>
  );
};

export default InteractiveMap;

type RouteSegmentsLayerProps = {
  segments: RouteSegment[];
  markerScale: number;
};

const RouteSegmentsLayer: React.FC<RouteSegmentsLayerProps> = ({ segments, markerScale }) => {
  const { projection } = useMapContext();
  const getArrowAngle = (segment: RouteSegment) => {
    if (!projection) return 0;
    const coords = segment.coordinates;
    const anchorIdx = Math.max(coords.length - 3, 0);
    const anchor = projection(coords[anchorIdx]);
    const nextPoint = projection(coords[Math.min(anchorIdx + 1, coords.length - 1)]);
    if (!anchor || !nextPoint) return 0;
    return (Math.atan2(nextPoint[1] - anchor[1], nextPoint[0] - anchor[0]) * 180) / Math.PI;
  };

  const LABEL_WIDTH = 22;
  const LABEL_HEIGHT = 14;

  return (
    <>
      {segments.map((segment) => (
        <Line
          key={segment.id}
          from={segment.from.coordinates}
          to={segment.to.coordinates}
          coordinates={segment.coordinates}
          stroke={segment.color}
          strokeWidth={1}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}

      {segments.map((segment) => {
        const invZoom = markerScale;
        const arrowAngle = getArrowAngle(segment);
        return (
          <Marker key={`arrow-${segment.id}`} coordinates={segment.arrowCoordinates}>
            <g transform={`scale(${invZoom}) rotate(${arrowAngle})`} style={{ transformOrigin: "0 0", pointerEvents: "none" }}>
              <path d="M0 0 L-10 4 L-10 -4 Z" fill={segment.color} opacity={0.9} />
            </g>
          </Marker>
        );
      })}

      {segments.map((segment) => {
        const invZoom = markerScale;
        return (
          <Marker key={`label-${segment.id}`} coordinates={segment.labelCoordinates}>
            <g transform={`scale(${invZoom})`} style={{ transformOrigin: "0 0", pointerEvents: "none" }}>
              <rect
                x={-LABEL_WIDTH / 2}
                y={-LABEL_HEIGHT - 3}
                width={LABEL_WIDTH}
                height={LABEL_HEIGHT}
                rx={LABEL_HEIGHT / 2}
                fill="rgba(255, 255, 255, 0.9)"
                stroke={segment.color}
                strokeWidth={0.8}
              />
              <text
                x={0}
                y={-LABEL_HEIGHT / 2}
                textAnchor="middle"
                fill={segment.color}
                style={{ fontSize: "8px", fontWeight: 600, letterSpacing: "0.3px", textTransform: "uppercase", userSelect: "none" }}
              >
                #{segment.order}
              </text>
            </g>
          </Marker>
        );
      })}
    </>
  );
};

function generateCurvedLine(from: Coordinates, to: Coordinates, curvature = 0.25, segments = 48): Coordinates[] {
  const [startLng, startLat] = from;
  const [endLng, endLat] = to;
  const dx = endLng - startLng;
  const dy = endLat - startLat;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance === 0) {
    return [createCoordinates(startLng, startLat)];
  }

  const nx = -dy / distance;
  const ny = dx / distance;
  const maxOffset = 45;
  const offset = Math.min(maxOffset, distance * curvature);
  const steps = Math.max(2, segments);
  const coordinates: Coordinates[] = [];

  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const baseLng = startLng + dx * t;
    const baseLat = startLat + dy * t;
    const curveStrength = Math.sin(Math.PI * t);
    const curvedLng = baseLng + nx * offset * curveStrength;
    const curvedLat = baseLat + ny * offset * curveStrength;
    coordinates.push(createCoordinates(curvedLng, curvedLat));
  }

  return coordinates;
}
