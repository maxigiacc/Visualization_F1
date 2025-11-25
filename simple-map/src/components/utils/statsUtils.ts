// src/components/utils/statsUtils.ts
import { csv } from "d3-fetch";
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

async function loadRawOnce() {
  if (rawLoaded) return;
  
  const [racesRaw, resultsRaw, qualRaw, driversRaw, constructorsRaw] = await Promise.all([
    csv("/races.csv"),
    csv("/results.csv"),
    csv("/qualifying.csv"),
    csv("/drivers.csv"),
    csv("/constructors.csv"),
  ]);
  
  // Parse con le funzioni corrette
  rawData.races = (racesRaw as any[]).map(fromStringRace);
  rawData.results = (resultsRaw as any[]).map(fromStringResult);
  rawData.qualifying = (qualRaw as any[]).map(fromStringQualifying);
  rawData.drivers = (driversRaw as any[]).map(fromStringDriver);
  rawData.constructors = (constructorsRaw as any[]).map(fromStringConstructor);
  
  rawLoaded = true;
  
  console.log("Stats data loaded:", {
    races: rawData.races.length,
    results: rawData.results.length,
    qualifying: rawData.qualifying.length,
    drivers: rawData.drivers.length,
    constructors: rawData.constructors.length
  });
  
  // DEBUG: Controlla i primi 5 risultati
  console.log("First 5 results:", rawData.results.slice(0, 5).map(r => ({
    raceId: r.raceId,
    driverId: r.driverId,
    position: r.position,
    positionType: typeof r.position
  })));
}

function driverName(d: Driver | undefined) {
  if (!d) return "Unknown";
  return `${d.forename} ${d.surname}`;
}

export async function fetchCircuitStats(circuitId: number): Promise<CircuitStats> {
  if (cache.has(circuitId)) return cache.get(circuitId)!;
  
  await loadRawOnce();
  
  const races = rawData.races.filter((r) => r.circuitId === circuitId);
  
  console.log(`Circuit ${circuitId}: found ${races.length} races`);
  
  if (!races.length) {
    const empty: CircuitStats = { lastPodium: [] };
    cache.set(circuitId, empty);
    return empty;
  }
  
  // WINS per driver & team
  const winsCounter: Map<number, number> = new Map();
  const teamWinsCounter: Map<number, number> = new Map();
  
  for (const race of races) {
    // DEBUG: controlla tutti i risultati per questa gara
    const allResults = rawData.results.filter((res) => res.raceId === race.raceId);
    console.log(`Race ${race.raceId} (${race.name}):`, allResults.length, "results");
    
    // Trova il vincitore - prova diverse condizioni
    const res = rawData.results.find((res) => {
      if (res.raceId !== race.raceId) return false;
      
      // Prova tutte le possibili rappresentazioni di "prima posizione"
      return res.position === 1 || 
             res.position === "1" || 
             res.positionText === "1" ||
             res.positionOrder === 1;
    });
    
    if (res) {
      console.log(`Winner found for race ${race.raceId}:`, {
        driverId: res.driverId,
        constructorId: res.constructorId,
        position: res.position,
        positionType: typeof res.position
      });
      
      winsCounter.set(res.driverId, (winsCounter.get(res.driverId) || 0) + 1);
      teamWinsCounter.set(res.constructorId, (teamWinsCounter.get(res.constructorId) || 0) + 1);
    } else {
      console.log(`No winner found for race ${race.raceId}`);
      // DEBUG: mostra le prime 3 posizioni
      const top3 = allResults
        .sort((a, b) => {
          const posA = typeof a.position === 'number' ? a.position : parseInt(String(a.position));
          const posB = typeof b.position === 'number' ? b.position : parseInt(String(b.position));
          return posA - posB;
        })
        .slice(0, 3);
      console.log("Top 3:", top3.map(r => ({
        position: r.position,
        positionText: r.positionText,
        positionOrder: r.positionOrder,
        driverId: r.driverId
      })));
    }
  }
  
  console.log("Wins counter:", Array.from(winsCounter.entries()));
  console.log("Team wins counter:", Array.from(teamWinsCounter.entries()));
  
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
  
  // POLES: from qualifying (position === 1)
  const polesCounter: Map<number, number> = new Map();
  for (const race of races) {
    const q = rawData.qualifying.find((q) => q.raceId === race.raceId && q.position === 1);
    if (q) polesCounter.set(q.driverId, (polesCounter.get(q.driverId) || 0) + 1);
  }
  
  const polesEntry = Array.from(polesCounter.entries()).sort((a, b) => b[1] - a[1])[0];
  const mostPolesDriver = polesEntry
    ? { driver: driverName(driversLookup.get(polesEntry[0])), poles: polesEntry[1] }
    : null;
  
  // Last podium
  const sortedRaces = races.slice().sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.round - a.round;
  });
  
  let lastPodium: PodiumEntry[] = [];
  for (const race of sortedRaces) {
    const podiumResults = rawData.results
      .filter((res) => res.raceId === race.raceId)
      .filter((res) => {
        const pos = typeof res.position === 'number' ? res.position : parseInt(String(res.position));
        return !isNaN(pos) && pos >= 1 && pos <= 3;
      })
      .sort((a, b) => {
        const posA = typeof a.position === 'number' ? a.position : parseInt(String(a.position));
        const posB = typeof b.position === 'number' ? b.position : parseInt(String(b.position));
        return posA - posB;
      });
    
    if (podiumResults.length >= 1) {
      lastPodium = podiumResults.slice(0, 3).map((pr) => ({
        position: typeof pr.position === 'number' ? pr.position : parseInt(String(pr.position)),
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