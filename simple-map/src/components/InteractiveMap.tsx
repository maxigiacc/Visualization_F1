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
    "#FF6B6B", "#FFA94D", "#FFD43B", "#69DB7C",
    "#4DABF7", "#9775FA", "#F06595", "#63C5DA",
];

const InteractiveMap: React.FC = () => {
    const [races, setRaces] = useState<Circuit[]>([]);
    const [racesWithCircuit, setRacesWithCircuit] = useState<RaceWithCircuit[]>([]);
    const [activeSegmentOrders, setActiveSegmentOrders] = useState<number[]>([]);
    const [showOptimizedPath, setShowOptimizedPath] = useState<boolean>(false);
    const [showAllSelectedNotice, setShowAllSelectedNotice] = useState<boolean>(false);  // Deal the notification for uncorrect click
    const [baseGraph, setBaseGraph] = useState<Graph | null>(null);
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

    // Load races and circuits data
    useEffect(() => {
    getRacesWithCircuits()
        .then(({ circuits, racesWithCircuit }) => {
            setRaces(circuits);
            setRacesWithCircuit(racesWithCircuit);
        })
        .catch(console.error);
    }, []);

    // List of years available for the dropdown
    const yearOptions = useMemo(() => {
        const years = Array.from(new Set(racesWithCircuit.map((race) => race.year)));
        years.sort((a, b) => a - b);
        return years;
    }, [racesWithCircuit]);

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
        const OPTIMIZED_OFFSET = { lng: 1.2, lat: 0.8 };
        const OPTIMIZED_LABEL_OFFSET_LAT = 5;
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
                color: "#2F9E44",
                order: idx + 1,
                labelCoordinates,
                arrowCoordinates,
            };
        });
    }, [optimizedOrderedRaces]);

    const originalOverlaySegments = useMemo<RouteSegment[]>(() => {
        const baseSegments =
            activeSegmentOrders.length > 0
                ? routeSegments.filter((segment) =>
                      activeSegmentOrders.includes(segment.order),
                  )
                : [];
        return baseSegments.map((segment) => ({
            ...segment,
            color: "#F08C00",
        }));
    }, [routeSegments, activeSegmentOrders]);

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
                    {selectedYearRaces.map((circuit, idx) => {
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
