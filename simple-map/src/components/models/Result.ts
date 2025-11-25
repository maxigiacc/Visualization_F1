export interface Result {
  resultId: number;
  raceId: number;
  driverId: number;
  constructorId: number;
  number: number;
  grid: number;
  position: string | number;
  positionText: string;
  positionOrder: number;
  points: number;
}

export function fromStringResult(obj: { [k: string]: string }): Result {
  return {
    resultId: parseInt(obj.resultId || "0", 10),
    raceId: parseInt(obj.raceId || "0", 10),
    driverId: parseInt(obj.driverId || "0", 10),
    constructorId: parseInt(obj.constructorId || "0", 10),
    number: parseInt(obj.number),
    grid: parseInt(obj.grid || "0", 10),
    position: obj.position === "\\N" ? "" : obj.position,
    positionText: obj.positionText || "",
    positionOrder: parseInt(obj.positionOrder || "0", 10),
    points: parseFloat(obj.points || "0")
  };
}