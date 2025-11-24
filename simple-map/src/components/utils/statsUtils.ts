// src/utils/statsUtils.ts
import { csv } from "d3-fetch";
import type { Race } from "../models/Race";
import type { Result } from "../models/Result";
import type { Qualifying } from "../models/Qualifying";
import type { Constructor } from "../models/Constructor";
import type { Driver } from "../models/Driver";

export type PodiumEntry = { position: number; driver: string; team: string };
export type CircuitStats = {
  mostWinsDriver?: { driver: string; wins: number } | null;
  mostWinsTeam?: { team: string; wins: number } | null;
  mostPolesDriver?: { driver: string; poles: number } | null;
  lastPodium: PodiumEntry[];
};

let cache: Map<number, CircuitStats> = new Map();
let rawLoaded = false;
let rawData: {
  races: Race[];
  results: Result[];
  qualifying: Qualifying[];
  drivers: Driver[];
  constructors: Constructor[];
} = { races: [], results: [], qualifying: [], drivers: [], constructors: [] };

async function loadRawOnce() {
  if (rawLoaded) return;
  const [racesRaw, resultsRaw, qualRaw, driversRaw, constructorsRaw] = await Promise.all([
    csv("/races.csv"),
    csv("/results.csv"),
    csv("/qualifying.csv"),
    csv("/drivers.csv"),
    csv("/constructors.csv"),
  ]);
  rawData.races = racesRaw as any as Race[];
  rawData.results = resultsRaw as any as Result[];
  rawData.qualifying = qualRaw as any as Qualifying[];
  rawData.drivers = driversRaw as any as Driver[];
  rawData.constructors = constructorsRaw as any as Constructor[];
  rawLoaded = true;
  console.log({rawData});
}

function driverName(d: Driver | undefined) {
  if (!d) return "Unknown";
  return `${d.forename} ${d.surname}`;
}

export async function fetchCircuitStats(circuitId: number): Promise<CircuitStats> {
  if (cache.has(circuitId)) return cache.get(circuitId)!;
  await loadRawOnce();

  const races = rawData.races.filter((r) => Number(r.circuitId) === Number(circuitId));
  if (!races.length) {
    const empty: CircuitStats = { lastPodium: [] };
    cache.set(circuitId, empty);
    return empty;
  }

  // WINS per driver & team
  const winsCounter: Map<number, number> = new Map();
  const teamWinsCounter: Map<number, number> = new Map();

  for (const race of races) {
    // find result with position === "1" or numeric position === 1
    const res = rawData.results.find((res) => Number(res.raceId) === Number(race.raceId) && (String(res.position) === "1" || Number(res.position) === 1));
    if (!res) continue;
    winsCounter.set(Number(res.driverId), (winsCounter.get(Number(res.driverId)) || 0) + 1);
    teamWinsCounter.set(Number(res.constructorId), (teamWinsCounter.get(Number(res.constructorId)) || 0) + 1);
  }

  const mostWinsDriverEntry = Array.from(winsCounter.entries()).sort((a, b) => b[1] - a[1])[0];
  const mostWinsTeamEntry = Array.from(teamWinsCounter.entries()).sort((a, b) => b[1] - a[1])[0];

  const driversLookup = new Map(rawData.drivers.map((d) => [Number(d.driverId), d]));
  const constructorsLookup = new Map(rawData.constructors.map((c) => [Number(c.constructorId), c]));

  const mostWinsDriver = mostWinsDriverEntry ? { driver: driverName(driversLookup.get(Number(mostWinsDriverEntry[0]))), wins: mostWinsDriverEntry[1] } : null;
  const mostWinsTeam = mostWinsTeamEntry ? { team: constructorsLookup.get(Number(mostWinsTeamEntry[0]))?.name ?? "Unknown", wins: mostWinsTeamEntry[1] } : null;

  // POLES: from qualifying (position === 1)
  const polesCounter: Map<number, number> = new Map();
  for (const race of races) {
    const q = rawData.qualifying.find((q) => Number(q.raceId) === Number(race.raceId) && (Number(q.position) === 1));
    if (q) polesCounter.set(Number(q.driverId), (polesCounter.get(Number(q.driverId)) || 0) + 1);
  }
  const polesEntry = Array.from(polesCounter.entries()).sort((a, b) => b[1] - a[1])[0];
  const mostPolesDriver = polesEntry ? { driver: driverName(driversLookup.get(Number(polesEntry[0]))), poles: polesEntry[1] } : null;

  // Last podium: find the races sorted by year/round and take last with podium info
  const sortedRaces = races.slice().sort((a, b) => {
    const ya = Number(a.year), yb = Number(b.year);
    if (ya !== yb) return yb - ya; // descending year
    return Number(b.round) - Number(a.round);
  });
  let lastPodium: PodiumEntry[] = [];
  for (const race of sortedRaces) {
    const podiumResults = rawData.results
      .filter((res) => Number(res.raceId) === Number(race.raceId))
      .filter((res) => {
        const pos = Number(res.position);
        return !isNaN(pos) && pos >= 1 && pos <= 3;
      })
      .sort((a, b) => Number(a.position) - Number(b.position));
    if (podiumResults.length >= 1) {
      lastPodium = podiumResults.slice(0, 3).map((pr) => ({
        position: Number(pr.position),
        driver: driverName(driversLookup.get(Number(pr.driverId))),
        team: constructorsLookup.get(Number(pr.constructorId))?.name ?? "Unknown",
      }));
      break;
    }
  }

  const result: CircuitStats = {
    mostWinsDriver,
    mostWinsTeam,
    mostPolesDriver,
    lastPodium,
  };

  cache.set(circuitId, result);
  return result;
}
