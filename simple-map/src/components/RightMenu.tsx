import { useEffect, useMemo, useRef, useState } from "react";
import { csv } from "d3-fetch";
import { useSettings } from "../SettingsContext";
import { fromStringCircuit, type Circuit } from "./models/Circuit";
import { fromStringRace, type Race } from "./models/Race";
import Graph from "./models/Graph";
import "../css/RightMenu.css";

type DistanceResponse = { car: number; plane: number };

type EdgePreview = {
    fromRound: number;
    toRound: number;
    fromName: string;
    toName: string;
    car: number;
    plane: number;
};

type GraphNode = {
    id: string;
    round: number;
    label: string;
};

type PositionedNode = GraphNode & { x: number; y: number };

const RightMenu = () => {
    const fakeApi = (fromAirport: string, toAirport: string) => {
        return new Promise<DistanceResponse>((resolve) => {
            setTimeout(() => {
                const seed = (fromAirport.length + toAirport.length) % 120;
                const base = Math.floor(Math.random() * 900) + 150 + seed;
                const delta = Math.floor(Math.random() * 140);
                resolve({ car: base, plane: base + delta });
            }, 700 + Math.random() * 600);
        });
    };

    const { year } = useSettings();
    const pathGraphRef = useRef<Graph | null>(null);
    const totalGraphRef = useRef<Graph | null>(null);
    const [circuits, setCircuits] = useState<Circuit[]>([]);
    const [races, setRaces] = useState<Race[]>([]);
    const [loading, setLoading] = useState(true);
    const [startRound, setStartRound] = useState(1);
    const [endRound, setEndRound] = useState(1);
    const [graphEdges, setGraphEdges] = useState<EdgePreview[]>([]);
    const [totalGraphEdges, setTotalGraphEdges] = useState<EdgePreview[]>([]);
    const [buildingGraph, setBuildingGraph] = useState(false);
    const [graphError, setGraphError] = useState<string | null>(null);
    const [zoomScale, setZoomScale] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
        null,
    );
    const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(
        null,
    );
    const [hoveredEdge, setHoveredEdge] = useState<{
        edge: EdgePreview;
        midX: number;
        midY: number;
    } | null>(null);

    useEffect(() => {
        pathGraphRef.current = new Graph(year);
        totalGraphRef.current = new Graph(year);
    }, [year]);

    useEffect(() => {
        Promise.all([csv("/circuits.csv"), csv("/races.csv")])
            .then(([circuitsRaw, racesRaw]) => {
                setCircuits((circuitsRaw as any[]).map(fromStringCircuit));
                setRaces((racesRaw as any[]).map(fromStringRace));
            })
            .finally(() => setLoading(false));
    }, []);

    const circuitById = useMemo(() => {
        const map = new Map<number, Circuit>();
        circuits.forEach((circuit) => map.set(circuit.circuitId, circuit));
        return map;
    }, [circuits]);

    const racesForYear = useMemo(() => {
        return races
            .filter((race) => race.year === year)
            .sort((a, b) => a.round - b.round);
    }, [races, year]);

    const maxRound = useMemo(() => {
        if (racesForYear.length === 0) return 0;
        return Math.max(...racesForYear.map((race) => race.round));
    }, [racesForYear]);

    useEffect(() => {
        if (maxRound === 0) return;
        setStartRound(1);
        setEndRound(maxRound);
    }, [maxRound]);

    const selectedRaces = useMemo(
        () =>
            racesForYear
                .filter(
                    (race) => race.round >= startRound && race.round <= endRound,
                )
                .sort((a, b) => a.round - b.round),
        [endRound, racesForYear, startRound],
    );

    useEffect(() => {
        if (maxRound === 0) return;
        let cancelled = false;

        const buildGraph = async () => {
            setBuildingGraph(true);
            setGraphError(null);
            const pathGraph = new Graph(year);
            const fullGraph = new Graph(year);

            if (selectedRaces.length === 0) {
                if (!cancelled) {
                    pathGraphRef.current = pathGraph;
                    totalGraphRef.current = fullGraph;
                    setGraphEdges([]);
                    setTotalGraphEdges([]);
                    setBuildingGraph(false);
                }
                return;
            }

            const orderedPairs = selectedRaces.slice(0, -1).map((race, index) => {
                const nextRace = selectedRaces[index + 1];
                const fromCircuit = circuitById.get(race.circuitId);
                const toCircuit = circuitById.get(nextRace.circuitId);

                return {
                    from: race,
                    to: nextRace,
                    fromName: fromCircuit?.name ?? `Round ${race.round}`,
                    toName: toCircuit?.name ?? `Round ${nextRace.round}`,
                };
            });

            const allPairs = selectedRaces.flatMap((race, idx) =>
                selectedRaces.slice(idx + 1).map((otherRace) => {
                    const fromCircuit = circuitById.get(race.circuitId);
                    const toCircuit = circuitById.get(otherRace.circuitId);

                    return {
                        from: race,
                        to: otherRace,
                        fromName: fromCircuit?.name ?? `Round ${race.round}`,
                        toName: toCircuit?.name ?? `Round ${otherRace.round}`,
                    };
                }),
            );

            const edgeKey = (a: number, b: number) =>
                [Math.min(a, b), Math.max(a, b)].join("-");

            try {
                const distances = await Promise.all(
                    allPairs.map((pair) => fakeApi(pair.fromName, pair.toName)),
                );

                if (cancelled) return;

                const distanceMap = new Map<string, DistanceResponse>();

                allPairs.forEach((pair, idx) => {
                    const { car, plane } = distances[idx];
                    const key = edgeKey(
                        pair.from.circuitId,
                        pair.to.circuitId,
                    );
                    distanceMap.set(key, { car, plane });
                    fullGraph.addEdge(
                        pair.from.circuitId.toString(),
                        pair.to.circuitId.toString(),
                        [car, plane],
                    );
                });

                orderedPairs.forEach((pair) => {
                    const key = edgeKey(
                        pair.from.circuitId,
                        pair.to.circuitId,
                    );
                    const distance = distanceMap.get(key);
                    if (!distance) return;
                    pathGraph.addEdge(
                        pair.from.circuitId.toString(),
                        pair.to.circuitId.toString(),
                        [distance.car, distance.plane],
                    );
                });

                pathGraphRef.current = pathGraph;
                totalGraphRef.current = fullGraph;
                setGraphEdges(
                    orderedPairs.map((pair) => {
                        const key = edgeKey(
                            pair.from.circuitId,
                            pair.to.circuitId,
                        );
                        const distance = distanceMap.get(key);
                        return {
                            fromRound: pair.from.round,
                            toRound: pair.to.round,
                            fromName: pair.fromName,
                            toName: pair.toName,
                            car: distance?.car ?? 0,
                            plane: distance?.plane ?? 0,
                        };
                    }),
                );
                setTotalGraphEdges(
                    allPairs.map((pair, idx) => ({
                        fromRound: pair.from.round,
                        toRound: pair.to.round,
                        fromName: pair.fromName,
                        toName: pair.toName,
                        car: distances[idx].car,
                        plane: distances[idx].plane,
                    })),
                );
            } catch (err) {
                if (!cancelled) {
                    setGraphError("Unable to build the graph right now.");
                }
            } finally {
                if (!cancelled) {
                    setBuildingGraph(false);
                }
            }
        };

        void buildGraph();

        return () => {
            cancelled = true;
        };
    }, [circuitById, maxRound, selectedRaces, year]);

    const sliderMin = 1;
    const sliderMax = Math.max(maxRound, 1);
    const clampStart = (value: number) => Math.min(value, endRound);
    const clampEnd = (value: number) => Math.max(value, startRound);

    const percent = (value: number) => {
        if (sliderMax === sliderMin) return 0;
        return ((value - sliderMin) / (sliderMax - sliderMin)) * 100;
    };

    const clampZoom = (value: number) => Math.max(0.6, Math.min(3, value));
    const resetView = () => {
        setZoomScale(1);
        setPan({ x: 0, y: 0 });
    };

    const handleWheel = (event: React.WheelEvent<SVGSVGElement>) => {
        event.preventDefault();
        const delta = event.deltaY > 0 ? -0.1 : 0.1;
        setZoomScale((prev) => clampZoom(prev + delta));
    };

    const handleMouseDown = (event: React.MouseEvent<SVGSVGElement>) => {
        setDragStart({ x: event.clientX, y: event.clientY });
        setPanStart({ ...pan });
    };

    const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
        if (!dragStart || !panStart) return;
        const dx = (event.clientX - dragStart.x) / zoomScale;
        const dy = (event.clientY - dragStart.y) / zoomScale;
        setPan({ x: panStart.x + dx, y: panStart.y + dy });
    };

    const stopDrag = () => {
        setDragStart(null);
        setPanStart(null);
    };

    const graphNodes: GraphNode[] = useMemo(
        () =>
            selectedRaces.map((race) => {
                const circuit = circuitById.get(race.circuitId);
                return {
                    id: race.circuitId.toString(),
                    round: race.round,
                    label: circuit?.name ?? `Round ${race.round}`,
                };
            }),
        [circuitById, selectedRaces],
    );

    if (loading) return <div>Loading circuits…</div>;

    return (
        <div className="right-menu">
            <div className="right-menu__header">
                <h2>Race range</h2>
                <span className="year-pill">Year {year}</span>
            </div>

            {maxRound === 0 ? (
                <div className="right-menu__empty">
                    No circuits found for this year.
                </div>
            ) : (
                <>
                    <div className="slider-card">
                        <div className="slider-card__labels">
                            <div>
                                Start: <strong>Round {startRound}</strong>
                            </div>
                            <div>
                                End: <strong>Round {endRound}</strong>
                            </div>
                        </div>
                        <div className="range-slider">
                            <div className="range-slider__track" />
                            <div
                                className="range-slider__range"
                                style={{
                                    left: `${percent(startRound)}%`,
                                    width: `${percent(endRound) - percent(startRound)}%`,
                                }}
                            />
                            <input
                                type="range"
                                min={sliderMin}
                                max={sliderMax}
                                value={startRound}
                                onChange={(e) =>
                                    setStartRound(clampStart(Number(e.target.value)))
                                }
                            />
                            <input
                                type="range"
                                min={sliderMin}
                                max={sliderMax}
                                value={endRound}
                                onChange={(e) =>
                                    setEndRound(clampEnd(Number(e.target.value)))
                                }
                            />
                        </div>
                        <div className="range-slider__ticks">
                            <span>1</span>
                            <span>…</span>
                            <span>{maxRound}</span>
                        </div>
                    </div>

                    <div className="graph-card">
                        <div className="graph-card__header">
                            <h3>Generated graph</h3>
                            {buildingGraph && (
                                <span className="badge badge--working">
                                    building…
                                </span>
                            )}
                            {!buildingGraph && (
                                <button
                                    className="ghost-button"
                                    onClick={() => pathGraphRef.current?.print()}
                                >
                                    Debug print
                                </button>
                            )}
                        </div>

                        {graphError && (
                            <div className="error-box">{graphError}</div>
                        )}

                        {selectedRaces.length === 0 ? (
                            <div className="right-menu__empty">
                                Pick at least one round to see the path.
                            </div>
                        ) : (
                            <>
                                <div className="path-visual">
                                    {selectedRaces.map((race, idx) => {
                                        const circuit =
                                            circuitById.get(race.circuitId);
                                        const label =
                                            circuit?.name ??
                                            `Round ${race.round}`;
                                        const isLast =
                                            idx === selectedRaces.length - 1;
                                        return (
                                            <div
                                                className="path-visual__node"
                                                key={race.raceId}
                                            >
                                                <div className="path-visual__round">
                                                    {race.round}
                                                </div>
                                                <div className="path-visual__label">
                                                    {label}
                                                </div>
                                                {!isLast && (
                                                    <div className="path-visual__arrow">
                                                        →
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <ul className="edge-list">
                                    {graphEdges.map((edge) => (
                                        <li
                                            key={`${edge.fromRound}-${edge.toRound}`}
                                            className="edge-list__item"
                                        >
                                            <div className="edge-list__title">
                                                <span className="edge-list__round">
                                                    {edge.fromRound}
                                                </span>
                                                <span className="edge-list__connector">
                                                    →
                                                </span>
                                                <span className="edge-list__round edge-list__round--end">
                                                    {edge.toRound}
                                                </span>
                                            </div>
                                            <div className="edge-list__names">
                                                {edge.fromName} → {edge.toName}
                                            </div>
                                            <div className="edge-list__distances">
                                                <span>
                                                    ✈️ {edge.plane} km
                                                </span>
                                                <span>
                                                    🚗 {edge.car} km
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>

                                <div className="graph-card__subheader">
                                    <h4>Total graph (fully connected)</h4>
                                    {!buildingGraph && (
                                        <button
                                            className="ghost-button"
                                            onClick={() =>
                                                totalGraphRef.current?.print()
                                            }
                                        >
                                            Debug print
                                        </button>
                                    )}
                                </div>
                                {totalGraphEdges.length === 0 ? (
                                    <div className="right-menu__empty">
                                        Need at least two rounds to build the
                                        total graph.
                                    </div>
                                ) : (
                                    <>
                                        <div className="total-graph-wrapper">
                                            <svg
                                                viewBox="0 0 1000 900"
                                                className="total-graph"
                                                onWheel={handleWheel}
                                                onMouseDown={handleMouseDown}
                                                onMouseMove={handleMouseMove}
                                                onMouseUp={stopDrag}
                                                    onMouseLeave={stopDrag}
                                                    style={{
                                                        cursor: dragStart
                                                            ? "grabbing"
                                                            : "grab",
                                                    }}
                                            >
                                                <defs>
                                                    <marker
                                                        id="arrow-head"
                                                        viewBox="0 0 10 10"
                                                        refX="10"
                                                        refY="5"
                                                        markerWidth="6"
                                                        markerHeight="6"
                                                        orient="auto-start-reverse"
                                                    >
                                                        <path
                                                            d="M 0 0 L 10 5 L 0 10 z"
                                                            fill="#111827"
                                                        />
                                                    </marker>
                                                </defs>
                                                <g
                                                    transform={`translate(${pan.x} ${pan.y}) scale(${zoomScale})`}
                                                >
                                                {graphNodes.length > 1 &&
                                                    (() => {
                                                        const centerX = 500;
                                                        const centerY = 420;
                                                        const baseRadius = 220;
                                                        const radius =
                                                            baseRadius +
                                                            Math.max(
                                                                0,
                                                                graphNodes.length -
                                                                    10,
                                                            ) *
                                                                12;
                                                        const positioned: PositionedNode[] =
                                                            graphNodes.map(
                                                                (node, idx) => {
                                                                    const angle =
                                                                        (idx /
                                                                            graphNodes.length) *
                                                                            Math.PI *
                                                                            2 -
                                                                        Math.PI /
                                                                            2;
                                                                    const x =
                                                                        centerX +
                                                                        radius *
                                                                            Math.cos(
                                                                                angle,
                                                                            );
                                                                    const y =
                                                                        centerY +
                                                                        radius *
                                                                            Math.sin(
                                                                                angle,
                                                                            );
                                                                    return {
                                                                        ...node,
                                                                        x,
                                                                        y,
                                                                    };
                                                                },
                                                            );

                                                        const findPos = (round: number) =>
                                                            positioned.find(
                                                                (n) =>
                                                                    n.round ===
                                                                    round,
                                                            );

                                                        const edges = totalGraphEdges.map(
                                                            (edge) => {
                                                                const from =
                                                                    findPos(
                                                                        edge.fromRound,
                                                                    );
                                                                const to =
                                                                    findPos(
                                                                        edge.toRound,
                                                                    );
                                                                if (
                                                                    !from ||
                                                                    !to
                                                                )
                                                                    return null;

                                                                // direction: lower round to higher round
                                                                const shouldFlip =
                                                                    edge.fromRound >
                                                                    edge.toRound;
                                                                const start = shouldFlip
                                                                    ? to
                                                                    : from;
                                                                const end = shouldFlip
                                                                    ? from
                                                                    : to;
                                                                const midLabelX =
                                                                    (start.x +
                                                                        end.x) /
                                                                    2;
                                                                const midLabelY =
                                                                    (start.y +
                                                                        end.y) /
                                                                    2;

                                                                return (
                                                                    <g
                                                                        key={`${edge.fromRound}-${edge.toRound}-svg`}
                                                                    >
                                                                        <line
                                                                            x1={
                                                                                start.x
                                                                            }
                                                                            y1={
                                                                                start.y
                                                                            }
                                                                            x2={
                                                                                end.x
                                                                            }
                                                                            y2={
                                                                                end.y
                                                                            }
                                                                            stroke="#0f172a"
                                                                            strokeWidth={
                                                                                1.5
                                                                            }
                                                                            opacity={
                                                                                0.32
                                                                            }
                                                                            markerEnd="url(#arrow-head)"
                                                                            onMouseEnter={() =>
                                                                                setHoveredEdge(
                                                                                    {
                                                                                        edge,
                                                                                        midX: midLabelX,
                                                                                        midY: midLabelY,
                                                                                    },
                                                                                )
                                                                            }
                                                                            onMouseLeave={() =>
                                                                                setHoveredEdge(
                                                                                    null,
                                                                                )
                                                                            }
                                                                        />
                                                                    </g>
                                                                );
                                                            },
                                                        );

                                                        return (
                                                            <>
                                                                {edges}
                                                                {positioned.map(
                                                                    (node, idx) => (
                                                                        <g
                                                                            key={`node-${node.round}`}
                                                                        >
                                                                            <circle
                                                                                cx={
                                                                                    node.x
                                                                                }
                                                                                cy={
                                                                                    node.y
                                                                                }
                                                                                r={
                                                                                    26
                                                                                }
                                                                                fill="#0f172a"
                                                                                stroke="#0f172a"
                                                                                strokeWidth={
                                                                                    2
                                                                                }
                                                                                filter="drop-shadow(0 2px 4px rgba(0,0,0,0.15))"
                                                                            />
                                                                            <text
                                                                                x={
                                                                                    node.x
                                                                                }
                                                                                y={
                                                                                    node.y +
                                                                                    5
                                                                                }
                                                                                textAnchor="middle"
                                                                                className="node-label"
                                                                            >
                                                                                {
                                                                                    node.round
                                                                                }
                                                                            </text>
                                                                            <text
                                                                                x={
                                                                                    node.x +
                                                                                    Math.cos(
                                                                                        (idx /
                                                                                            positioned.length) *
                                                                                            Math.PI *
                                                                                            2 -
                                                                                            Math.PI /
                                                                                                2,
                                                                                    ) *
                                                                                    34
                                                                                }
                                                                                y={
                                                                                    node.y +
                                                                                    Math.sin(
                                                                                        (idx /
                                                                                            positioned.length) *
                                                                                            Math.PI *
                                                                                            2 -
                                                                                            Math.PI /
                                                                                                2,
                                                                                    ) *
                                                                                    34
                                                                                }
                                                                                textAnchor="middle"
                                                                                className="node-name"
                                                                            >
                                                                                {
                                                                                    node.label
                                                                                }
                                                                            </text>
                                                                        </g>
                                                                    ),
                                                                )}
                                                            </>
                                                        );
                                                    })()}
                                                </g>
                                            </svg>
                                            <div className="graph-zoom-controls">
                                                <button
                                                    onClick={() =>
                                                        setZoomScale((z) =>
                                                            clampZoom(z - 0.2),
                                                        )
                                                    }
                                                >
                                                    −
                                                </button>
                                                <span>
                                                    {(zoomScale * 100).toFixed(
                                                        0,
                                                    )}
                                                    %
                                                </span>
                                                <button
                                                    onClick={() =>
                                                        setZoomScale((z) =>
                                                            clampZoom(z + 0.2),
                                                        )
                                                    }
                                                >
                                                    +
                                                </button>
                                                <button onClick={resetView}>
                                                    Reset
                                                </button>
                                            </div>
                                        </div>
                                        {hoveredEdge && (
                                            <div
                                                className="edge-tooltip"
                                                style={{
                                                    transform: `translate(${(hoveredEdge.midX + pan.x) * zoomScale}px, ${(hoveredEdge.midY + pan.y) * zoomScale}px)`,
                                                }}
                                            >
                                                <div className="edge-tooltip__title">
                                                    {hoveredEdge.edge.fromName}{" "}
                                                    → {hoveredEdge.edge.toName}
                                                </div>
                                                <div className="edge-tooltip__body">
                                                    <span>
                                                        🚗{" "}
                                                        {hoveredEdge.edge.car}{" "}
                                                        km
                                                    </span>
                                                    <span>
                                                        ✈️{" "}
                                                        {hoveredEdge.edge.plane}{" "}
                                                        km
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default RightMenu;
