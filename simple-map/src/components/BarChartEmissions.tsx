import { useEffect, useMemo, useState } from "react";
import Chart from "react-apexcharts";
import { getEmissionsData} from './utils/dataLoader';
import type { EmissionsData } from './utils/dataLoader';
import { buildEmissionsBarChartOptions } from './utils/chartConfig';


const AVERAGE_CARGO_MASS_TONNES = 50;
const EARLIEST_YEAR = 2000;

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
  
  const series = useMemo(
    () => [{ name: "Estimated CO₂", data: chartData.values }], 
    [chartData.values]
  );

  const chartHeight = Math.max(520, chartData.categories.length * 14);
  const options = buildEmissionsBarChartOptions(chartData.categories, chartHeight);



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