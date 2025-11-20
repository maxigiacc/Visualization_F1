import { useEffect, useMemo, useState } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { csv } from "d3-fetch";
import { fromStringCircuit, type Circuit } from "../Circuit";
import { fromStringRace, type Race } from "../Race";

type ChartData = {
  categories: string[];
  values: number[];
};

const AVERAGE_CARGO_MASS_TONNES = 660;
const EARLIEST_YEAR = 1950;

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function BarChartEmissions() {
  const [chartData, setChartData] = useState<ChartData>({ categories: [], values: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [circuitsCsv, racesCsv, factorsCsv] = await Promise.all([
          csv("/circuits.csv"),
          csv("/races.csv"),
          csv("/emission_factors_2000_2025.csv"),
        ]);

        const circuits = circuitsCsv
          .map((row) => fromStringCircuit(row as Record<string, string>))
          .filter(
            (c): c is Circuit => Number.isFinite(c.lat) && Number.isFinite(c.lng),
          );

        const circuitMap: Record<number, { lat: number; lng: number }> = {};
        circuits.forEach((c) => {
          circuitMap[c.circuitId] = { lat: c.lat, lng: c.lng };
        });

        const races = racesCsv.map((row) => fromStringRace(row as Record<string, string>));
        const racesByYear: Record<number, Race[]> = {};
        races.forEach((race) => {
          if (!racesByYear[race.year]) racesByYear[race.year] = [];
          racesByYear[race.year].push(race);
        });

        const kmPerYear: Record<number, number> = {};
        Object.keys(racesByYear).forEach((yearKey) => {
          const year = parseInt(yearKey, 10);
          const sorted = [...racesByYear[year]].sort((a, b) => a.round - b.round);
          let totalKm = 0;
          for (let i = 1; i < sorted.length; i += 1) {
            const prev = circuitMap[sorted[i - 1].circuitId];
            const curr = circuitMap[sorted[i].circuitId];
            if (prev && curr) {
              totalKm += haversine(prev.lat, prev.lng, curr.lat, curr.lng);
            }
          }
          kmPerYear[year] = Math.round(totalKm * 100) / 100;
        });

        const emissionFactors: Record<number, number> = {};
        factorsCsv.forEach((row) => {
          const typedRow = row as Record<string, string>;
          const year = parseInt(typedRow.year ?? "", 10);
          const factor = parseFloat(typedRow["air_factor (CO2_kg/tkm)"] ?? "");
          if (Number.isFinite(year) && Number.isFinite(factor)) {
            emissionFactors[year] = factor;
          }
        });
        const factorYears = Object.keys(emissionFactors)
          .map((y) => parseInt(y, 10))
          .sort((a, b) => a - b);

        const resolveFactor = (year: number) => {
          if (emissionFactors[year]) return emissionFactors[year];
          if (!factorYears.length) return 0;
          if (year <= factorYears[0]) return emissionFactors[factorYears[0]];
          if (year >= factorYears[factorYears.length - 1]) {
            return emissionFactors[factorYears[factorYears.length - 1]];
          }
          for (let i = factorYears.length - 1; i >= 0; i -= 1) {
            const candidateYear = factorYears[i];
            if (candidateYear <= year) return emissionFactors[candidateYear];
          }
          return emissionFactors[factorYears[0]];
        };

        const availableYears = Object.keys(racesByYear).map((y) => parseInt(y, 10));
        const latestYear = availableYears.length
          ? Math.max(...availableYears)
          : EARLIEST_YEAR;

        const categories: string[] = [];
        const values: number[] = [];

        for (let year = EARLIEST_YEAR; year <= latestYear; year += 1) {
          const distanceKm = kmPerYear[year] ?? 0;
          const factorKgPerTkm = resolveFactor(year);
          const emissionsKg = distanceKm * factorKgPerTkm * AVERAGE_CARGO_MASS_TONNES;
          const emissionsKt = emissionsKg / 1_000_000; // kilotonnes of CO2
          categories.push(year.toString());
          values.push(Number(emissionsKt.toFixed(2)));
        }

        setChartData({ categories, values });
      } catch (error) {
        console.error("Failed to load emission chart data", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const chartHeight = useMemo(
    () => Math.max(520, chartData.categories.length * 14),
    [chartData.categories.length],
  );

  const options = useMemo<ApexOptions>(
    () => ({
      chart: { id: "co2-by-year", type: "bar", toolbar: { show: true } },
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
        categories: chartData.categories,
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
    }),
    [chartData.categories],
  );

  const series = useMemo(
    () => [
      {
        name: "Estimated CO₂",
        data: chartData.values,
      },
    ],
    [chartData.values],
  );

  if (loading) return <div>Loading emission data...</div>;

  return <Chart options={options} series={series as any} type="bar" height={chartHeight} />;
}

