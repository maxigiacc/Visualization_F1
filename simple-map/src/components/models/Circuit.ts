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
    clusterId: obj.clusterId || "",
  } as Circuit;
}

