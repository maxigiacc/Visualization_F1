import { useEffect, useMemo, useState } from "react";
import Chart from "react-apexcharts";
import { 
  getEmissionFactorsChartData, 
  buildChartAnnotations,
  type CsvChartSeries,
  buildChartOptions
} from "./utils/dataLoader";

export default function ApexCsvRealtimeChart() {
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
    () => buildChartOptions({ series, categories, annotations, chartId: "emission-factors-chart", height: 350 }),
    [series, categories, annotations]
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getEmissionFactorsChartData(
        selectedKeys.length > 0 ? selectedKeys : undefined
      );
      
      setSeries(data.series);
      setCategories(data.categories);
      setAvailableKeys(data.availableKeys);
      
      // If first load, select all keys by default
      if (selectedKeys.length === 0) {
        setSelectedKeys(data.availableKeys);
      }
    } catch (e: any) {
      console.error(e);
      alert("Error loading emission factors: " + (e?.message ?? e));
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

  // Reload when keys change
  useEffect(() => {
    if (selectedKeys.length > 0 && availableKeys.length > 0) {
      loadData();
    }
  }, [selectedKeys]);

  const toggleKey = (k: string) => {
    setSelectedKeys(prev => 
      prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]
    );
  };

  return (
    <div className="p-4">
      <h3 className="mb-2">Emission Factors Chart</h3>
      
      <div className="mb-3">
        <button 
          className="mr-2 px-3 py-1 rounded bg-slate-800 text-white" 
          onClick={loadData} 
          disabled={loading}
        >
          {loading ? "Loading..." : "Reload Data"}
        </button>
      </div>
      
      <div className="mb-4 text-sm">
        <strong>Available metrics:</strong>
        <div className="flex gap-2 mt-2 flex-wrap">
          {availableKeys.length === 0 && (
            <div className="text-gray-600">Loading metrics...</div>
          )}
          {availableKeys.map(k => (
            <label 
              key={k} 
              style={{ cursor: "pointer" }} 
              className="px-2 py-1 border rounded"
            >
              <input 
                type="checkbox" 
                checked={selectedKeys.includes(k)} 
                onChange={() => toggleKey(k)} 
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
    </div>
  );
}