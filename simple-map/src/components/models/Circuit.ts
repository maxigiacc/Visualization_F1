export interface Circuit {
    alt: number;
    circuitId: number;
    circuitRef: string;
    country: string;
    lat: number;
    lng: number;
    location: string;
    name: string;
    url: string; // wikipedia URL
    clusterId: string; // optional, used for clustering
    nearest_airport_iata?: string; // optional, IATA code of nearest airport
    nearest_airport_icao?: string; // optional, ICAO code of nearest airport
}

/**
 * When Circuits are imported from the CSV file, all fields are of type string;
 * This method converts number into their number representation (int or float);
 * so that the object is actually usable
 */
export function fromStringCircuit(obj: { [k: string]: string }): Circuit {
    return {
    circuitId: parseInt(String(obj.circuitId || "0"), 10),
    circuitRef: obj.circuitRef || "",
    name: obj.name || "",
    location: obj.location || "",
    country: obj.country || "",
    lat: parseFloat(obj.lat),
    lng: parseFloat(obj.lng),
    alt: Number.isNaN(parseInt(obj.alt, 10)) ? 0 : parseInt(String(obj.alt || "0"), 10),
    url: obj.url || "",
    clusterId: obj.cluster_id || "",
  } as Circuit;
}

const CLUSTER_COLORS: Record<string, string> = {
    cluster_europe: "#1F4ED8",
    cluster_americas: "#D62828",
    cluster_asia_pacific: "#2A9D8F",
    cluster_middle_east: "#E9C46A",
    cluster_africa: "#264653",
};
const DEFAULT_CLUSTER_COLOR = "#94a3b8";

export const getClusterColor = (clusterId: string) => {
    return CLUSTER_COLORS[clusterId] ?? DEFAULT_CLUSTER_COLOR;
};

