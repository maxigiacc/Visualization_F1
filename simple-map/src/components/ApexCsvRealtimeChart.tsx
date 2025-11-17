import { useEffect, useMemo, useState } from "react";
import Chart from "react-apexcharts";
import { csv } from "d3-fetch";
import type { ApexOptions } from "apexcharts";
import type { DSVRowString } from "d3-dsv";

type Row = DSVRowString<string>;
type Point = { x: number | null; y: number | null };
type SeriesItem = { name: string; data: Point[] };
type Annotations = {
  yaxis: any[];
  xaxis: any[];
  points: any[];
};

interface Props {
  csvUrl?: string;
}

export default function ApexCsvRealtimeChart({ csvUrl = "" }: Props) {
  const [rawRows, setRawRows] = useState<Row[]>([]);
  const [series, setSeries] = useState<SeriesItem[]>([]);
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [xCategories, setXCategories] = useState<string[]>([]);
  const [annotations, setAnnotations] = useState<Annotations>({ yaxis: [], xaxis: [], points: [] });

  const options = useMemo<ApexOptions>(() => ({
    chart: { id: "areachart-2", height: 350, type: "line", toolbar: { show: true }, zoom: { enabled: true } },
    annotations: { yaxis: [], xaxis: [], points: [] },
    dataLabels: { enabled: false },
    stroke: { curve: "straight" },
    grid: { padding: { right: 30, left: 20 } },
    title: { text: "Line with Annotations", align: "left" },
    xaxis: { type: "datetime" },
    tooltip: { shared: true, intersect: false },
    legend: { position: "top" },
  }), []);

  function buildAnnotationsFromSeries(outSeries: SeriesItem[]): Annotations {
    const anns: Annotations = { yaxis: [], xaxis: [], points: [] };
    if (!outSeries || outSeries.length === 0) return anns;
    const first = outSeries[0];
    const validPoints = first.data.filter(d => d && d.y !== null);
    if (validPoints.length === 0) return anns;

    const firstPoint = validPoints[Math.min(3, validPoints.length - 1)];
    const secondPoint = validPoints[Math.min(6, validPoints.length - 1)];
    const maxY = Math.max(...validPoints.map(p => (p.y as number)));

    anns.yaxis.push({
      y: Math.round((0.9 * maxY) * 100) / 100,
      borderColor: '#00E396',
      label: { borderColor: '#00E396', style: { color: '#fff', background: '#00E396' }, text: 'Support' }
    });

    anns.yaxis.push({
      y: Math.round(maxY * 0.98 * 100) / 100,
      y2: Math.round(maxY * 1.02 * 100) / 100,
      borderColor: '#000',
      fillColor: '#FEB019',
      opacity: 0.2,
      label: { borderColor: '#333', style: { fontSize: '10px', color: '#333', background: '#FEB019' }, text: 'Y-range' }
    });

    anns.xaxis.push({
      x: secondPoint.x,
      strokeDashArray: 0,
      borderColor: '#775DD0',
      label: { borderColor: '#775DD0', style: { color: '#fff', background: '#775DD0' }, text: 'Anno Test' }
    });

    anns.points.push({
      x: firstPoint.x,
      y: firstPoint.y,
      marker: { size: 8, fillColor: '#fff', strokeColor: 'red', radius: 2 },
      label: { borderColor: '#FF4560', offsetY: 0, style: { color: '#fff', background: '#FF4560' }, text: 'Point Annotation' }
    });

    return anns;
  }

  function buildSeriesFromRows(rows: Row[], keysToShow: string[]) {
    if (!rows || rows.length === 0) return { outSeries: [] as SeriesItem[], categories: [] as string[] };

    const firstRowKeys = Object.keys(rows[0]);
    const yearKey = firstRowKeys.find(k => k.toLowerCase().includes("year")) || firstRowKeys[0];

    const xValues = rows.map(r => {
      const raw = String(r[yearKey] ?? "").trim();
      const yearNum = parseInt(raw, 10);
      if (isNaN(yearNum)) {
        const dt = new Date(raw);
        return isNaN(dt.getTime()) ? null : dt.getTime();
      }
      return new Date(yearNum, 0, 1).getTime();
    });

    const outSeries = keysToShow.map(key => {
      const data: Point[] = rows.map((r, idx) => {
        const raw = r[key];
        const y = raw === undefined || raw === "" ? null : Number(String(raw).replace(",", "."));
        return { x: xValues[idx], y: isNaN(y as number) ? null : (y as number) };
      });
      return { name: key, data };
    });

    const categories = rows.map(r => String(r[yearKey] ?? "").trim());

    return { outSeries, categories };
  }

  async function loadFromCsv(url = csvUrl) {
    try {
      setLoading(true);
      const rows = (await csv(url)) as unknown as Row[];
      if (!rows || rows.length === 0) throw new Error("CSV empty or invalid");
      setRawRows(rows);

      const keys = Object.keys(rows[0]);
      const yearKey = keys.find(k => k.toLowerCase().includes("year")) || keys[0];
      const numericKeys = keys.filter(k => k !== yearKey).filter(k => {
        for (let i = 0; i < Math.min(rows.length, 5); i++) {
          const v = rows[i][k];
          if (v === undefined || v === "") return false;
          const n = Number(String(v).replace(",", "."));
          if (!isNaN(n)) return true;
        }
        return false;
      });

      setAvailableKeys(numericKeys);
      setSelectedKeys(numericKeys);
      const { outSeries, categories } = buildSeriesFromRows(rows, numericKeys);
      setSeries(outSeries);
      setXCategories(categories);
    } catch (e: any) {
      console.error(e);
      alert("Errore nel caricamento CSV: " + (e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!rawRows || rawRows.length === 0) return;
    const { outSeries, categories } = buildSeriesFromRows(rawRows, selectedKeys);
    setSeries(outSeries);
    setXCategories(categories);
    const anns = buildAnnotationsFromSeries(outSeries);
    setAnnotations(anns);
  }, [selectedKeys, rawRows]);

  function toggleKey(k: string) {
    setSelectedKeys(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);
  }

  return (
    <div className="p-4">
      <h3 className="mb-2">LineChart</h3>

      <div className="mb-3">
        <button className="mr-2 px-3 py-1 rounded bg-slate-800 text-white" onClick={() => loadFromCsv()} disabled={loading}>
          Load CSV from {csvUrl || "public path"}
        </button>
      </div>

      <div className="mb-4 text-sm">
        <strong>Available metrics:</strong>
        <div className="flex gap-2 mt-2 flex-wrap">
          {availableKeys.length === 0 && <div className="text-gray-600">No Metrics selected</div>}
          {availableKeys.map(k => (
            <label key={k} style={{ cursor: "pointer" }} className="px-2 py-1 border rounded">
              <input type="checkbox" checked={selectedKeys.includes(k)} onChange={() => toggleKey(k)} />{" "}
              <span style={{ marginLeft: 6 }}>{k}</span>
            </label>
          ))}
        </div>
      </div>

      <div id="chart">
        <Chart
          options={{ ...options, annotations, xaxis: { ...options.xaxis, type: "datetime", categories: xCategories } }}
          series={series as any}
          type="line"
          height={350}
        />
      </div>
    </div>
  );
}
