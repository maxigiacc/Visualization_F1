import { useEffect, useMemo, useState } from "react";
import Chart from "react-apexcharts";
import { getTravelKmPerYear, type TravelKmData } from "./utils/dataLoader";
import { buildTravelKmChartOptions } from "./utils/chartConfig";

type Props = {
  filterYear?: number | null;
};

export default function TravelKmPerYearChart({ filterYear }: Props) {
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
  
  const filteredSeries = useMemo(() => {
    if (!filterYear || !Number.isFinite(filterYear)) return series;
    return series.map((s) => ({
      ...s,
      data: (s.data || []).filter((d) => {
        const dYear = new Date(d.x ?? 0).getFullYear();
        return dYear === filterYear;
      }),
    }));
  }, [series, filterYear]);

  const hasData = filteredSeries.some((s) => (s.data || []).length > 0);
  if (!hasData) return <div>No travel data</div>;
  
  return <Chart options={options} series={filteredSeries as any} type="line" height={420} />;
}
