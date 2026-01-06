import React, { useEffect, useMemo, useState } from "react";
import Graph from "./models/Graph_API";
import type { RaceWithCircuit } from "./models/RaceWithCircuit";
import { getRacesWithCircuitsByYear } from "./utils/dataLoader";
import "../css/GraphPlayer.css";
import type { Circuit } from "./models/Circuit";
import { Flow } from "./Flow";
import { useSettings } from "../SettingsContext";
import ContinentPieChart from "./ContinentPieChart";
import CountryCircuitList from "./CountryCircuitList";
import CircuitDetails from "./CircuitDetails";

// Return the Km saved between original and optimized path
const getKmSaved = (graph: Graph): number => {
    const originalDistances = graph.getOriginalPathDistance();
    const optimizedDistances = graph.getOptimizedPathDistance();
    if (originalDistances && optimizedDistances) {
        return originalDistances.carDistance - optimizedDistances.carDistance;
    }
    return 0;
}

// Return the CO2 saved between original and optimized path
const getCO2Saved = (graph: Graph, co2_per_km_car: number, co2_per_km_flight: number): number => {
    const originalDistances = graph.getOriginalPathDistance();
    const optimizedDistances = graph.getOptimizedPathDistance();
    if (originalDistances && optimizedDistances) {
        const originalCO2 = (originalDistances.carDistance * co2_per_km_car) + (originalDistances.flightDistance * co2_per_km_flight);
        const optimizedCO2 = (optimizedDistances.carDistance * co2_per_km_car) + (optimizedDistances.flightDistance * co2_per_km_flight);
        return originalCO2 - optimizedCO2;
    }
    return 0;
}

// Props passed to GraphPlayer component
type props = {
    co2_emission_car: number;
    co2_emission_flight: number;
};

const GraphPlayer: React.FC<props> = ({ co2_emission_car, co2_emission_flight }) => {
    const { year , selected_race , setSelectedRace } = useSettings();
    const [races, setRaces] = useState<RaceWithCircuit[]>([]);
    const [baseGraph, setBaseGraph] = useState<Graph | null>(null);
    const [selectedCircuit, setSelectedCircuit] = useState<Circuit | null>(null);
    

    // Obtain all circuits for the actual year
    const circuitsMemo = useMemo(() => {
        if (!races.length) return [];
        return races.map(race => race.circuit);
    }, [races]);

    // Obtain only filtered circuits
    const filteredRaces = useMemo(() => {
        if (!races.length) return [];
        if (selected_race.length === 0) return races;
        return races.filter((race) => selected_race.includes(race.circuit.name));
    }, [races, selected_race]);

    const circuitsSelectedMemo = useMemo(() => {
        if (!filteredRaces.length) return [];
        return filteredRaces.map((race) => race.circuit)
    }, [filteredRaces]);

    useEffect(() => {
        if (!selectedCircuit) return;
        const stillVisible = circuitsMemo.some(
            (circuit) => circuit.circuitId === selectedCircuit.circuitId,
        );
        if (!stillVisible) {
            setSelectedCircuit(null);
        }
    }, [circuitsMemo, selectedCircuit]);

    // Update after year change
    useEffect(() => {
        let cancelled = false;
        setSelectedRace([]); // Reset selected

        const loadGraph = async () => {
            try {
                const data = await getRacesWithCircuitsByYear(year);
                if (cancelled) return;

                const nextGraph = new Graph(undefined, year);
                await nextGraph.initPath(data);
                if (cancelled) return;

                setRaces(data);
                setBaseGraph(nextGraph);
            } catch (error) {
                console.error("Failed to load races or build graph:", error);
            }
        };

        void loadGraph();

        return () => {
            cancelled = true;
        };
    }, [year, setSelectedRace]);

    const graph = useMemo(() => {
        if (!baseGraph || baseGraph.isEmpty() || races.length === 0) return null;

        try {
            const nextGraph = new Graph(baseGraph);
            nextGraph.initSelectedPath(filteredRaces);
            return nextGraph;
        } catch (error) {
            console.error("Failed to initialize selected path:", error);
            return null;
        }
    }, [baseGraph, filteredRaces, races.length]);

    return (
    <div className="graph-player">
        
        <div className="selected-route">
            Selected route:{" "}
            <strong>
                {selected_race.length > 0
                    ? selected_race.length
                    : graph
                      ? graph.getNumberOfNodes()
                      : ""}
            </strong>
        </div>

        <br></br>
        <div className="title title--original">Original path</div>

        {graph?.getOriginalPath() && (<Flow flowList={graph.getOriginalPath()} />)}
        
        {/* CAR */}
        <div className="route-row">
            <div className="route-info">
                <p>• TOT_KM : {graph ? graph.getOriginalPathDistance().carDistance : "Loading..."} {graph ? "Km" : ""}</p>
                <p>• CO2_EMISSION : {graph ? Math.round(graph.getOriginalPathDistance().carDistance * co2_emission_car * 100) / 100 : "Loading..."} {graph ? "Kg" : ""}</p>
            </div>
            <div className="route-icon">🚗</div>
        </div>

        {/* PLANE */}
        <div className="route-row">
            <div className="route-info">
                <p>• TOT_KM : {graph ? graph.getOriginalPathDistance().flightDistance : "Loading..."} {graph ? "Km" : ""}</p>
                <p>• CO2_EMISSION : {graph ?  Math.round(graph.getOriginalPathDistance().flightDistance * co2_emission_flight * 100) / 100 : "Loading..."} {graph ? "Kg" : ""}</p>
            </div>
            <div className="route-icon">✈️</div>
        </div>

        {/* OPTIMIZED PATH */}
        {selected_race.length > 0 && (
            <>
            <div className="title title--optimized">Optimized path</div>
            {graph?.getOptimizedPath() && (<Flow flowList={graph.getOptimizedPath()} />)}
            
            {/* CAR */}
            <div className="route-row route-row--savings">
                <div className="route-info">
                    <p>• TOT_KM : {graph ? graph.getOptimizedPathDistance().carDistance : "Loading..."} {graph ? "Km" : ""}</p>
                    <p>• CO2_EMISSION : {graph ? Math.round(graph.getOptimizedPathDistance().carDistance * co2_emission_car * 100) / 100 : "Loading..."} {graph ? "Kg" : ""}</p>
                </div>
                <div className="route-icon">🚗</div>
            </div>

            {/* PLANE */}
            <div className="route-row">
                <div className="route-info">
                    <p>• TOT_KM : {graph ? graph.getOptimizedPathDistance().flightDistance : "Loading..."} {graph ? "Km" : ""}</p>
                    <p>• CO2_EMISSION : {graph ?  Math.round(graph.getOptimizedPathDistance().flightDistance * co2_emission_flight * 100) / 100 : "Loading..."} {graph ? "Kg" : ""}</p>
                </div>
                <div className="route-icon">✈️</div>
            </div>

            {/* SAVINGS */}
            <div className="route-row">
                <div className="route-info">
                    <p>• TOT_KM : {graph ? getKmSaved(graph) == 0 ? 'No improvement possible' : getKmSaved(graph) : "Loading..."} {graph ? "Km" : ""}</p>
                    <p>• CO2_EMISSION : {graph ? getCO2Saved(graph, co2_emission_car, co2_emission_flight) == 0 ? 'No improvement possible' : Math.round(getCO2Saved(graph, co2_emission_car, co2_emission_flight) * 100) / 100 : "Loading..."} {graph ? "Kg" : ""}</p>
                </div>
                <div className="route-icon">♻️</div>
            </div>

            {/* List of selected circuits */}
            {!selectedCircuit && (
                <>
                    <div className="title title--selected">Selected circuits</div>
                    <CountryCircuitList
                        circuits={circuitsSelectedMemo}
                        onSelectCircuit={setSelectedCircuit}
                    />
                </>
            )}

            </>
        )}


        {/* INFO IF THERE ARE NO SELECTED NODES */}
        {selected_race.length === 0 && !selectedCircuit && (
            <>
                {/* CONTINENT MAX CHART */}
                <div className="title">Continent distribution</div>
                {circuitsMemo.length > 0 ? (
                    <ContinentPieChart circuits={circuitsMemo} />
                ) : (
                    "Loading..."
                )}

                <CountryCircuitList
                    circuits={circuitsMemo}
                    onSelectCircuit={setSelectedCircuit}
                />
            </>
        )}

        <div className="title title--details">Circuit information</div>
        {selectedCircuit ? (
            <CircuitDetails
                circuit={selectedCircuit}
                onBack={() => setSelectedCircuit(null)}
            />
        ) : (
            <div className="circuit-placeholder">
                Select a circuit from the list to see its details here.
            </div>
        )}

    </div>
    );
};
export default GraphPlayer
