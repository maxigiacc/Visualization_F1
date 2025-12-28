export type DistanceTuple = [number, number];   // (car, flight) distances
import fetchFlightDistance from "../utils/AirportDistanceFake";
import type { RaceWithCircuit } from "./RaceWithCircuit";

export type FlowList = {
    id: number;
    circuit_name: string;
    clusted_id: number;
};

export default class Graph {
    // ============ Attribute ====================== 
    private optimized_path: Map<string, Map<string, DistanceTuple>> = new Map(); // ORDERED-GRAPH ->  [ 'node1': ['node2': (30,50) , 'node3':(32,...] , 'node2': [] , ... ]
    private path: Map<string, Map<string, DistanceTuple>> = new Map();     // FULLY-CONNECTED-GRAPH ->[ 'node1': ['node2': (30,50) , 'node3':(32,...] , 'node2': [] , ... ]

    // ============ Constructor ======================  
    // Initialize graph from circuits (the graph contains all the possible connections between circuits and the distance filled is the car distance or flight distance based on clusterId)
    constructor(circuits: RaceWithCircuit[]) {

        this.optimized_path = new Map();
        // Initialize graph with circuits
        for (let i = 0; i < circuits.length; i++) {
            for (let j = i + 1; j < circuits.length; j++) {
                const circuitA = circuits[i].circuit;
                const circuitB = circuits[j].circuit;
                let carDistance: number;
                let planeDistance: number;
                // Use the car distance only if they are in the same cluster
                if(circuitA.clusterId === circuitB.clusterId) {
                    carDistance = fetchFlightDistance(circuitA.location, circuitB.location);   // TODO replace with real API call
                    planeDistance = 0;
                }else{
                    carDistance = 0;  
                    planeDistance = fetchFlightDistance(circuitA.location, circuitB.location); // TODO replace with real API call
                }        
                this.addEdge(circuitA.location , circuitB.location , [carDistance, planeDistance]);
            }
        }
    }

    // ============ Methods ======================
    addNode(node: string) {
        if (!this.path.has(node)) {
            this.path.set(node, new Map());
        }
    }

    addEdge(from: string, to: string, distance: DistanceTuple) {
        this.addNode(from);
        this.addNode(to);
        // Add edge in both directions for undirected graph
        this.path.get(from)!.set(to, distance);
        this.path.get(to)!.set(from, distance);
    }

    getPath(): Map<string, Map<string, DistanceTuple>> {
        return this.path;
    }

    getDistance(a: string, b: string): DistanceTuple | undefined {
        return this.path.get(a)?.get(b);
    }

    getNumberOfNodes(): number {
        return this.path.size;
    }

    // Return total distances of original path for car and flight
    getOriginalPathDistance(): {carDistance: number , flightDistance: number} {
        const nodes = Array.from(this.path.keys());
        let totalCarDistance = 0;
        let totalFlightDistance = 0;

        for (let i = 0; i < nodes.length - 1; i++) {
            const dist = this.getDistance(nodes[i], nodes[i + 1]);
            if (dist === undefined) {
                throw new Error(`No edge between ${nodes[i]} and ${nodes[i + 1]}`);
            }
            totalCarDistance += dist[0];
            totalFlightDistance += dist[1];
        }

        return {carDistance: totalCarDistance, flightDistance: totalFlightDistance};
    }

    // Return total distances of optimized path for car and flight
    getOptimizedPathDistance(): {carDistance: number , flightDistance: number} {
        const nodes = Array.from(this.optimized_path.keys());
        // console.log("Optimized path nodes: ", nodes);
        let totalCarDistance = 0;
        let totalFlightDistance = 0;

        for (let i = 0; i < nodes.length - 1; i++) {
            const dist = this.optimized_path.get(nodes[i])?.get(nodes[i + 1]);
            if (dist === undefined) {
                throw new Error(`No edge between ${nodes[i]} and ${nodes[i + 1]}`);
            }
            // console.log("Distance between ", nodes[i], " and ", nodes[i + 1], " is ", dist);
            totalCarDistance += dist[0];
            totalFlightDistance += dist[1];
        }

        return {carDistance: totalCarDistance, flightDistance: totalFlightDistance};
    }

    // Return the optimized path as a string
    getOptimizedPathString(): string {
        const result = this.generateOptimizedPath();

        if (result.path.length === 0) return "";

        return result.path.join(" --> ");
    }

    // Return the original path as a string
    getOriginalPathString(): string {
        const nodes = Array.from(this.path.keys());
        return nodes.join(" --> ");
    }

    // Return the optimized path as FlowList[]
    getOptimizedPath(): FlowList[] {
        const optimized_path = this.generateOptimizedPath();
        const originalPath = Array.from(this.path.keys());

        if (optimized_path.path.length === 0) return [];

        const flowList: FlowList[] = optimized_path.path.map((node) => {
            const circuitName = node.slice(0, -1); // Remove the last character (round number)
            const clusterId = parseInt(node.slice(-1)); // Get the last character as round number
            return {
                id: originalPath.indexOf(node) + 1,
                circuit_name: circuitName,
                clusted_id: clusterId
            };
        });

        // Reversed the list if the first element is at the end
        if(flowList[flowList.length - 1].id == 1) {
            flowList.reverse();
        }
        
        return flowList;
    }

    // Return the original path as FlowList[]
    getOriginalPath(): FlowList[] {
        const nodes = Array.from(this.path.keys());

        const flowList: FlowList[] = nodes.map((node, index) => {
            const circuitName = node.slice(0, -1); // Remove the last character (round number)
            const clusterId = parseInt(node.slice(-1)); // Get the last character as round number
            return {
                id: index + 1,
                circuit_name: circuitName,
                clusted_id: clusterId
            };
        });

        return flowList;
    }

    // Generate optimized path using Nearest Neighbor heuristic
    generateOptimizedPath(): { path: string[]; distance: number;} {
        
        // Hande empty graph case
        if(this.path.size === 0) {
            return { path: [], distance: 0 };
        }
        
        const nodes = Array.from(this.path.keys());

        if (nodes.length === 0) {
            throw new Error("Graph is empty");
        }

        let bestPath: string[] = [];
        let bestDistance = Infinity;

        for (const startNode of nodes) {
            const visited = new Set<string>();
            const currentPath: string[] = [startNode];
            visited.add(startNode);

            let currentNode = startNode;
            let totalDistance = 0;

            while (visited.size < nodes.length) {
                let nearestNode: string | null = null;
                let nearestDistance = Infinity;

                const neighbors = this.path.get(currentNode)!;

                for (const [neighbor, dist] of neighbors) {
                    if (!visited.has(neighbor)) {
                        const distance = dist[0] + dist[1]; // Sum car and flight distances
                        if (distance < nearestDistance) {
                            nearestDistance = distance;
                            nearestNode = neighbor;
                        }
                    }
                }

                if (nearestNode === null) {
                    break;
                }

                visited.add(nearestNode);
                currentPath.push(nearestNode);
                totalDistance += nearestDistance;
                currentNode = nearestNode;
            }

            if (currentPath.length === nodes.length && totalDistance < bestDistance) {
                bestDistance = totalDistance;
                bestPath = currentPath;
            }
        }

        // Build optimized_path map
        this.optimized_path.clear();

        for (let i = 0; i < bestPath.length - 1; i++) {
            const from = bestPath[i];
            const to = bestPath[i + 1];
            const dist = this.getDistance(from, to)!;
            
            // Create the node of from if not exists
            if (!this.optimized_path.has(from)) {
                this.optimized_path.set(from, new Map());
            }

            // Create the node of to if not exists
            if(!this.optimized_path.has(to)) {
                this.optimized_path.set(to, new Map());
            }

            // Create the edge from -> to
            this.optimized_path.get(from)!.set(to, dist);
        }

        return {
            path: bestPath,
            distance: bestDistance
        };
    }

}
