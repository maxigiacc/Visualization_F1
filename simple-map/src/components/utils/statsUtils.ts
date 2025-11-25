// src/components/utils/statsUtils.ts
import { csvParse, dsvFormat } from "d3-dsv";
import type { Race } from "../models/Race";
import { fromStringRace } from "../models/Race";
import type { Result } from "../models/Result";
import { fromStringResult } from "../models/Result";
import type { Qualifying } from "../models/Qualyfing";
import { fromStringQualifying } from "../models/Qualyfing";
import type { Constructor } from "../models/Constructor";
import { fromStringConstructor } from "../models/Constructor";
import type { Driver } from "../models/Driver";
import { fromStringDriver } from "../models/Driver";

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

async function fetchAndAutoParseCsv(path: string) {
  const txt = await (await fetch(path)).text();
  // detect delimiter: prefer comma, but if tabs or semicolon present use them
  const sample = txt.slice(0, 2000);
  let delimiter = ",";
  const commaCount = (sample.match(/,/g) || []).length;
  const tabCount = (sample.match(/\t/g) || []).length;
  const semiCount = (sample.match(/;/g) || []).length;
  if (tabCount > commaCount && tabCount >= semiCount) delimiter = "\t";
  else if (semiCount > commaCount && semiCount >= tabCount) delimiter = ";";

  if (delimiter === ",") {
    // try csvParse (handles quoting)
    try {
      return csvParse(txt);
    } catch (e) {
      // fallback to manual dsv
      return dsvFormat(delimiter).parse(txt);
    }
  } else {
    return dsvFormat(delimiter).parse(txt);
  }
}

function driverName(d: Driver | undefined) {
  if (!d) return "Unknown";
  return `${d.forename} ${d.surname}`;
}

async function loadRawOnce() {
  if (rawLoaded) return;

  const [racesParsed, resultsParsed, qualParsed, driversParsed, constructorsParsed] = await Promise.all([
    fetchAndAutoParseCsv("/races.csv"),
    fetchAndAutoParseCsv("/results.csv"),
    fetchAndAutoParseCsv("/qualifying.csv"),
    fetchAndAutoParseCsv("/drivers.csv"),
    fetchAndAutoParseCsv("/constructors.csv"),
  ]);

  // map parsed rows using your fromString* converters (they will coerce types)
  rawData.races = (racesParsed as any[]).map(fromStringRace);
  rawData.results = (resultsParsed as any[]).map(fromStringResult);
  rawData.qualifying = (qualParsed as any[]).map(fromStringQualifying);
  rawData.drivers = (driversParsed as any[]).map(fromStringDriver);
  rawData.constructors = (constructorsParsed as any[]).map(fromStringConstructor);

  rawLoaded = true;

  console.log("Stats data loaded:", {
    races: rawData.races.length,
    results: rawData.results.length,
    qualifying: rawData.qualifying.length,
    drivers: rawData.drivers.length,
    constructors: rawData.constructors.length,
  });

  // debug first rows for quick inspection
  console.log("Sample results rows:", rawData.results.slice(0, 10).map(r => ({
    raceId: r.raceId, driverId: r.driverId, constructorId: r.constructorId, position: r.position, positionText: r.positionText, positionOrder: (r as any).positionOrder
  })));
}

export async function fetchCircuitStats(circuitId: number): Promise<CircuitStats> {
  if (cache.has(circuitId)) return cache.get(circuitId)!;

  await loadRawOnce();

  const races = rawData.races.filter((r) => Number(r.circuitId) === Number(circuitId));
  console.log(`Circuit ${circuitId}: found ${races.length} races`);

  if (!races.length) {
    const empty: CircuitStats = { lastPodium: [] };
    cache.set(circuitId, empty);
    return empty;
  }

  const winsCounter: Map<number, number> = new Map();
  const teamWinsCounter: Map<number, number> = new Map();

  for (const race of races) {
    const allResults = rawData.results.filter((res) => Number(res.raceId) === Number(race.raceId));
    // debug
    // console.log(`Race ${race.raceId} (${race.name}): ${allResults.length} results`);

    // Find winner robustly:
    let winner = allResults.find((res) => {
      // prefer explicit numeric positionOrder
      if ((res as any).positionOrder !== undefined && Number((res as any).positionOrder) === 1) return true;
      // fallback: numeric position or textual '1'
      const pos = typeof res.position === "number" ? res.position : parseInt(String(res.position || res.positionText || ""), 10);
      if (!isNaN(pos) && pos === 1) return true;
      // some datasets use "positionText" === "1"
      if (res.positionText === "1") return true;
      return false;
    });

    if (!winner) {
      // try to heuristically pick the first result with status 'Finished' and lowest position
      const candidates = allResults
        .map(r => ({ r, pos: typeof r.position === 'number' ? r.position : parseInt(String(r.position || r.positionText || ""), 10) }))
        .filter(x => !isNaN(x.pos))
        .sort((a,b) => a.pos - b.pos);
      if (candidates.length) winner = candidates[0].r;
    }

    if (winner) {
      winsCounter.set(Number(winner.driverId), (winsCounter.get(Number(winner.driverId)) || 0) + 1);
      teamWinsCounter.set(Number(winner.constructorId), (teamWinsCounter.get(Number(winner.constructorId)) || 0) + 1);
    }
  }

  const mostWinsDriverEntry = Array.from(winsCounter.entries()).sort((a, b) => b[1] - a[1])[0];
  const mostWinsTeamEntry = Array.from(teamWinsCounter.entries()).sort((a, b) => b[1] - a[1])[0];

  const driversLookup = new Map(rawData.drivers.map((d) => [d.driverId, d]));
  const constructorsLookup = new Map(rawData.constructors.map((c) => [c.constructorId, c]));

  const mostWinsDriver = mostWinsDriverEntry
    ? { driver: driverName(driversLookup.get(mostWinsDriverEntry[0])), wins: mostWinsDriverEntry[1] }
    : null;
  const mostWinsTeam = mostWinsTeamEntry
    ? { team: constructorsLookup.get(mostWinsTeamEntry[0])?.name ?? "Unknown", wins: mostWinsTeamEntry[1] }
    : null;

  // POLES
  const polesCounter: Map<number, number> = new Map();
  for (const race of races) {
    const q = rawData.qualifying.find((q) => Number(q.raceId) === Number(race.raceId) && (Number(q.position) === 1 || q.position === "1"));
    if (q) polesCounter.set(Number(q.driverId), (polesCounter.get(Number(q.driverId)) || 0) + 1);
  }
  const polesEntry = Array.from(polesCounter.entries()).sort((a, b) => b[1] - a[1])[0];
  const mostPolesDriver = polesEntry ? { driver: driverName(driversLookup.get(polesEntry[0])), poles: polesEntry[1] } : null;

  // Last podium
  const sortedRaces = races.slice().sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.round - a.round;
  });

  let lastPodium: PodiumEntry[] = [];
  for (const race of sortedRaces) {
    const podiumResults = rawData.results
      .filter((res) => Number(res.raceId) === Number(race.raceId))
      .map(res => ({ res, pos: typeof res.position === 'number' ? res.position : parseInt(String(res.position || res.positionText || ""), 10) }))
      .filter(x => !isNaN(x.pos) && x.pos >= 1 && x.pos <= 3)
      .sort((a, b) => a.pos - b.pos)
      .map(x => x.res);
    if (podiumResults.length >= 1) {
      lastPodium = podiumResults.slice(0, 3).map((pr) => ({
        position: typeof pr.position === 'number' ? pr.position : parseInt(String(pr.position || pr.positionText || ""), 10),
        driver: driverName(driversLookup.get(pr.driverId)),
        team: constructorsLookup.get(pr.constructorId)?.name ?? "Unknown",
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

  console.log("Final stats for circuit", circuitId, result);

  cache.set(circuitId, result);
  return result;
}
