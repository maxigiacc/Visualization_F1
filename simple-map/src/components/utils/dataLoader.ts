import { csv } from "d3-fetch";
import { csvParse, dsvFormat } from "d3-dsv";
import type { Circuit } from "../models/Circuit";
import { fromStringCircuit } from "../models/Circuit";
import type { Race } from "../models/Race";
import { fromStringRace } from "../models/Race";
import type { Qualifying } from "../models/Qualyfing";
import { fromStringQualifying } from "../models/Qualyfing";
import type { Constructor } from "../models/Constructor";
import { fromStringConstructor } from "../models/Constructor";
import type { Driver } from "../models/Driver";
import { fromStringDriver } from "../models/Driver";
import { haversine } from "./utils";
import { createCoordinates, type Coordinates } from "@vnedyalk0v/react19-simple-maps";
import type { ApexOptions } from "apexcharts";

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
};

export type TravelKmData = {
  name: string;
  data: { x: number; y: number }[];
}[];

export type EmissionsData = {
  categories: string[];
  values: number[];
};

export type RaceWithCircuit = Race & {
  circuit: Circuit;
  coordinates: Coordinates;
  label: string;
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
 * Returns a promise that resolves to the cached data
 */
export async function loadAllData(): Promise<DataCache> {
  // Return cached data if available
  if (globalCache) {
    return globalCache;
  }

  // Return existing load promise if already loading
  if (isLoading && loadPromise) {
    return loadPromise;
  }

  // Start loading
  isLoading = true;
  loadPromise = (async () => {
    try {
      console.log("Loading F1 data...");

      // Load all CSV files in parallel
      const [
        circuitsParsed,
        racesParsed,
        qualifyingParsed,
        driversParsed,
        constructorsParsed,
        emissionsParsed,
      ] = await Promise.all([
        fetchAndAutoParseCsv("/circuits.csv"),
        fetchAndAutoParseCsv("/races.csv"),
        fetchAndAutoParseCsv("/qualifying.csv"),
        fetchAndAutoParseCsv("/drivers.csv"),
        fetchAndAutoParseCsv("/constructors.csv"),
        fetchCsv("/emission_factors_2000_2025.csv"),
      ]);

      // Convert to typed objects
      const circuits = (circuitsParsed as any[]).map(fromStringCircuit);
      const races = (racesParsed as any[]).map(fromStringRace);
      const qualifying = (qualifyingParsed as any[]).map(fromStringQualifying);
      const drivers = (driversParsed as any[]).map(fromStringDriver);
      const constructors = (constructorsParsed as any[]).map(fromStringConstructor);

      // Parse emission factors
      const emissionFactors = new Map<number, number>();
      emissionsParsed.forEach((row: any) => {
        const year = parseInt(row.year ?? "", 10);
        const factor = parseFloat(row["air_factor (CO2_kg/tkm)"] ?? "");
        if (Number.isFinite(year) && Number.isFinite(factor)) {
          emissionFactors.set(year, factor);
        }
      });

      // Create cache
      globalCache = {
        circuits,
        races,
        qualifying,
        drivers,
        constructors,
        emissionFactors,
      };

      console.log("F1 data loaded successfully:", {
        circuits: circuits.length,
        races: races.length,
        qualifying: qualifying.length,
        drivers: drivers.length,
        constructors: constructors.length,
        emissionFactors: emissionFactors.size,
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
// SPECIFIC DATA GETTERS
// ============================================================================

/**
 * Get circuits data (loads if not cached)
 */
export async function getCircuits(): Promise<Circuit[]> {
  const data = await loadAllData();
  return data.circuits;
}

/**
 * Get races data (loads if not cached)
 */
export async function getRaces(): Promise<Race[]> {
  const data = await loadAllData();
  return data.races;
}

/**
 * Get qualifying data (loads if not cached)
 */
export async function getQualifying(): Promise<Qualifying[]> {
  const data = await loadAllData();
  return data.qualifying;
}

/**
 * Get drivers data (loads if not cached)
 */
export async function getDrivers(): Promise<Driver[]> {
  const data = await loadAllData();
  return data.drivers;
}

/**
 * Get constructors data (loads if not cached)
 */
export async function getConstructors(): Promise<Constructor[]> {
  const data = await loadAllData();
  return data.constructors;
}

/**
 * Get emission factors data (loads if not cached)
 */
export async function getEmissionFactors(): Promise<Map<number, number>> {
  const data = await loadAllData();
  return data.emissionFactors;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Build a map of races grouped by circuit ID
 */
export async function getRacesByCircuit(): Promise<Map<number, Race[]>> {
  const races = await getRaces();
  const map = new Map<number, Race[]>();
  
  for (const race of races) {
    const arr = map.get(race.circuitId) ?? [];
    arr.push(race);
    map.set(race.circuitId, arr);
  }
  
  // Sort races chronologically within each circuit
  for (const arr of map.values()) {
    arr.sort((a, b) => (a.year !== b.year ? a.year - b.year : a.round - b.round));
  }
  
  return map;
}

/**
 * Build a map of races grouped by year
 */
export async function getRacesByYear(): Promise<Map<number, Race[]>> {
  const races = await getRaces();
  const map = new Map<number, Race[]>();
  
  for (const race of races) {
    const arr = map.get(race.year) ?? [];
    arr.push(race);
    map.set(race.year, arr);
  }
  
  // Sort races by round within each year
  for (const arr of map.values()) {
    arr.sort((a, b) => a.round - b.round);
  }
  
  return map;
}

/**
 * Build lookup maps for drivers and constructors
 */
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

/**
 * Build a map of circuits by ID
 */
export async function getCircuitMap(): Promise<Map<number, Circuit>> {
  const circuits = await getCircuits();
  return new Map(circuits.map((c) => [c.circuitId, c]));
}

/**
 * Get circuit coordinates map for distance calculations
 */
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
// BUSINESS LOGIC FUNCTIONS (for charts/components)
// ============================================================================

/**
 * Get races with their circuit information and formatted labels
 * Used by InteractiveMap component
 */
export async function getRacesWithCircuits(): Promise<{
  circuits: Circuit[];
  racesMap: Map<number, Race[]>;
  racesWithCircuit: RaceWithCircuit[];
}> {
  const [circuits, racesMap] = await Promise.all([
    getCircuits(),
    getRacesByCircuit(),
  ]);

  // Build circuit lookup for fast access
  const circuitLookup = new Map(
    circuits.map((c) => [c.circuitId, c])
  );

  // Flatten all races and attach circuit info
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

  return {
    circuits,
    racesMap,
    racesWithCircuit,
  };
}

/**
 * Calculate travel kilometers per year for chart
 */
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

/**
 * Calculate emissions data for bar chart
 */
export async function getEmissionsData(
  averageCargoMassTonnes = 50,
  earliestYear = 1950
): Promise<EmissionsData> {
  const [circuitMap, racesByYear, emissionFactors] = await Promise.all([
    getCircuitCoordinates(),
    getRacesByYear(),
    getEmissionFactors(),
  ]);

  // Calculate km per year
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

  // Resolve emission factors
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

/**
 * Fetch detailed statistics for a specific circuit
 * Includes: most wins (driver/team), most poles, last podium
 */
export async function getCircuitStats(circuitId: number): Promise<CircuitStats> {
  // Check cache first
  const cacheKey = `circuit_stats_${circuitId}`;
  
  // Load main data
  const data = await loadAllData();
  const { drivers: driversLookup, constructors: constructorsLookup } = await getLookupMaps();

  // Load results separately (heavy file, not in main cache)
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

  // Filter races for this circuit
  const races = data.races.filter((r) => Number(r.circuitId) === Number(circuitId));

  if (!races.length) {
    return { lastPodium: [] };
  }

  // Calculate wins
  const winsCounter = new Map<number, number>();
  const teamWinsCounter = new Map<number, number>();

  for (const race of races) {
    const allResults = results.filter((res: any) => Number(res.raceId) === Number(race.raceId));

    // Find winner robustly
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

  // Calculate poles
  const polesCounter = new Map<number, number>();
  for (const race of races) {
    const q = data.qualifying.find(
      (q) => Number(q.raceId) === Number(race.raceId) && (Number(q.position) === 1 || q.position === "1")
    );
    if (q) polesCounter.set(Number(q.driverId), (polesCounter.get(Number(q.driverId)) || 0) + 1);
  }
  
  const polesEntry = Array.from(polesCounter.entries()).sort((a, b) => b[1] - a[1])[0];
  const mostPolesDriver = polesEntry 
    ? { driver: driverName(driversLookup.get(polesEntry[0])), poles: polesEntry[1] } 
    : null;

  // Find last podium
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

/**
 * Load emission factors CSV and prepare data for chart visualization
 * This is specifically for the emission_factors_2000_2025.csv file
 */
export async function getEmissionFactorsChartData(
  selectedKeys?: string[]
): Promise<CsvChartData> {
  const rows = await csv("/emission_factors_2000_2025.csv");
  
  if (!rows || rows.length === 0) {
    throw new Error("Emission factors CSV empty or invalid");
  }

  const firstRowKeys = Object.keys(rows[0]);
  const yearKey = "year"; // We know the year column name
  
  // Get all numeric columns except year
  const numericKeys = firstRowKeys
    .filter(k => k !== yearKey)
    .filter(k => {
      // Check if column is numeric
      for (let i = 0; i < Math.min(rows.length, 5); i++) {
        const v = rows[i][k];
        if (v === undefined || v === "") continue;
        const n = Number(String(v).replace(",", "."));
        if (!isNaN(n)) return true;
      }
      return false;
    });

  // Use selected keys or all numeric keys
  const keysToShow = selectedKeys && selectedKeys.length > 0 
    ? selectedKeys.filter(k => numericKeys.includes(k))
    : numericKeys;

  // Parse years as timestamps
  const xValues = rows.map(r => {
    const raw = String((r as any)[yearKey] ?? "").trim();
    const yearNum = parseInt(raw, 10);
    
    if (isNaN(yearNum)) return null;
    
    return new Date(yearNum, 0, 1).getTime();
  });

  // Build series for each metric
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

  // Categories for x-axis labels
  const categories = rows.map(r => String((r as any)[yearKey] ?? "").trim());

  return {
    series,
    categories,
    availableKeys: numericKeys,
  };
}

/**
 * Build annotations for ApexCharts from series data
 * Creates support lines, ranges, and point markers
 */
type YAnnotation = {
  y: number;
  y2?: number;
  borderColor?: string;
  fillColor?: string;
  opacity?: number;
  label?: {
    borderColor?: string;
    style?: Record<string, any>;
    text?: string;
  };
};

type XAnnotation = {
  x: any;
  strokeDashArray?: number;
  borderColor?: string;
  label?: {
    borderColor?: string;
    style?: Record<string, any>;
    text?: string;
  };
};

type PointAnnotation = {
  x: any;
  y: number;
  marker?: Record<string, any>;
  label?: Record<string, any>;
};

export function buildChartAnnotations(series: CsvChartSeries[]): {
  yaxis: YAnnotation[];
  xaxis: XAnnotation[];
  points: PointAnnotation[];
} {
  const anns: { yaxis: YAnnotation[]; xaxis: XAnnotation[]; points: PointAnnotation[] } = {
    yaxis: [],
    xaxis: [],
    points: [],
  };

  if (!series || series.length === 0) return anns;

  const first = series[0];
  const validPoints = (first.data || []).filter((d) => d && d.y !== null && d.y !== undefined);

  if (validPoints.length === 0) return anns;

  const firstPoint = validPoints[Math.min(3, validPoints.length - 1)];
  const secondPoint = validPoints[Math.min(6, validPoints.length - 1)];
  const maxY = Math.max(...validPoints.map((p) => Number(p.y)));

  // Y-axis support line
  anns.yaxis.push({
    y: Math.round(0.9 * maxY * 100) / 100,
    borderColor: "#00E396",
    label: {
      borderColor: "#00E396",
      style: { color: "#fff", background: "#00E396" },
      text: "Support",
    },
  });

  // Y-axis range
  anns.yaxis.push({
    y: Math.round(maxY * 0.98 * 100) / 100,
    y2: Math.round(maxY * 1.02 * 100) / 100,
    borderColor: "#000",
    fillColor: "#FEB019",
    opacity: 0.2,
    label: {
      borderColor: "#333",
      style: { fontSize: "10px", color: "#333", background: "#FEB019" },
      text: "Y-range",
    },
  });

  // X-axis annotation
  anns.xaxis.push({
    x: secondPoint.x,
    strokeDashArray: 0,
    borderColor: "#775DD0",
    label: {
      borderColor: "#775DD0",
      style: { color: "#fff", background: "#775DD0" },
      text: "Anno Test",
    },
  });

  // Point annotation
  anns.points.push({
    x: firstPoint.x,
    y: Number(firstPoint.y),
    marker: { size: 8, fillColor: "#fff", strokeColor: "red", radius: 2 },
    label: {
      borderColor: "#FF4560",
      offsetY: 0,
      style: { color: "#fff", background: "#FF4560" },
      text: "Point Annotation",
    },
  });

  return anns;
}

export type BuildChartOptionsParams = {
  series?: CsvChartSeries[];
  categories?: any[]; 
  annotations?: any;  
  chartId?: string;
  height?: number;
};

export function buildChartOptions({
  series = [],
  categories = [],
  annotations = undefined,
  chartId = "emission-factors-chart",
  height = 350,
}: BuildChartOptionsParams): ApexOptions {
  
  // helper: format number with 3 decimals max
  const fmtNumber = (v: number | string | undefined) => {
    if (v === null || v === undefined || v === "") return "";
    const n = Number(v);
    if (isNaN(n)) return String(v);
    return n.toFixed(3).replace(/\.?0+$/, "");
  };

  // helper: parse category -> Date
  const toDate = (val: any) => {
    if (val instanceof Date) return val;
    if (typeof val === "number") return new Date(val);
    const parsed = Date.parse(String(val));
    if (!isNaN(parsed)) return new Date(parsed);
    const yearMatch = String(val).match(/\d{4}/);
    if (yearMatch) return new Date(Number(yearMatch[0]), 0, 1);
    return new Date(NaN);
  };

  // Determine if we should show only year in x-axis labels
  let showOnlyYear = false;
  if (categories && categories.length >= 2) {
    const first = toDate(categories[0]);
    const last = toDate(categories[categories.length - 1]);
    if (!isNaN(first.getTime()) && !isNaN(last.getTime())) {
      const msSpan = Math.abs(last.getTime() - first.getTime());
      
      showOnlyYear = msSpan >= 365 * 24 * 3600 * 1000;
    }
  }

  const options: ApexOptions = {
    chart: {
      id: chartId,
      height,
      type: "line",
      toolbar: { show: true },
      zoom: { enabled: true },
    },

    annotations: annotations ?? {},

    dataLabels: { enabled: false },
    stroke: { curve: "straight" },
    grid: { padding: { right: 30, left: 20 } },
    title: { text: "Emission Factors Over Time", align: "left" },

    xaxis: {
      type: "datetime",
      categories,
      labels: {
        formatter: function (value: any) {
          const d = toDate(value);
          if (isNaN(d.getTime())) return String(value);
          if (showOnlyYear) return String(d.getFullYear());
          return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
        },
      },
    },

    yaxis: {
      labels: {
        formatter: function (val: any) {
          return fmtNumber(Number(val));
        },
      },
    },

    tooltip: {
      shared: true,
      intersect: false,
      x: {
        formatter: function (val: any) {
          const d = toDate(val);
          if (isNaN(d.getTime())) return String(val);
          if (showOnlyYear) return String(d.getFullYear());
          return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
        },
      },
      y: {
        formatter: function (val: any) {
          return fmtNumber(Number(val));
        },
      },
    },

    legend: { position: "top" },
  };

  return options;
}



// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

/**
 * Clear the data cache (useful for testing or forcing reload)
 */
export function clearCache(): void {
  globalCache = null;
  isLoading = false;
  loadPromise = null;
  console.log("Data cache cleared");
}

/**
 * Check if data is currently cached
 */
export function isCached(): boolean {
  return globalCache !== null;
}