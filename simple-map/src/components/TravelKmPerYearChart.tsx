import { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import { getTravelKmPerYear, type TravelKmData } from "./utils/dataLoader";
import { buildTravelKmChartOptions } from "./utils/chartConfig";

export default function TravelKmPerYearChart() {
  const [series, setSeries] = useState<TravelKmData>([]);
  const [loading, setLoading] = useState(true);

  const options = buildTravelKmChartOptions();

  useEffect(() => {
    getTravelKmPerYear()
      .then(setSeries)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;
  
  return <Chart options={options} series={series as any} type="line" height={420} />;
}