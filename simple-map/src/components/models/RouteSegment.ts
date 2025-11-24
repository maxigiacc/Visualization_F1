import type { RaceWithCircuit } from "./RaceWithCircuit";
import { type Coordinates} from "@vnedyalk0v/react19-simple-maps";

export type RouteSegment = {
  id: string;
  from: RaceWithCircuit;
  to: RaceWithCircuit;
  coordinates: Coordinates[];
  color: string;
  order: number;
  labelCoordinates: Coordinates;
  arrowCoordinates: Coordinates;
};
