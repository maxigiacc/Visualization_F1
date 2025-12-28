import React, { useEffect, useMemo, useRef, useState } from "react";
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
import {type Circuit } from "./models/Circuit";
import type { RaceWithCircuit } from "./models/RaceWithCircuit";
import type { RouteSegment } from "./models/RouteSegment";
import { useSettings } from "../SettingsContext";
import "../css/InteractiveMap.css";
import geoUrl from "../assets/countries-50m.json";
import { getRacesWithCircuits } from "./utils/dataLoader";
import { RouteSegmentsLayer, generateCurvedLine } from "./RouteSegmentsLayer";
import Graph from "./models/Graph";

const SEGMENT_COLORS = [
    "#FF6B6B", "#FFA94D", "#FFD43B", "#69DB7C",
    "#4DABF7", "#9775FA", "#F06595", "#63C5DA",
];

const InteractiveMap: React.FC = () => {
    const [races, setRaces] = useState<Circuit[]>([]);
    const [racesWithCircuit, setRacesWithCircuit] = useState<RaceWithCircuit[]>([]);
    const [activeSegmentOrders, setActiveSegmentOrders] = useState<number[]>([]);
    const [showOptimizedPath, setShowOptimizedPath] = useState<boolean>(false);
    const { year, setYear , selected_race, setSelectedRace  } = useSettings();
    

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
    getRacesWithCircuits()
        .then(({ circuits, racesWithCircuit }) => {
            setRaces(circuits);
            setRacesWithCircuit(racesWithCircuit);
        })
        .catch(console.error);
    }, []);

    const yearOptions = useMemo(() => {
        const years = Array.from(
            new Set(racesWithCircuit.map((race) => race.year)),
        );
        years.sort((a, b) => a - b);
        return years;
    }, [racesWithCircuit]);
    
    const filteredRaces = useMemo(() => {
        setActiveSegmentOrders([]); // Reset active segments on filter change
        if (!year) return races;
        const id_list = racesWithCircuit.filter(race => race.year === year).map(race => race.circuit.circuitId);
        return races.filter(c => id_list.includes(c.circuitId));
    }, [year, races]);

    useEffect(() => {
        if (year === null && yearOptions.length > 0) {
            setYear(yearOptions[yearOptions.length - 1]);
        }
    }, [year, yearOptions, setYear]);

    const selectedYearRaces = useMemo(() => {
        if (!year) return [];
        return racesWithCircuit
            .filter((race) => race.year === year)
            .sort((a, b) => a.round - b.round);
    }, [racesWithCircuit, year]);

    const selectedRacesForOptimization = useMemo(() => {
        if (selected_race.length === 0) return selectedYearRaces;
        const selectedNames = new Set(selected_race);
        return selectedYearRaces.filter((race) =>
            selectedNames.has(race.circuit.name),
        );
    }, [selectedYearRaces, selected_race]);

    const optimizedOrderedRaces = useMemo(() => {
        if (selectedRacesForOptimization.length <= 1) {
            return selectedRacesForOptimization;
        }
        const graph = new Graph(selectedRacesForOptimization);
        const optimizedPath = graph.generateOptimizedPath().path;
        if (optimizedPath.length === 0) return selectedRacesForOptimization;
        const raceByLocation = new Map(
            selectedRacesForOptimization.map((race) => [
                race.circuit.location,
                race,
            ]),
        );
        const orderedRaces = optimizedPath
            .map((node) => raceByLocation.get(node))
            .filter((race): race is RaceWithCircuit => Boolean(race));
        if (orderedRaces.length !== optimizedPath.length) {
            return selectedRacesForOptimization;
        }
        return orderedRaces;
    }, [selectedRacesForOptimization]);

    const routeSegments = useMemo<RouteSegment[]>(() => {
        if (selectedYearRaces.length <= 1) return [];
        return selectedYearRaces.slice(0, -1).map((race, idx) => {
            const nextRace = selectedYearRaces[idx + 1];
            const coordinates = generateCurvedLine(
                race.coordinates,
                nextRace.coordinates,
                0.25,
                64,
            );
            const labelCoordinates =
                coordinates[Math.floor(coordinates.length / 2)] ??
                race.coordinates;
            const arrowIndex = Math.max(coordinates.length - 3, 0);
            const arrowCoordinates =
                coordinates[arrowIndex] ?? nextRace.coordinates;
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

    const optimizedRouteSegments = useMemo<RouteSegment[]>(() => {
        if (optimizedOrderedRaces.length <= 1) return [];
        return optimizedOrderedRaces.slice(0, -1).map((race, idx) => {
            const nextRace = optimizedOrderedRaces[idx + 1];
            const coordinates = generateCurvedLine(
                race.coordinates,
                nextRace.coordinates,
                0.25,
                64,
            );
            const labelCoordinates =
                coordinates[Math.floor(coordinates.length / 2)] ??
                race.coordinates;
            const arrowIndex = Math.max(coordinates.length - 3, 0);
            const arrowCoordinates =
                coordinates[arrowIndex] ?? nextRace.coordinates;
            return {
                id: `${race.raceId}-${nextRace.raceId}-optimized`,
                from: race,
                to: nextRace,
                coordinates,
                color: "#2F9E44",
                order: idx + 1,
                labelCoordinates,
                arrowCoordinates,
            };
        });
    }, [optimizedOrderedRaces]);

    const handleSegmentClick = (segment: RouteSegment) => {
        const nextSelected = new Set(selected_race);
        nextSelected.add(segment.from.circuit.name);
        nextSelected.add(segment.to.circuit.name);
        const new_list_of_races = Array.from(nextSelected)
        
        // Update the selected races only if the user clicked on a new segment 
        if(new_list_of_races.length != selected_race.length){
            setSelectedRace(new_list_of_races);
            // Insert segment order 
            setActiveSegmentOrders((prev) => {
                // Empty list case
                if(prev.length == 0) return [segment.order];
                // User click in the back
                if(prev[0] == segment.order+1){
                    return [segment.order, ...prev];
                }else{ // User click in the front
                    return [...prev, segment.order];
                }
            });
        }
    };

    const hasSelectedPath = activeSegmentOrders.length > 0;

    useEffect(() => {
        if (!hasSelectedPath && showOptimizedPath) {
            setShowOptimizedPath(false);
        }
    }, [hasSelectedPath, showOptimizedPath]);

    const handleToggleOptimizedPath = () => {
        if (!hasSelectedPath) return;
        setShowOptimizedPath((prev) => !prev);
    };

    const handleSelectEntirePath = () => {
        if (selectedYearRaces.length === 0) return;
        setSelectedRace(selectedYearRaces.map((race) => race.circuit.name));
        setActiveSegmentOrders(routeSegments.map((segment) => segment.order));
    };

    const handleResetSelection = () => {
        setSelectedRace([]);
        setActiveSegmentOrders([]);
        setShowOptimizedPath(false);
    };

    return (
        <div style={{ position: "relative" }} className="InteractiveMap">
            <div className="filterBar">
                <div className="year-select-wrapper">
                    <label htmlFor="year-select">Season</label>
                    <select
                        id="year-select"
                        value={year ?? ""}
                        onChange={(event) =>
                            setYear(
                                event.target.value
                                    ? Number(event.target.value)
                                    : Number.NaN,
                            )
                        }
                    >
                        <option value="">Select a year</option>
                        {yearOptions.map((year) => (
                            <option key={`year-${year}`} value={year}>
                                {year}
                            </option>
                        ))}
                    </select>
                </div>
                <button
                    type="button" onClick={handleToggleOptimizedPath} disabled={!hasSelectedPath} id="optimizedButton">
                    {showOptimizedPath ? "ORIGINAL PATH" : "OPTIMIZED PATH"}
                </button>
                <button type="button" id="EntiredButton" onClick={handleSelectEntirePath}>
                    ENTIRE PATH
                </button>
                <button type="button" id="ResetButton" onClick={handleResetSelection}>
                    RESET
                </button>
            </div>

            <ComposableMap projection="geoEqualEarth" width={780} height={520}>
                <ZoomableGroup
                    minZoom={1}
                    maxZoom={8}
                    scaleExtent={createScaleExtent(1, 8)}
                    translateExtent={createTranslateExtent(
                        createCoordinates(-2000, -1000),
                        createCoordinates(2000, 1000),
                    )}
                    onMoveEnd={(position: any) => {
                        const rawZoom =
                            position?.k ??
                            position?.scale ??
                            position?.zoom ??
                            1;
                        const snapped = Math.round(rawZoom / STEP) * STEP;
                        const prevZoom = zoomRef.current;
                        zoomRef.current = Math.round(snapped * 1000) / 1000;
                        if (Math.abs(snapped - prevZoom) > EPS) {
                            if (debounceTimer.current)
                                window.clearTimeout(debounceTimer.current);
                            debounceTimer.current = window.setTimeout(() => {
                                setMarkerScale(
                                    1 / Math.max(0.001, zoomRef.current),
                                );
                                setShowLabels(
                                    zoomRef.current >=
                                        SHOW_LABEL_ZOOM_THRESHOLD,
                                );
                                debounceTimer.current = null;
                            }, DEBOUNCE_MS);
                        }

                        // optional center handling
                        let newCenter = null;
                        if (
                            Array.isArray(position?.coordinates) &&
                            position.coordinates.length >= 2
                        ) {
                            newCenter = createCoordinates(
                                position.coordinates[0],
                                position.coordinates[1],
                            );
                        } else if (
                            position?.center &&
                            Array.isArray(position.center) &&
                            position.center.length >= 2
                        ) {
                            newCenter = createCoordinates(
                                position.center[0],
                                position.center[1],
                            );
                        } else if (
                            position?.center &&
                            typeof position.center === "object"
                        ) {
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
                                        default: {
                                            fill: "#D6D6DA",
                                            outline: "none",
                                            stroke: "#fff",
                                            strokeWidth: 0.5,
                                            userSelect: "none",
                                        },
                                        hover: {
                                            fill: "#F53",
                                            cursor: "pointer",
                                            outline: "none",
                                        },
                                        pressed: {
                                            fill: "#E42",
                                            outline: "none",
                                        },
                                    }}
                                />
                            ))
                        }
                    </Geographies>

                    {/* Markers for circuits */}
                    {filteredRaces.map((circuit, idx) => {
                        const BASE_MARKER_RADIUS_PX = 3;
                        const BASE_FONT_PX = 10;
                        const invZoom = markerScale;

                        return (
                            <Marker
                                key={`${circuit.circuitId}-${idx}`}
                                coordinates={createCoordinates(
                                    circuit.lng,
                                    circuit.lat,
                                )}
                            >
                                <g
                                    transform={`scale(${invZoom})`}
                                    style={{
                                        transformOrigin: "0 0",
                                        pointerEvents: "auto",
                                        cursor: "pointer",
                                    }}
                                >
                                    <circle
                                        r={BASE_MARKER_RADIUS_PX}
                                        fill="#F44174"
                                        stroke="#fff"
                                        strokeWidth={Math.max(
                                            0.5,
                                            BASE_MARKER_RADIUS_PX * 0.08,
                                        )}
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
                                            {circuit.name}
                                        </text>
                                    )}
                                </g>
                            </Marker>
                        );
                    })}

                    {showOptimizedPath ? (
                        <RouteSegmentsLayer
                            segments={optimizedRouteSegments}
                            markerScale={markerScale}
                            activeSegmentOrders={[]}
                            showLabels={false}
                            showArrows={false}
                        />
                    ) : (
                        <RouteSegmentsLayer
                            segments={routeSegments}
                            markerScale={markerScale}
                            onSegmentClick={handleSegmentClick}
                            activeSegmentOrders={activeSegmentOrders}
                        />
                    )}
                </ZoomableGroup>
            </ComposableMap>
        </div>
    );
};

export default InteractiveMap;
