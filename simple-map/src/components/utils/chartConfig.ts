// src/utils/chartConfig.ts
// ============================================================================
// CHART CONFIGURATION AND UTILITIES ONLY
// No data loading, only ApexCharts configurations and helpers
// ============================================================================

import type { ApexOptions } from "apexcharts";
import type { CsvChartSeries } from "./dataLoader";
import type { Circuit } from "../models/Circuit";


// ============================================================================
// TYPES FOR ANNOTATIONS
// ============================================================================

export type YAnnotation = {
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

export type XAnnotation = {
  x: any;
  strokeDashArray?: number;
  borderColor?: string;
  label?: {
    borderColor?: string;
    style?: Record<string, any>;
    text?: string;
  };
};

export type PointAnnotation = {
  x: any;
  y: number;
  marker?: Record<string, any>;
  label?: Record<string, any>;
};

export type ChartAnnotations = {
  yaxis: YAnnotation[];
  xaxis: XAnnotation[];
  points: PointAnnotation[];
};

// ============================================================================
// ANNOTATION BUILDERS
// ============================================================================

/**
 * Build annotations for ApexCharts from series data
 * Creates support lines, ranges, and point markers
 */
export function buildChartAnnotations(series: CsvChartSeries[]): ChartAnnotations {
  const anns: ChartAnnotations = {
    yaxis: [],
    xaxis: [],
    points: [],
  };

  if (!series || series.length === 0) return anns;

  const first = series[0];
  const validPoints = (first.data || []).filter(
    (d) => d && d.y !== null && d.y !== undefined
  );

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

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

/**
 * Format number with max 3 decimals, removing trailing zeros
 */
export function formatNumber(v: number | string | undefined): string {
  if (v === null || v === undefined || v === "") return "";
  const n = Number(v);
  if (isNaN(n)) return String(v);
  return n.toFixed(3).replace(/\.?0+$/, "");
}

/**
 * Parse category value to Date
 */
export function toDate(val: any): Date {
  if (val instanceof Date) return val;
  if (typeof val === "number") return new Date(val);
  
  const parsed = Date.parse(String(val));
  if (!isNaN(parsed)) return new Date(parsed);
  
  const yearMatch = String(val).match(/\d{4}/);
  if (yearMatch) return new Date(Number(yearMatch[0]), 0, 1);
  
  return new Date(NaN);
}

/**
 * Determine if categories span is >= 1 year (to show only year in labels)
 */
export function shouldShowOnlyYear(categories: any[]): boolean {
  if (!categories || categories.length < 2) return false;

  const first = toDate(categories[0]);
  const last = toDate(categories[categories.length - 1]);

  if (isNaN(first.getTime()) || isNaN(last.getTime())) return false;

  const msSpan = Math.abs(last.getTime() - first.getTime());
  return msSpan >= 365 * 24 * 3600 * 1000;
}

// ============================================================================
// CHART OPTIONS BUILDERS
// ============================================================================

export type BuildChartOptionsParams = {
  series?: CsvChartSeries[];
  categories?: any[];
  annotations?: ChartAnnotations;
  chartId?: string;
  height?: number;
  title?: string;
};

/**
 * Build complete ApexOptions configuration for emission factors chart
 */
export function buildEmissionFactorsChartOptions({
  series = [],
  categories = [],
  annotations,
  chartId = "emission-factors-chart",
  height = 350,
  title = "Emission Factors Over Time",
}: BuildChartOptionsParams): ApexOptions {
  const showOnlyYear = shouldShowOnlyYear(categories);

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
    title: { text: title, align: "left" },
    xaxis: {
      type: "datetime",
      categories,
      labels: {
        formatter: function (value: any) {
          const d = toDate(value);
          if (isNaN(d.getTime())) return String(value);
          if (showOnlyYear) return String(d.getFullYear());
          return d.toLocaleDateString(undefined, {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
        },
      },
    },
    yaxis: {
      labels: {
        formatter: function (val: any) {
          return formatNumber(Number(val));
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
          return d.toLocaleDateString(undefined, {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
        },
      },
      y: {
        formatter: function (val: any) {
          return formatNumber(Number(val));
        },
      },
    },
    legend: { position: "top" },
    series,
  };

  return options;
}

/**
 * Build ApexOptions for travel km per year chart
 */
export function buildTravelKmChartOptions(): ApexOptions {
  return {
    chart: {
      id: "travel-km-per-year",
      type: "line",
      height: 350,
      zoom: { enabled: true },
      toolbar: { show: true },
    },
    xaxis: { type: "datetime", title: { text: "Year" } },
    yaxis: { title: { text: "Km" } },
    stroke: { curve: "smooth" },
    dataLabels: { enabled: false },
    tooltip: { shared: true, intersect: false },
    title: { text: "Km per year", align: "left" },
  };
}

/**
 * Build ApexOptions for emissions bar chart
 */
export function buildEmissionsBarChartOptions(
  categories: string[],
  chartHeight: number
): ApexOptions {
  return {
    chart: {
      id: "co2-by-year",
      type: "bar",
      toolbar: { show: true },
      height: chartHeight,
    },
    title: {
      text: "Estimated F1 Logistics CO₂ Emissions",
      align: "left",
      offsetY: 8,
    },
    subtitle: {
      text: "Distance × air cargo factor × 660 t cargo",
      align: "left",
      offsetY: 32,
    },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: "80%",
        borderRadius: 4,
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${val.toFixed(1)} kt`,
    },
    xaxis: {
      categories,
      title: { text: "kt CO₂ (air freight estimate)" },
      labels: {
        formatter: (val) => `${Number(val).toFixed(0)} kt`,
      },
    },
    yaxis: {
      labels: {
        style: { fontSize: "11px" },
      },
    },
    tooltip: {
      y: {
        formatter: (val: number) =>
          `${val.toFixed(2)} kt • ${(val * 1000).toLocaleString()} tonnes`,
      },
    },
    colors: ["#008FFB"],
    fill: {
      type: "solid",
      opacity: 0.9,
    },
    grid: {
      borderColor: "#f1f5f9",
      strokeDashArray: 4,
    },
    theme: { mode: "light" },
  };
}

type ContinentCount = Record<string, number>;

export function buildContinentPieOptions(
  circuits: Circuit[]
): { series: number[]; options: ApexOptions } {
  const counts: ContinentCount = {};

  circuits.forEach(c => {
    if (!c.country) return;
    counts[c.country] = (counts[c.country] ?? 0) + 1;
  });

  const labels = Object.keys(counts);
  const series = labels.map(l => counts[l]);

  const options: ApexOptions = {
    chart: {
      type: "pie",
      width: "100%",
    },
    labels,
    legend: {
      position: "bottom",
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${val.toFixed(1)}%`,
    },
    tooltip: {
      y: {
        formatter: (val: number) => `${val} circuits`,
      },
    },
    stroke: {
      width: 2,
    },
  };

  return { series, options };
}


// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

/**
 * Default configuration presets for common chart types
 */
export const CHART_PRESETS = {
  line: {
    chart: { type: "line" as const, toolbar: { show: true }, zoom: { enabled: true } },
    dataLabels: { enabled: false },
    stroke: { curve: "smooth" as const },
    tooltip: { shared: true, intersect: false },
  },
  
  bar: {
    chart: { type: "bar" as const, toolbar: { show: true } },
    plotOptions: {
      bar: { horizontal: true, barHeight: "80%", borderRadius: 4 },
    },
    dataLabels: { enabled: true },
  },
  
  area: {
    chart: { type: "area" as const, toolbar: { show: true }, zoom: { enabled: true } },
    dataLabels: { enabled: false },
    stroke: { curve: "smooth" as const },
    fill: { type: "gradient" as const, gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.3 } },
  },
} as const;

/**
 * Color palettes for charts
 */
export const CHART_COLORS = {
  primary: ["#008FFB", "#00E396", "#FEB019", "#FF4560", "#775DD0"],
  pastel: ["#B4E5F4", "#C4E5C0", "#FFD6A5", "#FFADAD", "#D4B5E3"],
  dark: ["#1A237E", "#004D40", "#E65100", "#B71C1C", "#4A148C"],
  racing: ["#E10600", "#0090FF", "#00D2BE", "#FFF500", "#FF8700"],
} as const;

/**
 * Common theme configurations
 */
export const CHART_THEMES = {
  light: {
    theme: { mode: "light" as const },
    grid: { borderColor: "#f1f5f9", strokeDashArray: 4 },
  },
  
  dark: {
    theme: { mode: "dark" as const },
    grid: { borderColor: "#334155", strokeDashArray: 4 },
  },
} as const;