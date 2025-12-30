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

// Placeholder function for onSelectCircuit prop
const placeHolder = (circuit: Circuit | null) => void{};

const GraphPlayer: React.FC = () => {
    const { year , selected_race , setSelectedRace } = useSettings();
    const [races, setRaces] = useState<RaceWithCircuit[]>([]);
    const [baseGraph, setBaseGraph] = useState<Graph | null>(null);
    const co2_per_km_car = 0.192; // Kg CO2 per Km for car
    const co2_per_km_flight = 0.255; // Kg CO2 per Km for flight

    // Obtain circuits for the actual year
    const circuitsMemo = useMemo(() => {
        if (!races.length) return [];
        return races.map(race => race.circuit);
    }, [races]);

    // Update after year change
    useEffect(() => {
        let cancelled = false;
        setSelectedRace([]); // Reset selected

        const loadGraph = async () => {
            try {
                const data = await getRacesWithCircuitsByYear(year);
                if (cancelled) return;

                const nextGraph = new Graph();
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

    const filteredRaces = useMemo(() => {
        if (!races.length) return [];
        if (selected_race.length === 0) return races;
        return races.filter((race) => selected_race.includes(race.circuit.name));
    }, [races, selected_race]);

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
            selected - route : <strong>{selected_race.length > 0 ? selected_race.length : graph ? graph.getNumberOfNodes() : ""} </strong>
        </div>

        <br></br>
        <div className="title" style={{color : "blue"}}>Original path</div>

        {graph?.getOriginalPath() && (<Flow flowList={graph.getOriginalPath()} />)}
        
        {/* CAR */}
        <div className="route-row">
            <div className="route-info">
                <p>• TOT_KM : {graph ? graph.getOriginalPathDistance().carDistance : "Loading..."} {graph ? "Km" : ""}</p>
                <p>• CO2_EMISSION : {graph ? Math.round(graph.getOriginalPathDistance().carDistance * co2_per_km_car * 100) / 100 : "Loading..."} {graph ? "Kg" : ""}</p>
            </div>
            <div className="route-icon">🚗</div>
        </div>

        {/* PLANE */}
        <div className="route-row">
            <div className="route-info">
                <p>• TOT_KM : {graph ? graph.getOriginalPathDistance().flightDistance : "Loading..."} {graph ? "Km" : ""}</p>
                <p>• CO2_EMISSION : {graph ?  Math.round(graph.getOriginalPathDistance().flightDistance * co2_per_km_flight * 100) / 100 : "Loading..."} {graph ? "Kg" : ""}</p>
            </div>
            <div className="route-icon">✈️</div>
        </div>

        {/* OPTIMIZED PATH */}
        {selected_race.length > 0 && (
            <>
            <div className="title" style={{color : "green"}}>Optimized path</div>
            {graph?.getOptimizedPath() && (<Flow flowList={graph.getOptimizedPath()} />)}
            
            {/* CAR */}
            <div className="route-row">
                <div className="route-info">
                    <p>• TOT_KM : {graph ? graph.getOptimizedPathDistance().carDistance : "Loading..."} {graph ? "Km" : ""}</p>
                    <p>• CO2_EMISSION : {graph ? Math.round(graph.getOptimizedPathDistance().carDistance * co2_per_km_car * 100) / 100 : "Loading..."} {graph ? "Kg" : ""}</p>
                </div>
                <div className="route-icon">🚗</div>
            </div>

            {/* PLANE */}
            <div className="route-row">
                <div className="route-info">
                    <p>• TOT_KM : {graph ? graph.getOptimizedPathDistance().flightDistance : "Loading..."} {graph ? "Km" : ""}</p>
                    <p>• CO2_EMISSION : {graph ?  Math.round(graph.getOptimizedPathDistance().flightDistance * co2_per_km_flight * 100) / 100 : "Loading..."} {graph ? "Kg" : ""}</p>
                </div>
                <div className="route-icon">✈️</div>
            </div>

            {/* SAVINGS */}
            <div className="route-row">
                <div className="route-info">
                    <p>• TOT_KM : {graph ? getKmSaved(graph) == 0 ? 'No improvement possible' : getKmSaved(graph) : "Loading..."} {graph ? "Km" : ""}</p>
                    <p>• CO2_EMISSION : {graph ? getCO2Saved(graph, co2_per_km_car, co2_per_km_flight) == 0 ? 'No improvement possible' : Math.round(getCO2Saved(graph, co2_per_km_car, co2_per_km_flight) * 100) / 100 : "Loading..."} {graph ? "Kg" : ""}</p>
                </div>
                <div className="route-icon">♻️</div>
            </div>
            </>
        )}


        {/* INFO IF THERE ARE NO SELECTED NODES */}
        {selected_race.length === 0 && (
            <>
                {/* CONTINENT MAX CHART */}
                <div className="title">continent distribution</div>
                {circuitsMemo.length > 0 ? <ContinentPieChart circuits={circuitsMemo}></ContinentPieChart> : "Loading..." }

                <CountryCircuitList circuits={circuitsMemo} onSelectCircuit={placeHolder}></CountryCircuitList>
            </>
        )}

    </div>
    );
};
export default GraphPlayer
