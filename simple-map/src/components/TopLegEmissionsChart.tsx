import { useEffect, useMemo, useState } from "react";
import Chart from "react-apexcharts";
import { haversine } from "./utils/utils";
import { getEmissionFactors, getRacesWithCircuitsByYear } from "./utils/dataLoader";

type LegEmission = {
  label: string;
  fromName: string;
  toName: string;
  fromCountry: string;
  toCountry: string;
  distanceKm: number;
  emissionKt: number;
};

type Props = {
  filterYear?: number | null;
  cargoMassTonnes?: number;
  maxLegs?: number;
};

const DEFAULT_CARGO_MASS = 50;
const DEFAULT_MAX_LEGS = 8;

export default function TopLegEmissionsChart({
  filterYear,
  cargoMassTonnes = DEFAULT_CARGO_MASS,
  maxLegs = DEFAULT_MAX_LEGS,
}: Props) {
  const [legs, setLegs] = useState<LegEmission[]>([]);
  const [yearUsed, setYearUsed] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const year = Number.isFinite(filterYear) ? Number(filterYear) : null;
    if (!year) {
      setLegs([]);
      setYearUsed(null);
      return;
    }

    setLoading(true);
    setError(null);

    Promise.all([
      getRacesWithCircuitsByYear(year),
      getEmissionFactors(),
    ])
      .then(([races, emissionFactors]) => {
        if (!races || races.length === 0) {
          setLegs([]);
          setYearUsed(year);
          return;
        }

        const factorYears = Array.from(emissionFactors.keys()).sort((a, b) => a - b);
        const resolveFactor = (y: number) => {
          if (emissionFactors.has(y)) return emissionFactors.get(y)!;
          if (!factorYears.length) return 0;
          if (y <= factorYears[0]) return emissionFactors.get(factorYears[0])!;
          if (y >= factorYears[factorYears.length - 1]) {
            return emissionFactors.get(factorYears[factorYears.length - 1])!;
          }
          for (let i = factorYears.length - 1; i >= 0; i--) {
            if (factorYears[i] <= y) return emissionFactors.get(factorYears[i])!;
          }
          return emissionFactors.get(factorYears[0])!;
        };

        const factorKgPerTkm = resolveFactor(year);

        const sorted = [...races].sort((a, b) => a.round - b.round);
        const legsWithEmission: LegEmission[] = [];
        for (let i = 1; i < sorted.length; i++) {
          const prev = sorted[i - 1];
          const curr = sorted[i];
          const distanceKm = haversine(
            prev.circuit.lat,
            prev.circuit.lng,
            curr.circuit.lat,
            curr.circuit.lng
          );
          const emissionKg = distanceKm * factorKgPerTkm * cargoMassTonnes;
          const emissionKt = emissionKg / 1_000_000;
          legsWithEmission.push({
            label: `${prev.circuit.country} → ${curr.circuit.country}`,
            fromName: prev.circuit.name,
            toName: curr.circuit.name,
            fromCountry: prev.circuit.country,
            toCountry: curr.circuit.country,
            distanceKm: Math.round(distanceKm),
            emissionKt: Math.round(emissionKt * 1000) / 1000,
          });
        }

        legsWithEmission.sort((a, b) => b.emissionKt - a.emissionKt);
        setLegs(legsWithEmission.slice(0, maxLegs));
        setYearUsed(year);
      })
      .catch((e) => {
        console.error("Failed to compute leg emissions", e);
        setError("Failed to load leg emissions");
      })
      .finally(() => setLoading(false));
  }, [filterYear, cargoMassTonnes, maxLegs]);

  const series = useMemo(
    () => [{ name: "kt CO₂ (estimate)", data: legs.map((l) => l.emissionKt) }],
    [legs]
  );

  const options = useMemo(
    () => ({
      chart: { type: "bar", height: 360, toolbar: { show: true } },
      plotOptions: { bar: { horizontal: true, borderRadius: 3, barHeight: "70%" } },
      xaxis: {
        categories: legs.map((l) => l.label),
        title: { text: "kt CO₂ per leg" },
        min: 0,
        tickAmount: 4,
        labels: {
          formatter: (val: string) => {
            const num = Number(val);
            if (Number.isNaN(num)) return val;
            return num.toFixed(2).replace(/\.?0+$/, "");
          },
        },
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number, { dataPointIndex }: any) => {
          const d = legs[dataPointIndex];
          return `${val.toFixed(3)} kt (${d?.distanceKm ?? 0} km)`;
        },
      },
      tooltip: {
        y: {
          formatter: (val: number, { dataPointIndex }: any) => {
            const d = legs[dataPointIndex];
            return `${val.toFixed(4)} kt • ${d?.distanceKm ?? 0} km`;
          },
        },
        x: {
          formatter: (_val: any, { dataPointIndex }: any) => {
            const d = legs[dataPointIndex];
            if (!d) return "";
            return `${d.fromName} (${d.fromCountry}) → ${d.toName} (${d.toCountry})`;
          },
        },
      },
      title: {
        text: yearUsed ? `Top emitting legs — ${yearUsed}` : "Top emitting legs",
        align: "left",
      },
      grid: { xaxis: { lines: { show: true } } },
    }),
    [legs, yearUsed]
  );

  if (!Number.isFinite(filterYear)) {
    return <div>Select a year to see per-leg emissions.</div>;
  }

  if (loading) return <div>Loading leg emissions...</div>;
  if (error) return <div>{error}</div>;
  if (!legs.length) return <div>No legs found for this season.</div>;

  return <Chart options={options as any} series={series as any} type="bar" height={400} />;
}
