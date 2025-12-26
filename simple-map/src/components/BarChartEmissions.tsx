import { useEffect, useMemo, useState } from "react";
import Chart from "react-apexcharts";
import { getEmissionsData} from './utils/dataLoader';
import type { EmissionsData } from './utils/dataLoader';
import { buildEmissionsBarChartOptions } from './utils/chartConfig';


const AVERAGE_CARGO_MASS_TONNES = 50;
const EARLIEST_YEAR = 2000;

type Props = {
  filterYear?: number | null;
};

export default function BarChartEmissions({ filterYear }: Props) {
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
  
  const filteredData = useMemo(() => {
    if (!filterYear || !Number.isFinite(filterYear)) return chartData;
    const idx = chartData.categories.findIndex(
      (c) => parseInt(c, 10) === filterYear
    );
    if (idx === -1) return { categories: [], values: [] };
    return {
      categories: [chartData.categories[idx]],
      values: [chartData.values[idx]],
    };
  }, [chartData, filterYear]);

  const series = useMemo(
    () => [{ name: "Estimated CO₂", data: filteredData.values }],
    [filteredData.values]
  );

  const chartHeight = Math.max(320, filteredData.categories.length * 24);
  const options = buildEmissionsBarChartOptions(filteredData.categories, chartHeight);



  if (loading) return <div>Loading emission data...</div>;
  if (!filteredData.categories.length) return <div>No emission data</div>;
  
  return (
    <Chart 
      options={options} 
      series={series as any} 
      type="bar" 
      height={chartHeight} 
    />
  );
}
