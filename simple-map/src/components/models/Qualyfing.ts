export interface Qualifying {
  qualifyId: number;
  raceId: number;
  driverId: number;
  constructorId: number;
  number: number;
  position: number;
  q1: string;
  q2: string;
  q3: string;
  // q1,q2,q3 strings
}

export function fromStringQualifying(obj: { [k: string]: string }): Qualifying {
  return {
    qualifyId: parseInt(obj.qualifyId || "0", 10),
    raceId: parseInt(obj.raceId || "0", 10),
    driverId: parseInt(obj.driverId || "0", 10),
    constructorId: parseInt(obj.constructorId || "0", 10),
    number: parseInt(obj.number),
    position: parseInt(obj.position || "0", 10),
    q1: obj.q1 || "",
    q2: obj.q2 || "",
    q3: obj.q3 || "",
  };
}