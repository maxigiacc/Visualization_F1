import { useEffect, useMemo, useState } from "react";
import Chart from "react-apexcharts";
import type { CsvChartSeries } from './utils/dataLoader';
import { getEmissionFactorsChartData } from './utils/dataLoader';
import { 
  buildChartAnnotations, 
  buildEmissionFactorsChartOptions 
} from './utils/chartConfig';


export default function ApexCsvRealtimeChart() {
  // all series
  const [fullSeries, setFullSeries] = useState<CsvChartSeries[]>([]);
  // effective series to show
  const [series, setSeries] = useState<CsvChartSeries[]>([]);
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const annotations = useMemo(
    () => buildChartAnnotations(series), 
    [series]
  );

  const options = useMemo(
    () => buildEmissionFactorsChartOptions({ series, categories, annotations, chartId: "emission-factors-chart", height: 350 }),
    [series, categories, annotations]
  );

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
              <span style={{ marginLeft: 6 }}>{k}</span>
            </label>
          ))}
        </div>
      </div>
      
      <div id="chart">
        <Chart
          options={options}
          series={series as any}
          type="line"
          height={350}
        />
      </div>
    </>
  );
}
