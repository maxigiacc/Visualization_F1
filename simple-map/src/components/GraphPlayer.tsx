import React, { useEffect, useState } from "react";
import Graph from "./models/Graph";
import type { DistanceTuple } from "./models/Graph";
import type { RaceWithCircuit } from "./models/RaceWithCircuit";
import type { Coordinates } from "@vnedyalk0v/react19-simple-maps";
import { getRacesWithCircuitsByYear } from "./utils/dataLoader";
import "../css/GraphPlayer.css";
import { ContinentPie } from "./ContinentPie";
import { Flow } from "./Flow";

// Could be transformed into its own component later
const renderGraphPath = (graph: Graph) => {
    const path : Map<string, Map<string, DistanceTuple>> = graph.getPath();
    const { path: optimizedPath , distance} = graph.generateOptimizedPath();

    // Testing the optimization
    console.log("Optimized path distance: ", distance);
    console.log("Optimized path: ", optimizedPath);
    return (
        <div>
            <ul>
            {[...path].map(([node, edges]) => (
                <li key={String(node)}>
                    <strong>{node}</strong>
                    <ul>
                        {[...edges].map(([to, distance]) => (
                        <li key={String(to)}>
                            {to} ({distance[0]})
                        </li>
                        ))}
                    </ul>
                </li>
            ))}
            </ul>
            
        </div>
    );
};


// THINGS TO DO IN THE FUTURE:
// 1. Instead of initialize by hand const [circuits, setCircuits] use the data_loader or utilize the variable selectedYearRaces (InteractiveMap.tsx)
// 2. Instead of using into the class Graph.ts the fakeApi method using the original one
// 3. Create 3 right menu using the information into the Graph (inizialize with the selected_nodes + compute the generateOptimizedPath() + show the results)

const GraphPlayer: React.FC = () => {
    
    const [graph, setGraph] = useState<Graph | null>(null);
    const [races , setRaces] = useState<RaceWithCircuit[] | null>(null);

    // Executed only when the component is mounted (loading of the circuits data)
    useEffect(() => {
        getRacesWithCircuitsByYear(2021).then((data : RaceWithCircuit[]) => {
            setRaces(data);
            setGraph(new Graph(data));
        });
    }, []); 
    
    return (
    <div className="graph-player">
        
        

        <div className="selected-route">
            selected - route : <strong>ALL RACES</strong>
        </div>

        {graph?.getOriginalPath() && (<Flow flowList={graph.getOriginalPath()} />)}

        {/* CAR */}
        <div className="route-row">
            <div className="route-info">
                <p>• TOT_KM : {graph ? graph.getOriginalPathDistance().carDistance : "Loading..."} {graph ? "Km" : ""}</p>
                <p>• CO2_EMISSION : 35.000 kg</p>
            </div>
            <div className="route-icon">🚗</div>
        </div>

        {/* PLANE */}
        <div className="route-row">
            <div className="route-info">
                <p>• TOT_KM : {graph ? graph.getOriginalPathDistance().flightDistance : "Loading..."} {graph ? "Km" : ""}</p>
                <p>• CO2_EMISSION : 35.000 kg</p>
            </div>
            <div className="route-icon">✈️</div>
        </div>

        {/* CONTINENT PIE CHART */}
        <ContinentPie
            title="continent distribution"
            slices={[
                { label: "EU", value: 50, color: "#7b83eb" },
                { label: "AFR", value: 25, color: "#f2b176" },
                { label: "...", value: 25, color: "#eaeaea" },
            ]}
        />

        {/* RACE LIST (ONLY IF THERE ARE NOT SELECTED NODE) */}
        <div className="continent-title">races list</div>
        <ul>
            <li>1. Roma</li>
            <li>2. Monaco</li>
            <li>3. Silverstone</li>
            <li>4. Spa</li>
            <li>5. Monza</li>
            <li>6. Mugello</li>
            <li>7. Barcelona</li>
        </ul>

    </div>
    );
};
export default GraphPlayer

