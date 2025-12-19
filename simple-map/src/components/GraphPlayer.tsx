import React, { useEffect, useMemo, useState } from "react";
import Graph from "./models/Graph";
import type { DistanceTuple } from "./models/Graph";
import type { RaceWithCircuit } from "./models/RaceWithCircuit";
import { getRacesWithCircuitsByYear } from "./utils/dataLoader";
import "../css/GraphPlayer.css";
import { ContinentPie } from "./ContinentPie";
import { Flow } from "./Flow";
import { useSettings } from "../SettingsContext";

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

const GraphPlayer: React.FC = () => {
    
    const [graph, setGraph] = useState<Graph | null>(null);
    const { year , selected_race } = useSettings();


    // Executed only when the component is mounted (loading of the circuits data)
    useEffect(() => {
        getRacesWithCircuitsByYear(year).then((data : RaceWithCircuit[]) => {
            // Filter only the selected races
            if(selected_race && selected_race.length > 0){
                console.log("Filtering races by selected");
                data = data.filter(race => selected_race.includes(race.circuit.name));
                console.log(data);
            }
            setGraph(new Graph(data));
        });
    }, [year , selected_race]); 


    return (
    <div className="graph-player">
        
        <div className="selected-route">
            selected - route : <strong>ALL RACES</strong>
        </div>

        {graph?.getOriginalPath() && (<Flow flowList={graph.getOriginalPath()} />)}
        {graph?.getOptimizedPath() && (<Flow flowList={graph.getOptimizedPath()} />)}
        {selected_race && <div>Selected Races: {selected_race.join(", ")}</div>}

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

