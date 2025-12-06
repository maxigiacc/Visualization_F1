import { useEffect, useMemo, useState } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { getEmissionsData, type EmissionsData } from "./utils/dataLoader";

const AVERAGE_CARGO_MASS_TONNES = 50;
const EARLIEST_YEAR = 1950;

export default function BarChartEmissions() {
  const [chartData, setChartData] = useState<EmissionsData>({ 
    categories: [], 
    values: [] 
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEmissionsData(AVERAGE_CARGO_MASS_TONNES, EARLIEST_YEAR)
      .then(setChartData)
      .catch((error) => console.error("Failed to load emission chart data", error))
      .finally(() => setLoading(false));
  }, []);

  const chartHeight = useMemo(
    () => Math.max(520, chartData.categories.length * 14),
    [chartData.categories.length]
  );

  const options = useMemo<ApexOptions>(() => ({
    chart: { id: "co2-by-year", type: "bar", toolbar: { show: true } },
    title: { 
      text: "Estimated F1 Logistics CO₂ Emissions", 
      align: "left", 
      offsetY: 8 
    },
    subtitle: { 
      text: "Distance × air cargo factor × 660 t cargo", 
      align: "left", 
      offsetY: 32 
    },
    plotOptions: { 
      bar: { horizontal: true, barHeight: "80%", borderRadius: 4 } 
    },
    dataLabels: { 
      enabled: true, 
      formatter: (val: number) => `${val.toFixed(1)} kt` 
    },
    xaxis: {
      categories: chartData.categories,
      title: { text: "kt CO₂ (air freight estimate)" },
      labels: { formatter: (val) => `${Number(val).toFixed(0)} kt` },
    },
    yaxis: { labels: { style: { fontSize: "11px" } } },
    tooltip: { 
      y: { 
        formatter: (val: number) => 
          `${val.toFixed(2)} kt • ${(val * 1000).toLocaleString()} tonnes` 
      } 
    },
    colors: ["#008FFB"],
    fill: { type: "solid", opacity: 0.9 },
    grid: { borderColor: "#f1f5f9", strokeDashArray: 4 },
    theme: { mode: "light" },
  }), [chartData.categories]);

  const series = useMemo(
    () => [{ name: "Estimated CO₂", data: chartData.values }], 
    [chartData.values]
  );

  if (loading) return <div>Loading emission data...</div>;
  
  return (
    <Chart 
      options={options} 
      series={series as any} 
      type="bar" 
      height={chartHeight} 
    />
  );
}