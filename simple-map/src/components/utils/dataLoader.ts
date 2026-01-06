import { csv } from "d3-fetch";
import { csvParse, dsvFormat } from "d3-dsv";
import type { Circuit } from "../models/Circuit";
import { fromStringCircuit } from "../models/Circuit";
import type { RaceWithCircuit } from "../models/RaceWithCircuit";
import type { Race } from "../models/Race";
import { fromStringRace } from "../models/Race";
import type { Qualifying } from "../models/Qualyfing";
import { fromStringQualifying } from "../models/Qualyfing";
import type { Constructor } from "../models/Constructor";
import { fromStringConstructor } from "../models/Constructor";
import type { Driver } from "../models/Driver";
import { fromStringDriver } from "../models/Driver";
import type { Country } from "../models/Country";
import { fromStringCountry} from "../models/Country";
import { haversine } from "./utils";
import { createCoordinates } from "@vnedyalk0v/react19-simple-maps";

// ============================================================================
// TYPES
// ============================================================================

export type DataCache = {
  circuits: Circuit[];
  races: Race[];
  qualifying: Qualifying[];
  drivers: Driver[];
  constructors: Constructor[];
  emissionFactors: Map<number, number>;
  countries: Country[];
};

export type TravelKmData = {
  name: string;
  data: { x: number; y: number }[];
}[];

export type EmissionsData = {
  categories: string[];
  values: number[];
};

export type PodiumEntry = { 
  position: number; 
  driver: string; 
  team: string;
};

export type CircuitStats = {
  mostWinsDriver?: { driver: string; wins: number } | null;
  mostWinsTeam?: { team: string; wins: number } | null;
  mostPolesDriver?: { driver: string; poles: number } | null;
  lastPodium: PodiumEntry[];
};

export type CsvChartPoint = { 
  x: number | null; 
  y: number | null;
};

export type CsvChartSeries = { 
  name: string; 
  data: CsvChartPoint[];
};

export type CsvChartData = {
  series: CsvChartSeries[];
  categories: string[];
  availableKeys: string[];
};

// ============================================================================
// CACHE SINGLETON
// ============================================================================

let globalCache: DataCache | null = null;
let isLoading = false;
let loadPromise: Promise<DataCache> | null = null;

// ============================================================================
// CSV PARSING UTILITIES
// ============================================================================

/**
 * Auto-detect delimiter and parse CSV robustly
 */
export async function fetchAndAutoParseCsv(path: string) {
  const txt = await (await fetch(path)).text();
  
  // Detect delimiter from sample
  const sample = txt.slice(0, 2000);
  let delimiter = ",";
  const commaCount = (sample.match(/,/g) || []).length;
  const tabCount = (sample.match(/\t/g) || []).length;
  const semiCount = (sample.match(/;/g) || []).length;
  
  if (tabCount > commaCount && tabCount >= semiCount) delimiter = "\t";
  else if (semiCount > commaCount && semiCount >= tabCount) delimiter = ";";

  if (delimiter === ",") {
    try {
      return csvParse(txt);
    } catch (e) {
      return dsvFormat(delimiter).parse(txt);
    }
  } else {
    return dsvFormat(delimiter).parse(txt);
  }
}

/**
 * Simple CSV parsing using d3-fetch (for most cases)
 */
async function fetchCsv(path: string) {
  return await csv(path);
}

// ============================================================================
// MAIN DATA LOADER
// ============================================================================

/**
 * Load all F1 data from CSV files with caching
 */
export async function loadAllData(): Promise<DataCache> {
  if (globalCache) {
    return globalCache;
  }

  if (isLoading && loadPromise) {
    return loadPromise;
  }

  isLoading = true;
  loadPromise = (async () => {
    try {
      console.log("Loading F1 data...");

      const [
        circuitsParsed,
        racesParsed,
        qualifyingParsed,
        driversParsed,
        constructorsParsed,
        emissionsParsed,
        countriesParsed,
      ] = await Promise.all([
        fetchAndAutoParseCsv("/circuits.csv"),
        fetchAndAutoParseCsv("/races.csv"),
        fetchAndAutoParseCsv("/qualifying.csv"),
        fetchAndAutoParseCsv("/drivers.csv"),
        fetchAndAutoParseCsv("/constructors.csv"),
        fetchCsv("/emission_factors_2000_2025.csv"),
        fetchCsv("f1db-countries.csv"),
      ]);

      const circuits = (circuitsParsed as any[]).map(fromStringCircuit);
      const races = (racesParsed as any[]).map(fromStringRace);
      const qualifying = (qualifyingParsed as any[]).map(fromStringQualifying);
      const drivers = (driversParsed as any[]).map(fromStringDriver);
      const constructors = (constructorsParsed as any[]).map(fromStringConstructor);
      const countries = (countriesParsed as any[]).map(fromStringCountry);

      const emissionFactors = new Map<number, number>();
      emissionsParsed.forEach((row: any) => {
        const year = parseInt(row.year ?? "", 10);
        const factor = parseFloat(row["air_factor (CO2_kg/tkm)"] ?? "");
        if (Number.isFinite(year) && Number.isFinite(factor)) {
          emissionFactors.set(year, factor);
        }
      });

      globalCache = {
        circuits,
        races,
        qualifying,
        drivers,
        constructors,
        emissionFactors,
        countries
      };

      console.log("F1 data loaded successfully:", {
        circuits: circuits.length,
        races: races.length,
        qualifying: qualifying.length,
        drivers: drivers.length,
        constructors: constructors.length,
        emissionFactors: emissionFactors.size,
        countries: countries.length
      });

      return globalCache;
    } catch (error) {
      console.error("Failed to load F1 data:", error);
      isLoading = false;
      loadPromise = null;
      throw error;
    } finally {
      isLoading = false;
    }
  })();

  return loadPromise;
}

// ============================================================================
// BASIC DATA GETTERS
// ============================================================================

export async function getCircuits(): Promise<Circuit[]> {
  const data = await loadAllData();
  return data.circuits;
}

export async function getRaces(): Promise<Race[]> {
  const data = await loadAllData();
  return data.races;
}

export async function getQualifying(): Promise<Qualifying[]> {
  const data = await loadAllData();
  return data.qualifying;
}

export async function getDrivers(): Promise<Driver[]> {
  const data = await loadAllData();
  return data.drivers;
}

export async function getConstructors(): Promise<Constructor[]> {
  const data = await loadAllData();
  return data.constructors;
}

export async function getEmissionFactors(): Promise<Map<number, number>> {
  const data = await loadAllData();
  return data.emissionFactors;
}

export async function getCountries(): Promise<Country[]> {
  const data = await loadAllData();
  return data.countries;
}

// ============================================================================
// DATA AGGREGATION UTILITIES
// ============================================================================

export async function getRacesByCircuit(): Promise<Map<number, Race[]>> {
  const races = await getRaces();
  const map = new Map<number, Race[]>();
  
  for (const race of races) {
    const arr = map.get(race.circuitId) ?? [];
    arr.push(race);
    map.set(race.circuitId, arr);
  }
  
  for (const arr of map.values()) {
    arr.sort((a, b) => (a.year !== b.year ? a.year - b.year : a.round - b.round));
  }
  
  return map;
}

export async function getRacesByYear(): Promise<Map<number, Race[]>> {
  const races = await getRaces();
  const map = new Map<number, Race[]>();
  
  for (const race of races) {
    const arr = map.get(race.year) ?? [];
    arr.push(race);
    map.set(race.year, arr);
  }
  
  for (const arr of map.values()) {
    arr.sort((a, b) => a.round - b.round);
  }
  
  return map;
}

export async function getLookupMaps(): Promise<{
  drivers: Map<number, Driver>;
  constructors: Map<number, Constructor>;
}> {
  const [drivers, constructors] = await Promise.all([
    getDrivers(),
    getConstructors(),
  ]);
  
  return {
    drivers: new Map(drivers.map((d) => [d.driverId, d])),
    constructors: new Map(constructors.map((c) => [c.constructorId, c])),
  };
}

export async function getCircuitMap(): Promise<Map<number, Circuit>> {
  const circuits = await getCircuits();
  return new Map(circuits.map((c) => [c.circuitId, c]));
}

export async function getCircuitCoordinates(): Promise<
  Record<number, { lat: number; lng: number }>
> {
  const circuits = await getCircuits();
  const map: Record<number, { lat: number; lng: number }> = {};
  
  circuits.forEach((c) => {
    if (Number.isFinite(c.lat) && Number.isFinite(c.lng)) {
      map[c.circuitId] = { lat: c.lat, lng: c.lng };
    }
  });
  
  return map;
}

// ============================================================================
// BUSINESS LOGIC - DATA PROCESSING
// ============================================================================

export async function getRacesWithCircuitsByYear(year: number): Promise<RaceWithCircuit[]> {
  const [circuits, races] = await Promise.all([
    getCircuits(),
    getRaces(),
  ]);

  // Lookup map for circuits
  const circuitLookup = new Map(
    circuits.map(c => [c.circuitId, c])
  );

  return races
    .filter(race => race.year === year)
    .map(race => {
      const circuit = circuitLookup.get(race.circuitId);
      if (!circuit) return null;

      return {
        ...race,
        circuit,
        coordinates: createCoordinates(circuit.lng, circuit.lat),
        label: `${race.year} • R${String(race.round).padStart(2, "0")} • ${race.name}`,
      };
    })
    .filter((r): r is RaceWithCircuit => r !== null)
    .sort((a, b) => a.round - b.round);
}

export async function getRacesWithCircuits(): Promise<{
  circuits: Circuit[];
  racesMap: Map<number, Race[]>;
  racesWithCircuit: RaceWithCircuit[];
}> {
  const [circuits, racesMap] = await Promise.all([
    getCircuits(),
    getRacesByCircuit(),
  ]);

  const circuitLookup = new Map(circuits.map((c) => [c.circuitId, c]));
  const allRaces = Array.from(racesMap.values()).flat();

  const racesWithCircuit = allRaces
    .map((race) => {
      const circuit = circuitLookup.get(race.circuitId);
      if (!circuit) return null;

      return {
        ...race,
        circuit,
        coordinates: createCoordinates(circuit.lng, circuit.lat),
        label: `${race.year} • R${String(race.round).padStart(2, "0")} • ${race.name}`,
      };
    })
    .filter((race): race is RaceWithCircuit => Boolean(race))
    .sort((a, b) => 
      a.year !== b.year ? a.year - b.year : a.round - b.round
    );

  return { circuits, racesMap, racesWithCircuit };
}

export async function getTravelKmPerYear(): Promise<TravelKmData> {
  const [circuitMap, racesByYear] = await Promise.all([
    getCircuitCoordinates(),
    getRacesByYear(),
  ]);

  const kmPerYear: Record<number, number> = {};
  
  for (const [year, races] of racesByYear.entries()) {
    const sorted = [...races].sort((a, b) => a.round - b.round);
    let totalKm = 0;
    
    for (let i = 1; i < sorted.length; i++) {
      const prev = circuitMap[sorted[i - 1].circuitId];
      const curr = circuitMap[sorted[i].circuitId];
      if (prev && curr) {
        totalKm += haversine(prev.lat, prev.lng, curr.lat, curr.lng);
      }
    }
    
    kmPerYear[year] = Math.round(totalKm * 100) / 100;
  }

  return [
    {
      name: "Km Travelled",
      data: Object.keys(kmPerYear)
        .map((y) => parseInt(y, 10))
        .sort((a, b) => a - b)
        .map((y) => ({ x: new Date(y, 0, 1).getTime(), y: kmPerYear[y] })),
    },
  ];
}

export async function getEmissionsData(
  averageCargoMassTonnes = 50,
  earliestYear = 1950
): Promise<EmissionsData> {
  const [circuitMap, racesByYear, emissionFactors] = await Promise.all([
    getCircuitCoordinates(),
    getRacesByYear(),
    getEmissionFactors(),
  ]);

  const kmPerYear: Record<number, number> = {};
  
  for (const [year, races] of racesByYear.entries()) {
    const sorted = [...races].sort((a, b) => a.round - b.round);
    let totalKm = 0;
    
    for (let i = 1; i < sorted.length; i++) {
      const prev = circuitMap[sorted[i - 1].circuitId];
      const curr = circuitMap[sorted[i].circuitId];
      if (prev && curr) {
        totalKm += haversine(prev.lat, prev.lng, curr.lat, curr.lng);
      }
    }
    
    kmPerYear[year] = Math.round(totalKm * 100) / 100;
  }

  const factorYears = Array.from(emissionFactors.keys()).sort((a, b) => a - b);
  
  const resolveFactor = (year: number) => {
    if (emissionFactors.has(year)) return emissionFactors.get(year)!;
    if (!factorYears.length) return 0;
    if (year <= factorYears[0]) return emissionFactors.get(factorYears[0])!;
    if (year >= factorYears[factorYears.length - 1]) {
      return emissionFactors.get(factorYears[factorYears.length - 1])!;
    }
    
    for (let i = factorYears.length - 1; i >= 0; i--) {
      if (factorYears[i] <= year) return emissionFactors.get(factorYears[i])!;
    }
    
    return emissionFactors.get(factorYears[0])!;
  };

  const availableYears = Array.from(racesByYear.keys());
  const latestYear = availableYears.length ? Math.max(...availableYears) : earliestYear;

  const categories: string[] = [];
  const values: number[] = [];

  for (let year = earliestYear; year <= latestYear; year++) {
    const distanceKm = kmPerYear[year] ?? 0;
    const factorKgPerTkm = resolveFactor(year);
    const emissionsKg = distanceKm * factorKgPerTkm * averageCargoMassTonnes;
    const emissionsKt = emissionsKg / 1_000_000;
    
    categories.push(year.toString());
    values.push(Number(emissionsKt.toFixed(2)));
  }

  return { categories, values };
}

export async function getCircuitStats(circuitId: number): Promise<CircuitStats> {
  const data = await loadAllData();
  const { drivers: driversLookup, constructors: constructorsLookup } = await getLookupMaps();

  const resultsParsed = await fetchAndAutoParseCsv("/results.csv");
  const results = resultsParsed.map((r: any) => ({
    resultId: Number(r.resultId),
    raceId: Number(r.raceId),
    driverId: Number(r.driverId),
    constructorId: Number(r.constructorId),
    number: r.number,
    grid: Number(r.grid),
    position: r.position,
    positionText: r.positionText,
    positionOrder: Number(r.positionOrder),
    points: Number(r.points),
    laps: Number(r.laps),
    time: r.time,
    milliseconds: r.milliseconds ? Number(r.milliseconds) : null,
    fastestLap: r.fastestLap ? Number(r.fastestLap) : null,
    rank: r.rank ? Number(r.rank) : null,
    fastestLapTime: r.fastestLapTime,
    fastestLapSpeed: r.fastestLapSpeed,
    statusId: Number(r.statusId),
  }));

  const races = data.races.filter((r) => Number(r.circuitId) === Number(circuitId));

  if (!races.length) {
    return { lastPodium: [] };
  }

  const winsCounter = new Map<number, number>();
  const teamWinsCounter = new Map<number, number>();

  for (const race of races) {
    const allResults = results.filter((res: any) => Number(res.raceId) === Number(race.raceId));

    let winner = allResults.find((res: any) => {
      if (res.positionOrder !== undefined && Number(res.positionOrder) === 1) return true;
      const pos = typeof res.position === "number" ? res.position : parseInt(String(res.position || res.positionText || ""), 10);
      if (!isNaN(pos) && pos === 1) return true;
      if (res.positionText === "1") return true;
      return false;
    });

    if (!winner) {
      const candidates = allResults
        .map((r: any) => ({ r, pos: typeof r.position === 'number' ? r.position : parseInt(String(r.position || r.positionText || ""), 10) }))
        .filter(x => !isNaN(x.pos))
        .sort((a, b) => a.pos - b.pos);
      if (candidates.length) winner = candidates[0].r;
    }

    if (winner) {
      winsCounter.set(Number(winner.driverId), (winsCounter.get(Number(winner.driverId)) || 0) + 1);
      teamWinsCounter.set(Number(winner.constructorId), (teamWinsCounter.get(Number(winner.constructorId)) || 0) + 1);
    }
  }

  const mostWinsDriverEntry = Array.from(winsCounter.entries()).sort((a, b) => b[1] - a[1])[0];
  const mostWinsTeamEntry = Array.from(teamWinsCounter.entries()).sort((a, b) => b[1] - a[1])[0];

  const driverName = (d: Driver | undefined) => {
    if (!d) return "Unknown";
    return `${d.forename} ${d.surname}`;
  };

  const mostWinsDriver = mostWinsDriverEntry
    ? { driver: driverName(driversLookup.get(mostWinsDriverEntry[0])), wins: mostWinsDriverEntry[1] }
    : null;
  const mostWinsTeam = mostWinsTeamEntry
    ? { team: constructorsLookup.get(mostWinsTeamEntry[0])?.name ?? "Unknown", wins: mostWinsTeamEntry[1] }
    : null;

  const polesCounter = new Map<number, number>();
  for (const race of races) {
    const q = data.qualifying.find(
      (q) => Number(q.raceId) === Number(race.raceId) && q.position === 1
    );
    if (q) polesCounter.set(Number(q.driverId), (polesCounter.get(Number(q.driverId)) || 0) + 1);
  }
  
  const polesEntry = Array.from(polesCounter.entries()).sort((a, b) => b[1] - a[1])[0];
  const mostPolesDriver = polesEntry 
    ? { driver: driverName(driversLookup.get(polesEntry[0])), poles: polesEntry[1] } 
    : null;

  const sortedRaces = races.slice().sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.round - a.round;
  });

  let lastPodium: PodiumEntry[] = [];
  for (const race of sortedRaces) {
    const podiumResults = results
      .filter((res: any) => Number(res.raceId) === Number(race.raceId))
      .map((res: any) => ({ 
        res, 
        pos: typeof res.position === 'number' ? res.position : parseInt(String(res.position || res.positionText || ""), 10) 
      }))
      .filter(x => !isNaN(x.pos) && x.pos >= 1 && x.pos <= 3)
      .sort((a, b) => a.pos - b.pos)
      .map(x => x.res);
    
    if (podiumResults.length >= 1) {
      lastPodium = podiumResults.slice(0, 3).map((pr: any) => ({
        position: typeof pr.position === 'number' ? pr.position : parseInt(String(pr.position || pr.positionText || ""), 10),
        driver: driverName(driversLookup.get(pr.driverId)),
        team: constructorsLookup.get(pr.constructorId)?.name ?? "Unknown",
      }));
      break;
    }
  }

  return {
    mostWinsDriver,
    mostWinsTeam,
    mostPolesDriver,
    lastPodium,
  };
}

export async function getEmissionFactorsChartData(
  selectedKeys?: string[]
): Promise<CsvChartData> {
  const excludedKeys = new Set([
    "fuel_g_tkm observation",
    "fuel_g/tkm_ estimated",
  ]);
  const rows = await csv("/emission_factors_2000_2025.csv");
  
  if (!rows || rows.length === 0) {
    throw new Error("Emission factors CSV empty or invalid");
  }

  const firstRowKeys = Object.keys(rows[0]);
  const yearKey = "year";
  
  const numericKeys = firstRowKeys
    .filter(k => k !== yearKey)
    .filter(k => !excludedKeys.has(k))
    .filter(k => {
      for (let i = 0; i < Math.min(rows.length, 5); i++) {
        const v = rows[i][k];
        if (v === undefined || v === "") continue;
        const n = Number(String(v).replace(",", "."));
        if (!isNaN(n)) return true;
      }
      return false;
    });

  const keysToShow = selectedKeys && selectedKeys.length > 0 
    ? selectedKeys.filter(k => numericKeys.includes(k))
    : numericKeys;

  const xValues = rows.map(r => {
    const raw = String((r as any)[yearKey] ?? "").trim();
    const yearNum = parseInt(raw, 10);
    
    if (isNaN(yearNum)) return null;
    
    return new Date(yearNum, 0, 1).getTime();
  });

  const series: CsvChartSeries[] = keysToShow.map(key => {
    const data: CsvChartPoint[] = rows.map((r, idx) => {
      const raw = (r as any)[key];
      const y = raw === undefined || raw === "" 
        ? null 
        : Number(String(raw).replace(",", "."));
      
      return { 
        x: xValues[idx], 
        y: isNaN(y as number) ? null : (y as number) 
      };
    });
    
    return { name: key, data };
  });

  const categories = rows.map(r => String((r as any)[yearKey] ?? "").trim());

  return {
    series,
    categories,
    availableKeys: numericKeys,
  };
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

export function clearCache(): void {
  globalCache = null;
  isLoading = false;
  loadPromise = null;
  console.log("Data cache cleared");
}

export function isCached(): boolean {
  return globalCache !== null;
}
