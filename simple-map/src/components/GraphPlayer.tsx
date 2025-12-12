import React, { useEffect, useState } from "react";
import Graph from "./models/Graph";
import type { DistanceTuple } from "./models/Graph";
import type { RaceWithCircuit } from "./models/RaceWithCircuit";
import type { Coordinates } from "@vnedyalk0v/react19-simple-maps";

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
    // ONLY FOR TESTING PURPOSES, REPLACE WITH REAL COORDINATES LATER
    const fakeCoordinates = [0, 0] as unknown as Coordinates;
    // Definition of the graph
    const [circuits, setCircuits] = useState<RaceWithCircuit[]>([
        { raceId: 1, year: 2024, round: 1, circuitId: 1, name: "Bahrain Grand Prix", date: "2024-03-02", time: "15:00:00", url: "https://en.wikipedia.org/wiki/2024_Bahrain_Grand_Prix", circuit: { alt: 0, circuitId: 1, circuitRef: "bahrain", name: "Bahrain International Circuit", location: "Sakhir", country: "Bahrain", lat: 26.0325, lng: 50.5106, url: "https://en.wikipedia.org/wiki/Bahrain_International_Circuit", clusterId: "ME" }, coordinates: fakeCoordinates, label: "Round 1 – Bahrain" }, 
        { raceId: 2, year: 2024, round: 2, circuitId: 2, name: "Saudi Arabian Grand Prix", date: "2024-03-09", time: "18:00:00", url: "https://en.wikipedia.org/wiki/2024_Saudi_Arabian_Grand_Prix", circuit: { alt: 0, circuitId: 2, circuitRef: "jeddah", name: "Jeddah Corniche Circuit", location: "Jeddah", country: "Saudi Arabia", lat: 21.6319, lng: 39.1044, url: "https://en.wikipedia.org/wiki/Jeddah_Corniche_Circuit", clusterId: "ME" }, coordinates: fakeCoordinates, label: "Round 2 – Saudi Arabia" }, 
        { raceId: 3, year: 2024, round: 3, circuitId: 3, name: "Australian Grand Prix", date: "2024-03-24", time: "05:00:00", url: "https://en.wikipedia.org/wiki/2024_Australian_Grand_Prix", circuit: { alt: 0, circuitId: 3, circuitRef: "albert_park", name: "Albert Park Circuit", location: "Melbourne", country: "Australia", lat: -37.8497, lng: 144.968, url: "https://en.wikipedia.org/wiki/Albert_Park_Circuit", clusterId: "OC" }, coordinates: fakeCoordinates, label: "Round 3 – Australia" }, 
        { raceId: 4, year: 2024, round: 4, circuitId: 4, name: "Japanese Grand Prix", date: "2024-04-07", time: "07:00:00", url: "https://en.wikipedia.org/wiki/2024_Japanese_Grand_Prix", circuit: { alt: 0, circuitId: 4, circuitRef: "suzuka", name: "Suzuka Circuit", location: "Suzuka", country: "Japan", lat: 34.8431, lng: 136.5419, url: "https://en.wikipedia.org/wiki/Suzuka_Circuit", clusterId: "AS" }, coordinates: fakeCoordinates, label: "Round 4 – Japan" }
    ]);

    const [graph, setGraph] = useState<Graph | null>(null);

    useEffect(() => {
        const newGraph = new Graph(circuits);
        setGraph(newGraph);
        newGraph.generateOptimizedPath();
    }, [circuits]); 


    return (
        <div className="graph-player">
            <h2>Graph Player</h2>
            <p>Graph playback UI will go here.</p>
            {graph && renderGraphPath(graph)}
        </div>
    );
};
export default GraphPlayer

