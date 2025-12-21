// TODO : Improve the pie chart and see the Massimo - link about charts
// TODO : Fix the optimized graph (if the first node is at the end invert the list)
// TODO : Insert list of races only when are selected all the races
// TODO : Add savings + CO2 emissions

import React, { useEffect, useMemo, useState } from "react";
import Graph from "./models/Graph";
import type { DistanceTuple } from "./models/Graph";
import type { RaceWithCircuit } from "./models/RaceWithCircuit";
import { getRacesWithCircuitsByYear } from "./utils/dataLoader";
import "../css/GraphPlayer.css";
import { ContinentPie } from "./ContinentPie";
import { Flow } from "./Flow";
import { useSettings } from "../SettingsContext";

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

const GraphPlayer: React.FC = () => {
    
    
    const { year , selected_race , setSelectedRace } = useSettings();
    const [races, setRaces] = useState<RaceWithCircuit[]>([]);
    const co2_per_km_car = 0.192; // Kg CO2 per Km for car
    const co2_per_km_flight = 0.255; // Kg CO2 per Km for flight
    
    let graph = useMemo(() => {
        console.log("Loading light");
        if (!races.length) return null;
        const filtered = selected_race?.length ? races.filter(race => selected_race.includes(race.circuit.name)) : races;
        return new Graph(filtered);
    }, [selected_race , races]);

    // Update after year change
    useEffect(() => {
        setSelectedRace([]); // Reset selected
        getRacesWithCircuitsByYear(year).then((data) => {
            setRaces(data);
        });
    }, [year]);

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
                {/* CONTINENT PIE CHART */}
                <ContinentPie
                title="continent distribution"
                slices={[
                    { label: "EU", value: 50, color: "#7b83eb" },
                    { label: "AFR", value: 25, color: "#f2b176" },
                    { label: "...", value: 25, color: "#eaeaea" },
                ]}
                />

                {/* RACE LIST (ONLY IF THERE ARE NO SELECTED NODES) */}
                <div className="title">races list</div>
                <ul>
                <li>1. Roma</li>
                <li>2. Monaco</li>
                <li>3. Silverstone</li>
                <li>4. Spa</li>
                <li>5. Monza</li>
                <li>6. Mugello</li>
                <li>7. Barcelona</li>
                </ul>
            </>
        )}

    </div>
    );
};
export default GraphPlayer

