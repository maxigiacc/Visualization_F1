export type DistanceTuple = [number, number]; // (car, flight) distances
import fetchFlightDistance from "../utils/AirportDistanceFake_API";
import type { RaceWithCircuit } from "./RaceWithCircuit";
import { fetchAndAutoParseCsv, getRacesWithCircuitsByYear } from "../utils/dataLoader";

export type FlowList = {
    id: number;
    circuit_name: string;
    clusted_id: number;
};

export default class Graph {
    // ============ Attributes ======================
    private optimized_path: Map<string, Map<string, DistanceTuple>> = new Map(); // ORDERED optimized path (of selected_path)
    private selected_path: Map<string, Map<string, DistanceTuple>> = new Map();  // FULLY-CONNECTED graph of selected circuits
    private path: Map<string, Map<string, DistanceTuple>> = new Map();           // FULLY-CONNECTED graph of ALL circuits
    private bestPath: string[] = [];
    private bestDistance: number = Infinity;
    private year : number = 2021;

    // ============ Constructor ======================    
    constructor(other?: Graph , year?: number) {
        if(year === undefined && other === undefined) {
            throw new Error("Year not provided without Graph to copy from.");
        }

        if (!other) {
            this.optimized_path = new Map();
            this.selected_path = new Map();
            this.path = new Map();
            this.bestPath = [];
            this.year = year || 2021;
            this.bestDistance = Infinity;
            return;
        }

        this.path = Graph.cloneGraphMap(other.path);
        this.selected_path = Graph.cloneGraphMap(other.selected_path);
        this.optimized_path = Graph.cloneGraphMap(other.optimized_path);

        this.bestPath = [...other.bestPath];
        this.bestDistance = other.bestDistance;
    }

    private static cloneGraphMap(
        source: Map<string, Map<string, DistanceTuple>>
    ): Map<string, Map<string, DistanceTuple>> {
        const result = new Map<string, Map<string, DistanceTuple>>();

        for (const [from, neighbors] of source.entries()) {
            const inner = new Map<string, DistanceTuple>();
            for (const [to, dist] of neighbors.entries()) {
                inner.set(to, [dist[0], dist[1]]);
            }
            result.set(from, inner);
        }

        return result;
    }

    // ============ Core graph helpers ======================
    private addNodeTo(target: Map<string, Map<string, DistanceTuple>>, node: string) {
        if (!target.has(node)) {
            target.set(node, new Map());
        }
    }

    private addEdgeTo( target: Map<string, Map<string, DistanceTuple>>, from: string, to: string, distance: DistanceTuple) {
        this.addNodeTo(target, from);
        this.addNodeTo(target, to);

        // undirected
        target.get(from)!.set(to, distance);
        target.get(to)!.set(from, distance);
    }

    private getDistanceFrom(
        source: Map<string, Map<string, DistanceTuple>>,
        a: string,
        b: string
    ): DistanceTuple | undefined {
        return source.get(a)?.get(b);
    }

    // Build a fully-connected graph for the given circuits into `target`
    private async buildFullyConnectedGraphFromAPI( target: Map<string, Map<string, DistanceTuple>>, circuits: RaceWithCircuit[]): Promise<void> {
        target.clear();

        for (let i = 0; i < circuits.length; i++) {
            for (let j = i + 1; j < circuits.length; j++) {
                const circuitA = circuits[i].circuit;
                const circuitB = circuits[j].circuit;

                // Make it awaitable (so swapping to a real async API later is painless)
                const d = await Promise.resolve(
                    fetchFlightDistance(circuitA.location, circuitB.location)
                );

                let carDistance = 0;
                let planeDistance = 0;

                // Use car only if same cluster; otherwise flight only
                if (circuitA.clusterId === circuitB.clusterId) {
                    carDistance = d;
                    planeDistance = 0;
                } else {
                    carDistance = 0;
                    planeDistance = d;
                }

                this.addEdgeTo(
                    target,
                    circuitA.location,
                    circuitB.location,
                    [carDistance, planeDistance]
                );
            }
        }
    }

    // Build a fully-connected graph for the given circuits into `target` USING API
    private async buildFullyConnectedGraphFromCSV( target: Map<string, Map<string, DistanceTuple>>, circuits: RaceWithCircuit[]): Promise<void> {
        target.clear();

        // 1) Get all RaceWithCircuit for the selected year
        const racesWithCircuit = await getRacesWithCircuitsByYear(this.year);

        // 2) Build circuitId -> location map (graph nodes are locations)
        const idToLocation = new Map<number, string>();
        for (const r of racesWithCircuit) {
            idToLocation.set(r.circuit.circuitId, r.circuit.location);
        }

        // CircuitIds involved in THIS graph
        const wantedIds = new Set<number>(
            circuits.map(r => r.circuit.circuitId)
        );

        // Ensure nodes exist even if only one circuit is selected
        for (const id of wantedIds) {
            const location = idToLocation.get(id);
            if (!location) {
                throw new Error(
                    `CircuitId ${id} not found for year ${this.year}.`
                );
            }
            this.addNodeTo(target, location);
        }

        // 3) Load distances from CSV
        const rows = await fetchAndAutoParseCsv("/distances.csv");

        for (const row of rows as any[]) {
            const rowYear = Number(row.Year ?? row.year);
            if (!Number.isFinite(rowYear) || rowYear !== this.year) {
                continue;
            }

            const fromId = Number(row.circuitIdFrom ?? row.circuitidfrom);
            const toId = Number(row.circuitIdTo ?? row.circuitidto);

            if (!wantedIds.has(fromId) || !wantedIds.has(toId)) {
                continue;
            }

            const fromLocation = idToLocation.get(fromId);
            const toLocation = idToLocation.get(toId);
            if (!fromLocation || !toLocation) {
                continue;
            }

            const car = Number(row.Car ?? row.car);
            const plane = Number(row.Plane ?? row.plane);

            this.addEdgeTo(
                target,
                fromLocation,
                toLocation,
                [
                    Number.isFinite(car) ? car : 0,
                    Number.isFinite(plane) ? plane : 0
                ]
            );
        }

        // 4) Sanity check: graph must be fully connected for selected circuits
        const locations = Array.from(wantedIds)
            .map(id => idToLocation.get(id)!);

        for (let i = 0; i < locations.length; i++) {
            for (let j = i + 1; j < locations.length; j++) {
                if (!this.getDistanceFrom(target, locations[i], locations[j])) {
                    throw new Error(
                        `Missing CSV distance for year ${this.year} between ` +
                        `${locations[i]} and ${locations[j]}.`
                    );
                }
            }
        }
    }


    public isEmpty(): boolean {
        return this.path.size === 0;
    }
    // ============ Public init methods ======================
    // Fill the FULL graph (path) from all circuits
    async initPath(circuits: RaceWithCircuit[]): Promise<void> {
        await this.buildFullyConnectedGraphFromCSV(this.path, circuits);
    }

    // Fill the SELECTED graph from a subset of circuits (effective path),
    // and immediately re-optimize it.
    initSelectedPath(selectedCircuits: RaceWithCircuit[]): void {
                
        if (this.path.size === 0) {
            throw new Error("Full path is empty. Call initPath(...) before initSelectedPath(...).");
        }

        if(selectedCircuits.length === 0) {
            this.selected_path.clear();
            this.optimized_path.clear();
            this.bestPath = [];
            this.bestDistance = Infinity;
            return;
        }

        // Make sure we don't duplicate nodes (can happen if input contains duplicates)
        const selectedLocations = Array.from(
            new Set(selectedCircuits.map((r) => r.circuit.location))
        );

        this.selected_path.clear();
        this.optimized_path.clear();
        this.bestPath = [];
        this.bestDistance = Infinity;

        // Ensure nodes exist even if only 1 selected circuit
        for (const loc of selectedLocations) {
            this.addNodeTo(this.selected_path, loc);
        }

        // Build fully-connected selected_path using the distances from the full `path`
        for (let i = 0; i < selectedLocations.length; i++) {
            for (let j = i + 1; j < selectedLocations.length; j++) {
                const from = selectedLocations[i];
                const to = selectedLocations[j];

                const dist = this.getDistanceFrom(this.path, from, to);
                if (!dist) {
                    throw new Error(
                        `No edge between "${from}" and "${to}" in full path. ` +
                        `Make sure initPath(...) used the same location keys.`
                    );
                }

                this.addEdgeTo(this.selected_path, from, to, dist);
            }
        }

        console.log("Selected path initialized with " , Array.from(this.selected_path.keys()) , " nodes.");

        // Re-optimize now that selected_path is ready
        const { path, distance } = this.generateOptimizedPath();
        this.bestPath = path;
        this.bestDistance = distance;
    }

    // ============ Getters ======================
    getPathSize(): number {
        return this.path.size;
    }

    getPath(): Map<string, Map<string, DistanceTuple>> {
        return this.path;
    }

    getSelectedPath(): Map<string, Map<string, DistanceTuple>> {
        return this.selected_path;
    }

    getOptimizedPathMap(): Map<string, Map<string, DistanceTuple>> {
        return this.optimized_path;
    }

    getOptimizedPathNodes(): string[] {
        return this.bestPath;
    }

    // Default distance query uses selected_path (effective)
    getDistance(a: string, b: string): DistanceTuple | undefined {
        return this.getDistanceFrom(this.selected_path, a, b);
    }

    // If you need full graph distance explicitly
    getFullDistance(a: string, b: string): DistanceTuple | undefined {
        return this.getDistanceFrom(this.path, a, b);
    }

    getNumberOfNodes(): number {
        return this.path.size;
    }

    getNumberOfSelectedNodes(): number {
        return this.selected_path.size;
    }

    // ============ Distances ======================
    // Total distance of the selected (effective) path in insertion-order
    getOriginalPathDistance(): { carDistance: number; flightDistance: number } {
        const nodes = Array.from(this.selected_path.keys());
        let totalCarDistance = 0;
        let totalFlightDistance = 0;

        for (let i = 0; i < nodes.length - 1; i++) {
            const dist = this.getDistanceFrom(this.selected_path, nodes[i], nodes[i + 1]);
            if (!dist) {
                throw new Error(`No edge between ${nodes[i]} and ${nodes[i + 1]}`);
            }
            totalCarDistance += dist[0];
            totalFlightDistance += dist[1];
        }

        return { carDistance: totalCarDistance, flightDistance: totalFlightDistance };
    }

    // Total distance of the optimized path
    getOptimizedPathDistance(): { carDistance: number; flightDistance: number } {
        const nodes = Array.from(this.optimized_path.keys());
        let totalCarDistance = 0;
        let totalFlightDistance = 0;

        for (let i = 0; i < nodes.length - 1; i++) {
            const dist = this.optimized_path.get(nodes[i])?.get(nodes[i + 1]);
            if (!dist) {
                throw new Error(`No edge between ${nodes[i]} and ${nodes[i + 1]}`);
            }
            totalCarDistance += dist[0];
            totalFlightDistance += dist[1];
        }

        return { carDistance: totalCarDistance, flightDistance: totalFlightDistance };
    }

    // ============ Strings ======================
    getOptimizedPathString(): string {
        return this.bestPath.join(" --> ");
    }

    // “Original” means selected_path now
    getOriginalPathString(): string {
        const nodes = Array.from(this.selected_path.keys());
        return nodes.join(" --> ");
    }

    // ============ FlowLists ======================
    // Optimized path as FlowList[]
    getOptimizedPath(): FlowList[] {
        const optimized = this.bestPath;
        const originalPath = Array.from(this.selected_path.keys());

        if (optimized.length === 0) {
            return [];
        }

        const flowList: FlowList[] = optimized.map((node) => {
            const circuitName = node.slice(0, -1);
            const clusterId = parseInt(node.slice(-1), 10);

            return {
                id: originalPath.indexOf(node) + 1,
                circuit_name: circuitName,
                clusted_id: clusterId
            };
        });

        // Reverse the list if the first element is at the end
        if (flowList.length > 0 && flowList[flowList.length - 1].id === 1) {
            flowList.reverse();
        }

        return flowList;
    }

    // Selected/original path as FlowList[]
    getOriginalPath(): FlowList[] {
        const nodes = Array.from(this.selected_path.keys());
        
        // Check for empty selected path
        if(nodes.length === 0) {
            return [];
        }

        return nodes.map((node, index) => {
            const circuitName = node.slice(0, -1);
            const clusterId = parseInt(node.slice(-1), 10);

            return {
                id: index + 1,
                circuit_name: circuitName,
                clusted_id: clusterId
            };
        });
        
    }

    // ============ Optimization ======================
    // Optimize SELECTED graph using Nearest Neighbor heuristic
    generateOptimizedPath(): { path: string[]; distance: number } {
        // Handle empty selected graph
        if (this.selected_path.size === 0) {
            this.optimized_path.clear();
            return { path: [], distance: 0 };
        }

        const nodes = Array.from(this.selected_path.keys());
        if (nodes.length === 0) {
            throw new Error("Selected graph is empty");
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

                const neighbors = this.selected_path.get(currentNode)!;

                for (const [neighbor, dist] of neighbors) {
                    if (!visited.has(neighbor)) {
                        const distance = dist[0] + dist[1]; // car + flight
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

        // Build optimized_path as an ordered directed chain (like before)
        this.optimized_path.clear();

        for (let i = 0; i < bestPath.length - 1; i++) {
            const from = bestPath[i];
            const to = bestPath[i + 1];
            const dist = this.getDistanceFrom(this.selected_path, from, to);

            if (!dist) {
                throw new Error(`No edge between ${from} and ${to} in selected_path`);
            }

            if (!this.optimized_path.has(from)) {
                this.optimized_path.set(from, new Map());
            }

            if (!this.optimized_path.has(to)) {
                this.optimized_path.set(to, new Map());
            }

            this.optimized_path.get(from)!.set(to, dist);
        }

        console.log("Optimized path generated: ", bestPath, " with distance ", bestDistance);

        return { path: bestPath, distance: bestDistance };
    }
}
