import { useEffect, useMemo, useState } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { getTravelKmPerYear, type TravelKmData } from "./utils/dataLoader";

export default function TravelKmPerYearChart() {
  const [series, setSeries] = useState<TravelKmData>([]);
  const [loading, setLoading] = useState(true);

  const options = useMemo<ApexOptions>(() => ({
    chart: { 
      id: "travel-km-per-year", 
      type: "line", 
      height: 350, 
      zoom: { enabled: true }, 
      toolbar: { show: true } 
    },
    xaxis: { type: "datetime", title: { text: "Year" } },
    yaxis: { title: { text: "Km" } },
    stroke: { curve: "smooth" },
    dataLabels: { enabled: false },
    tooltip: { shared: true, intersect: false },
    title: { text: "Km per year", align: "left" },
  }), []);

  useEffect(() => {
    getTravelKmPerYear()
      .then(setSeries)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;
  
  return <Chart options={options} series={series as any} type="line" height={420} />;
}