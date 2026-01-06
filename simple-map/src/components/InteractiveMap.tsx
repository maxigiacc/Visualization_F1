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
import Graph from "./models/Graph_API";

const SEGMENT_COLORS = [
    "#b91c1c",
    "#dc2626",
    "#f97316",
    "#f59e0b",
];

// Props passed to InteractiveMap component
type props = {
    co2_emission_car: number;
    co2_emission_flight: number;
    setCo2EmissionCar: React.Dispatch<React.SetStateAction<number>>;
    setCo2EmissionFlight: React.Dispatch<React.SetStateAction<number>>;
};

const InteractiveMap: React.FC<props> = ({ co2_emission_car, co2_emission_flight, setCo2EmissionCar, setCo2EmissionFlight }) => {
    const [races, setRaces] = useState<Circuit[]>([]);
    const [racesWithCircuit, setRacesWithCircuit] = useState<RaceWithCircuit[]>([]);
    const [activeSegmentOrders, setActiveSegmentOrders] = useState<number[]>([]);
    const [showOptimizedPath, setShowOptimizedPath] = useState<boolean>(false);
    const [showAllSelectedNotice, setShowAllSelectedNotice] = useState<boolean>(false);  // Deal the notification for uncorrect click
    const [baseGraph, setBaseGraph] = useState<Graph | null>(null);
    const { year , selected_race, setSelectedRace  } = useSettings();
    
    const [hoveredCircuitId, setHoveredCircuitId] = useState<string | null>(null);

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

    // Load races and circuits data
    useEffect(() => {
    getRacesWithCircuits()
        .then(({ circuits, racesWithCircuit }) => {
            setRaces(circuits);
            setRacesWithCircuit(racesWithCircuit);
        })
        .catch(console.error);
    }, []);


    useEffect(() => {
        setActiveSegmentOrders([]);
        setShowAllSelectedNotice(false);
    }, [year, races, racesWithCircuit]);
    
    // Filtered races based on selected year
    const selectedYearRaces = useMemo(() => {
        if (!year) return races;
        const id_list = racesWithCircuit.filter(race => race.year === year).map(race => race.circuit.circuitId);
        return races.filter(c => id_list.includes(c.circuitId));
    }, [year, races, racesWithCircuit]);

    // Filtered races+circuits based on selected year 
    const selectedYearRacesWithCircuit = useMemo(() => {
        if (!year) return [];
        return racesWithCircuit.filter((race) => race.year === year).sort((a, b) => a.round - b.round);
    }, [racesWithCircuit, year]);

    // Filter races+circuits based on selected circuits for optimization
    const selectedRacesForOptimization = useMemo(() => {
        if (selected_race.length === 0) return selectedYearRacesWithCircuit;
        const selectedNames = new Set(selected_race);
        return selectedYearRacesWithCircuit.filter((race) =>
            selectedNames.has(race.circuit.name),
        );
    }, [selectedYearRacesWithCircuit, selected_race]);

    useEffect(() => {
        let cancelled = false;

        setBaseGraph(null);

        if (!year || Number.isNaN(year) || selectedYearRacesWithCircuit.length === 0) {
            return () => {
                cancelled = true;
            };
        }

        const buildGraph = async () => {
            try {
                const nextGraph = new Graph(undefined, year);
                await nextGraph.initPath(selectedYearRacesWithCircuit);
                if (cancelled) return;
                setBaseGraph(nextGraph);
            } catch (error) {
                console.error("Failed to initialize graph:", error);
                if (!cancelled) {
                    setBaseGraph(null);
                }
            }
        };

        void buildGraph();

        return () => {
            cancelled = true;
        };
    }, [year, selectedYearRacesWithCircuit]);

    const selectedGraph = useMemo(() => {
        if (!baseGraph || baseGraph.isEmpty()) return null;

        try {
            const nextGraph = new Graph(baseGraph);
            nextGraph.initSelectedPath(selectedRacesForOptimization);
            return nextGraph;
        } catch (error) {
            console.error("Failed to initialize selected path:", error);
            return null;
        }
    }, [baseGraph, selectedRacesForOptimization]);

    // Filtered and ordered races+circuits based on optimized path
    const optimizedOrderedRaces = useMemo(() => {
        if (selectedRacesForOptimization.length <= 1) {
            return selectedRacesForOptimization;
        }

        if (!selectedGraph || selectedGraph.isEmpty()) {
            return selectedRacesForOptimization;
        }

        const optimizedPath = selectedGraph.getOptimizedPathNodes();
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
    }, [selectedGraph, selectedRacesForOptimization]);

    const routeSegments = useMemo<RouteSegment[]>(() => {
        if (selectedYearRacesWithCircuit.length <= 1) return [];
        return selectedYearRacesWithCircuit.slice(0, -1).map((race, idx) => {
            const nextRace = selectedYearRacesWithCircuit[idx + 1];
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
    }, [selectedYearRacesWithCircuit]);

    const optimizedRouteSegments = useMemo<RouteSegment[]>(() => {
        if (optimizedOrderedRaces.length <= 1) return [];
        // If you want to visualize original vs optimized path, change here the offset values
        const OPTIMIZED_OFFSET = { lng: 0, lat: 0 };
        const OPTIMIZED_LABEL_OFFSET_LAT = 0;
        
        return optimizedOrderedRaces.slice(0, -1).map((race, idx) => {
            const nextRace = optimizedOrderedRaces[idx + 1];
            const baseCoordinates = generateCurvedLine(
                race.coordinates,
                nextRace.coordinates,
                0.25,
                64,
            );
            const coordinates = baseCoordinates.map(([lng, lat]) =>
                createCoordinates(
                    lng + OPTIMIZED_OFFSET.lng,
                    lat + OPTIMIZED_OFFSET.lat
                )
            );
            const labelCoordinatesBase =
                coordinates[Math.floor(coordinates.length / 2)] ??
                race.coordinates;
            const labelCoordinates = createCoordinates(
                labelCoordinatesBase[0],
                labelCoordinatesBase[1] - OPTIMIZED_LABEL_OFFSET_LAT
            );
            const arrowIndex = Math.max(coordinates.length - 3, 0);
            const arrowCoordinates =
                coordinates[arrowIndex] ?? nextRace.coordinates;
            return {
                id: `${race.raceId}-${nextRace.raceId}-optimized`,
                from: race,
                to: nextRace,
                coordinates,
                color: "#0f766e",
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
            if ( selectedYearRaces.length > 0 && new_list_of_races.length === selectedYearRaces.length) {
                setShowAllSelectedNotice(true);
            }
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

    useEffect(() => {
        if ( selectedYearRaces.length === 0 || selected_race.length !== selectedYearRaces.length) {
            setShowAllSelectedNotice(false);
        }
    }, [selectedYearRaces.length, selected_race.length]);

    const handleToggleOptimizedPath = () => {
        if (!hasSelectedPath) return;
        setShowOptimizedPath((prev) => !prev);
    };

    const handleSelectEntirePath = () => {
        if (selectedYearRacesWithCircuit.length === 0) return;
        setSelectedRace(selectedYearRacesWithCircuit.map((race) => race.circuit.name));
        setActiveSegmentOrders(routeSegments.map((segment) => segment.order));
    };

    const handleResetSelection = () => {
        setSelectedRace([]);
        setActiveSegmentOrders([]);
        setShowOptimizedPath(false);
        setShowAllSelectedNotice(false);
    };

    return (
        <div style={{ position: "relative" }} className="InteractiveMap">
            
            {/* Filter bar for year selection and buttons */}
            <div className="filterBar">
                
                {/* C02 EMISSION PLANE */}
                <div className="height">
                    <label htmlFor="C02">CO2<sup>✈︎</sup></label>
                    <input onChange={(e) => setCo2EmissionFlight(Number(e.target.value))} value={co2_emission_flight} id="C02-plane" type="text" autoComplete="off" name="text" className="input" />
                </div>

                {/* C02 EMISSION CAR */}
                <div className="height">
                    <label htmlFor="C02">CO2<sup>🚗</sup></label>
                    <input onChange={(e) => setCo2EmissionCar(Number(e.target.value))} value={co2_emission_car} id="C02-car" type="text" autoComplete="off" name="text" className="input" />
                </div>


                <button
                    type="button" onClick={handleToggleOptimizedPath} disabled={!hasSelectedPath} id="optimizedButton">
                    {showOptimizedPath ? "SHOW ORIGINAL PATH" : "SHOW OPTIMIZED PATH"}
                </button>
                <button type="button" id="EntiredButton" onClick={handleSelectEntirePath} disabled={selectedYearRaces.length > 0 && selected_race.length === selectedYearRaces.length} >
                    SELECT ALL
                </button>
                <button type="button" id="ResetButton" onClick={handleResetSelection} disabled={selected_race.length === 0} >
                    RESET
                </button>
            </div>
            
            {/* Notification for selecting all */}
            {showAllSelectedNotice && (
                    <div className="selectionNotice">
                        You have selected all the races now! If you want to
                        restart the selection clicked RESET button.
                    </div>
            )}

            {/* The Map itself */}
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
                                            fill: "#e5e7eb",
                                            outline: "none",
                                            stroke: "#f8fafc",
                                            strokeWidth: 0.5,
                                            userSelect: "none",
                                        },
                                        hover: {
                                            fill: "#ff8a00",
                                            cursor: "pointer",
                                            outline: "none",
                                        },
                                        pressed: {
                                            fill: "#e10600",
                                            outline: "none",
                                        },
                                    }}
                                />
                            ))
                        }
                    </Geographies>

                    {/* Markers for circuits */}
                    {selectedYearRaces.map((circuit, idx) => {
                        const BASE_MARKER_RADIUS_PX = 3;
                        const BASE_FONT_PX = 12;
                        const invZoom = markerScale;

                        const isHovered = hoveredCircuitId === circuit.circuitId;

                        return (
                            <Marker
                                key={`${circuit.circuitId}-${idx}`}
                                coordinates={createCoordinates(circuit.lng, circuit.lat)}
                            >
                                <g
                                    transform={`scale(${invZoom})`}
                                    style={{
                                        transformOrigin: "0 0",
                                        pointerEvents: "auto",
                                        cursor: "pointer",
                                    }}
                                    onMouseEnter={() => setHoveredCircuitId(circuit.circuitId)}
                                    onMouseLeave={() => setHoveredCircuitId(null)}
                                >
                                    {/* DOT */}
                                    <circle
                                        r={BASE_MARKER_RADIUS_PX}
                                        fill="#E10600" // F1 red
                                        stroke="#fff"
                                        strokeWidth={0.6}
                                    />

                                    {/* LABEL — ONLY ON HOVER */}
                                    {isHovered && (
                                        <text
                                            x={0}
                                            y={-BASE_MARKER_RADIUS_PX - 6}
                                            textAnchor="middle"
                                            style={{
                                                fontSize: `${BASE_FONT_PX}px`,
                                                fontWeight: 600,
                                                fill: "#FFFFFF",
                                                pointerEvents: "none",
                                                userSelect: "none",

                                                // F1-style readability
                                                paintOrder: "stroke",
                                                stroke: "rgba(0,0,0,0.85)",
                                                strokeWidth: 3,
                                                strokeLinecap: "round",
                                                strokeLinejoin: "round",
                                            }}
                                        >
                                            {circuit.name}
                                        </text>
                                    )}
                                </g>
                            </Marker>
                        );
                    })}


                    {/* If optimized path is clicked, draw OPTIMIZED overlays otherwise ORIGINAL */}
                    {showOptimizedPath ? (
                        <>
                            <RouteSegmentsLayer
                                segments={optimizedRouteSegments}
                                markerScale={markerScale}
                                activeSegmentOrders={[]}
                                showLabels={true}
                                showArrows={true}
                                interactive={false}
                            />
                        </>
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
