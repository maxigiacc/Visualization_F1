import { useEffect, useMemo, useState } from "react";
import Chart from "react-apexcharts";
import type { CsvChartSeries } from './utils/dataLoader';
import { getEmissionFactorsChartData } from './utils/dataLoader';
import {
  buildEmissionFactorsChartOptions 
} from './utils/chartConfig';


type Props = {
  filterYear?: number | null;
};

export default function ApexCsvRealtimeChart({ filterYear }: Props) {
  const formatLabel = (key: string) => key.replace(/_/g, " ");

  // all series
  const [fullSeries, setFullSeries] = useState<CsvChartSeries[]>([]);
  // effective series to show
  const [series, setSeries] = useState<CsvChartSeries[]>([]);
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const displaySeries = useMemo(
    () => series.map((s) => ({ ...s, name: formatLabel(s.name) })),
    [series]
  );

  const filteredDisplaySeries = useMemo(() => {
    if (!filterYear || !Number.isFinite(filterYear)) {
      return displaySeries;
    }
    return displaySeries.map((s) => ({
      ...s,
      data: (s.data || []).filter((d) => {
        const dYear = d?.x ? new Date(d.x).getFullYear() : NaN;
        return dYear === filterYear;
      }),
    }));
  }, [displaySeries, filterYear]);

  const options = useMemo(() => {
    const filteredCategories = filterYear && Number.isFinite(filterYear)
      ? categories.filter((c) => parseInt(String(c), 10) === filterYear)
      : categories;

    return buildEmissionFactorsChartOptions({ 
      series: filteredDisplaySeries, 
      categories: filteredCategories, 
      chartId: "emission-factors-chart", 
      height: 350 
    });
  }, [filteredDisplaySeries, categories, filterYear]);

  // Initial load
  useEffect(() => {
    setLoading(true);
    getEmissionFactorsChartData()
      .then((data) => {
        setFullSeries(data.series);          
        setCategories(data.categories);
        setAvailableKeys(data.availableKeys);
        setSelectedKeys(data.availableKeys); 
        setSeries(data.series);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Update series when selectedKeys changes
  useEffect(() => {
    if (!fullSeries || fullSeries.length === 0) return;

    // No selection: clear series
    if (!selectedKeys || selectedKeys.length === 0) {
      setSeries([]);
      return;
    }

    const filtered = fullSeries.filter(s => selectedKeys.includes(s.name));
    setSeries(filtered);
  }, [selectedKeys, fullSeries]);

  const toggleKey = (k: string) => {
    setSelectedKeys(prev => 
      prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]
    );
  };

  return (
    <>
      <div className="p-4">
        <h3 className="mb-2">Emission Factors Chart</h3>

        <div className="flex gap-2 mt-2 flex-wrap items-center">
          {availableKeys.length === 0 && (
            <div className="text-gray-600">Loading metrics...</div>
          )}

          {loading && availableKeys.length > 0 && (
            <div className="text-sm text-gray-700 mr-2">Reloading metrics…</div>
          )}

          {availableKeys.map(k => (
            <label 
              key={k} 
              style={{ cursor: loading ? "not-allowed" : "pointer" }} 
              className={`px-2 py-1 border rounded ${loading ? "opacity-60" : ""}`}
            >
              <input 
                type="checkbox" 
                checked={selectedKeys.includes(k)} 
                onChange={() => toggleKey(k)} 
                disabled={loading}
              />{" "}
              <span style={{ marginLeft: 6 }}>{formatLabel(k)}</span>
            </label>
          ))}
        </div>
      </div>
      
      <div id="chart">
        <Chart
          options={options}
          series={filteredDisplaySeries as any}
          type="line"
          height={350}
        />
      </div>
    </>
  );
}
