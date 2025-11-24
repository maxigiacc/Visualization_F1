import type { Race } from "./Race";
import type { Circuit } from "./Circuit";
import { type Coordinates} from "@vnedyalk0v/react19-simple-maps";

export type RaceWithCircuit = Race & {
  circuit: Circuit;
  coordinates: Coordinates;
  label: string;
};