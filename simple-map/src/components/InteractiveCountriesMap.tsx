// src/components/InteractiveCountriesMap.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
  createCoordinates,
  createScaleExtent,
  createTranslateExtent,
  useMapContext,
  type Coordinates,
} from "@vnedyalk0v/react19-simple-maps";
import { csv } from "d3-fetch";
import type { Circuit} from "./models/Circuit";
import { fromStringCircuit } from "./models/Circuit";
import type { Race} from "./models/Race";
import { fromStringRace } from "./models/Race";
import type { RaceWithCircuit } from "./models/RaceWithCircuit";
import type { RouteSegment } from "./models/RouteSegment";
import MapMarkers from "./MapMarkers";
import SidePanelDrawer from "./SidePanelDrawer";
import RouteSegmentsLayer from "./RouteSegmentsLayer";

/* ===========================
   Constants & utils
   =========================== */

const GEO_URL = "https://unpkg.com/world-atlas@2/countries-50m.json";
const CENTER = createCoordinates(0, 20);
const SEGMENT_COLORS = ["#FF6B6B", "#FFA94D", "#FFD43B", "#69DB7C", "#4DABF7", "#9775FA", "#F06595", "#63C5DA"];

function generateCurvedLine(from: Coordinates, to: Coordinates, curvature = 0.25, segments = 48): Coordinates[] {
  const [startLng, startLat] = from;
  const [endLng, endLat] = to;
  const dx = endLng - startLng;
  const dy = endLat - startLat;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance === 0) return [createCoordinates(startLng, startLat)];

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

const InteractiveCountriesMap: React.FC = () => {
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [racesMap, setRacesMap] = useState<Map<number, Race[]>>(new Map());
  const [racesWithCircuit, setRacesWithCircuit] = useState<RaceWithCircuit[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCircuit, setSelectedCircuit] = useState<Circuit | null>(null);

  // zoom / marker state
  const zoomRef = useRef<number>(1);
  const [markerScale, setMarkerScale] = useState<number>(1);
  const [showLabels, setShowLabels] = useState(false);
  const debounceTimer = useRef<number | null>(null);
  const STEP = 0.05;
  const EPS = 0.002;
  const DEBOUNCE_MS = 50;

  useEffect(() => {
    Promise.all([csv("/circuits.csv"), csv("/races.csv")]).then(([circuitsRaw, racesRaw]) => {
      const parsed = (circuitsRaw as any[]).map(fromStringCircuit);
      setCircuits(parsed);
      console.log("SONO QUI: sample circuits (0..5)", parsed.slice(0, 6).map(c => ({ id: c.circuitId, name: c.name, lat: c.lat, lng: c.lng })));

      const ctx = useMapContext();
  console.log("projected point for Albert Park:", ctx.projection([144.968, -37.8497]));

      const races = (racesRaw as any[]).map(fromStringRace);
      const map = new Map<number, Race[]>();
      for (const r of races) {
        const arr = map.get(Number(r.circuitId)) ?? [];
        arr.push(r);
        map.set(Number(r.circuitId), arr);
      }
      for (const arr of map.values()) arr.sort((a, b) => (a.year !== b.year ? a.year - b.year : a.round - b.round));
      setRacesMap(map);

      const lookup = new Map<number, Circuit>();
      parsed.forEach((c) => lookup.set(c.circuitId, c));
      const rWithC: RaceWithCircuit[] = races
        .map((race) => {
          const circuit = lookup.get(Number(race.circuitId));
          if (!circuit) return null;
          return {
            ...race,
            circuit,
            coordinates: createCoordinates(circuit.lng, circuit.lat),
            label: `${race.year} • R${String(race.round).padStart(2, "0")} • ${race.name}`,
          };
        })
        .filter((r): r is RaceWithCircuit => Boolean(r))
        .sort((a, b) => (a.year !== b.year ? a.year - b.year : a.round - b.round));
      setRacesWithCircuit(rWithC);
    });
  }, []);

  const handleCountrySelect = (countryName: string) => {
    setSelectedCountry(countryName);
    setSelectedCircuit(null);
    setDrawerOpen(true);
  };

  const handleMarkerClick = (e: React.MouseEvent, circuit: Circuit) => {
    setSelectedCircuit(circuit);
    setDrawerOpen(true);
  };

  const circuitsForCountry = useMemo(() => {
    if (!selectedCountry) return [];
    return circuits.filter((c) => c.country === selectedCountry);
  }, [circuits, selectedCountry]);

  // route segments (optional year selection not included in UI here)
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const selectedYearRaces = useMemo(() => {
    if (!selectedYear) return [];
    return racesWithCircuit.filter((r) => r.year === selectedYear).sort((a, b) => a.round - b.round);
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
    <>
      <div style={{ position: "relative" }}>
        <ComposableMap projection="geoEqualEarth" width={900} height={560}>
          <ZoomableGroup
            center={CENTER}
            minZoom={1}
            maxZoom={8}
            scaleExtent={createScaleExtent(1, 8)}
            translateExtent={createTranslateExtent(createCoordinates(-2000, -1000), createCoordinates(2000, 1000))}
            onMoveEnd={(position: any) => {
              const rawZoom = position?.k ?? position?.scale ?? position?.zoom ?? 1;
              const snapped = Math.round(rawZoom / STEP) * STEP;
              const prev = zoomRef.current;
              zoomRef.current = Math.round(snapped * 1000) / 1000;
              if (Math.abs(snapped - prev) > EPS) {
                if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
                debounceTimer.current = window.setTimeout(() => {
                  setMarkerScale(1 / Math.max(0.001, zoomRef.current));
                  setShowLabels(zoomRef.current >= 2);
                  debounceTimer.current = null;
                }, DEBOUNCE_MS);
              }
            }}
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo, idx) => (
                  <Geography
                    key={`${geo.rsmKey ?? idx}`}
                    geography={geo}
                    onClick={() => handleCountrySelect(geo.properties?.name ?? "Unknown")}
                    style={{
                      default: { fill: "#e6e6e6", outline: "none", stroke: "#fff", strokeWidth: 0.5, userSelect: "none" },
                      hover: { fill: "#d32f2f", cursor: "pointer", outline: "none" },
                      pressed: { fill: "#b71c1c", outline: "none" },
                    }}
                  />
                ))
              }
            </Geographies>

            <MapMarkers data={circuits} markerScale={markerScale} showLabels={showLabels} onMarkerClick={handleMarkerClick} />
            <RouteSegmentsLayer segments={routeSegments} markerScale={markerScale} />
          </ZoomableGroup>
        </ComposableMap>
      </div>

      <SidePanelDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        country={selectedCountry}
        circuits={circuitsForCountry}
        selectedCircuit={selectedCircuit}
        onSelectCircuit={(c) => setSelectedCircuit(c)}
      />
    </>
  );
};

export default InteractiveCountriesMap;
