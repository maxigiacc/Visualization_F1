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
}

/**
 * When Circuits are imported from the CSV file, all fields are of type string;
 * This method converts number into their number representation (int or float);
 * so that the object is actually usable
 */
export function fromStringCircuit(obj: { [k: string]: string }): Circuit {
    return {
        ...obj,
        alt: parseInt(obj.alt),
        circuitId: parseInt(obj.circuitId),
        lat: parseFloat(obj.lat),
        lng: parseFloat(obj.lng),
    };
}
