import { useEffect, useMemo, useState } from "react";
import Chart from "react-apexcharts";
import { csv } from "d3-fetch";
import type { ApexOptions } from "apexcharts";
import { fromStringCircuit, type Circuit } from "./models/Circuit";
import { fromStringRace, type Race } from "./models/Race";
import { haversine } from "./utils/utils";

export default function TravelKmPerYearChart() {
  const [series, setSeries] = useState<{ name: string; data: { x: number; y: number }[] }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const options = useMemo<ApexOptions>(() => ({
    chart: { id: "travel-km-per-year", type: "line", height: 350, zoom: { enabled: true }, toolbar: { show: true } },
    xaxis: { type: "datetime", title: { text: "Year" } },
    yaxis: { title: { text: "Km" } },
    stroke: { curve: "smooth" },
    dataLabels: { enabled: false },
    tooltip: { shared: true, intersect: false },
    title: { text: "Km per year", align: "left" },
  }), []);

  useEffect(() => {
    async function loadData() {
  try {
    
    const circuitsCsv = await csv("/circuits.csv");
    const racesCsv = await csv("/races.csv");

    const circuits: Circuit[] = circuitsCsv.map((r) => fromStringCircuit(r));
    const races: Race[] = racesCsv.map((r) => fromStringRace(r));

    const circuitMap: Record<number, { lat: number; lng: number }> = {};
    circuits.forEach((c) => {
      if (!Number.isFinite(c.lat) || !Number.isFinite(c.lng)) return;
      circuitMap[c.circuitId] = { lat: c.lat, lng: c.lng };
    });

    const racesByYear: Record<number, Race[]> = {};
    races.forEach((r) => {
      const y = r.year;
      if (!racesByYear[y]) racesByYear[y] = [];
      racesByYear[y].push(r);
    });

    // Calculate km per year
    const kmPerYear: Record<number, number> = {};
    Object.keys(racesByYear).forEach((yearKey) => {
      const year = parseInt(yearKey, 10);
      const sorted = racesByYear[year].sort((a, b) => a.round - b.round);
      let totalKm = 0;
      for (let i = 1; i < sorted.length; i++) {
        const prev = circuitMap[sorted[i - 1].circuitId];
        const curr = circuitMap[sorted[i].circuitId];
        if (prev && curr) totalKm += haversine(prev.lat, prev.lng, curr.lat, curr.lng);
      }
      kmPerYear[year] = Math.round(totalKm * 100) / 100;
    });

    // Series per ApexCharts (x = timestamp)
    const outSeries = [
      {
        name: "Km Travelled",
        data: Object.keys(kmPerYear)
          .map((y) => parseInt(y, 10))
          .sort((a, b) => a - b)
          .map((y) => ({ x: new Date(y, 0, 1).getTime(), y: kmPerYear[y] })),
      },
    ];

    setSeries(outSeries);
  } catch (e) {
    console.error(e);
  } finally {
    setLoading(false);
  }
}

    loadData();
  }, []);

  if (loading) return <div>Loading...</div>;

  return <Chart options={options} series={series as any} type="line" height={420} />;
}
