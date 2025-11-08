import React, { useEffect, useMemo, useState, useRef } from "react";
import Chart from "react-apexcharts";
import Papa from "papaparse";

export default function ApexCsvRealtimeChart({ csvUrl = "" }) {
  const [rawRows, setRawRows] = useState([]);
  const [series, setSeries] = useState([]); // apex series array
  const [availableKeys, setAvailableKeys] = useState([]); // numeric columns except year
  const [selectedKeys, setSelectedKeys] = useState([]); // keys user wants to display
  const [loading, setLoading] = useState(false);
  


const options = useMemo(() => ({
  chart: {
    id: "areachart-2",
    height: 350,
    type: "line",
    toolbar: { show: true },
    zoom: { enabled: true },
  },
  annotations: {
    // placeholder — verrà sovrascritto dinamicamente da buildAnnotations()
    yaxis: [],
    xaxis: [],
    points: []
  },
  dataLabels: { enabled: false },
  stroke: { curve: "straight" }, // 'straight' come richiesto
  grid: {
    padding: { right: 30, left: 20 }
  },
  title: { text: "Line with Annotations", align: "left" },
  xaxis: { type: "datetime" },
  tooltip: { shared: true, intersect: false },
  legend: { position: "top" }
}), []);

  function buildAnnotationsFromSeries(outSeries) {

  const annotations = { yaxis: [], xaxis: [], points: [] };

  if (!outSeries || outSeries.length === 0) return annotations;

  const first = outSeries[0];
  // find first valid point and max
  const validPoints = first.data.filter(d => d && d.y !== null);
  if (validPoints.length === 0) return annotations;

  const firstPoint = validPoints[3];
  const secondPoint = validPoints[6];
  const maxY = Math.max(...validPoints.map(p => p.y));

  // yaxis simple support line (example: 0.9 * maxY)
  annotations.yaxis.push({
    y: Math.round((0.9 * maxY) * 100) / 100,
    borderColor: '#00E396',
    label: {
      borderColor: '#00E396',
      style: { color: '#fff', background: '#00E396' },
      text: 'Support'
    }
  });

  // y-axis range highlight (e.g. maxY..1.05*maxY)
  annotations.yaxis.push({
    y: Math.round(maxY * 0.98 * 100) / 100,
    y2: Math.round(maxY * 1.02 * 100) / 100,
    borderColor: '#000',
    fillColor: '#FEB019',
    opacity: 0.2,
    label: {
      borderColor: '#333',
      style: { fontSize: '10px', color: '#333', background: '#FEB019' },
      text: 'Y-range'
    }
  });

  // xaxis range example: mark a small window around the first point's year
  annotations.xaxis.push({
    x: secondPoint.x,
    strokeDashArray: 0,
    borderColor: '#775DD0',
    label: {
      borderColor: '#775DD0',
      style: { color: '#fff', background: '#775DD0' },
      text: 'Anno Test'
    }
  });

  // Add a point annotation on the first valid point
  annotations.points.push({
    x: firstPoint.x,
    y: firstPoint.y,
    marker: {
      size: 8,
      fillColor: '#fff',
      strokeColor: 'red',
      radius: 2,
      cssClass: 'apexcharts-custom-class'
    },
    label: {
      borderColor: '#FF4560',
      offsetY: 0,
      style: { color: '#fff', background: '#FF4560' },
      text: 'Point Annotation'
    }
  });

  return annotations;
}


  // parse CSV and return array of objects (header -> value)
  function parseCsvTextGeneric(text) {
    const parsed = Papa.parse(text.trim(), { header: true, skipEmptyLines: true });
    return parsed.data;
  }

  // replace previous buildSeriesFromRows
  function buildSeriesFromRows(rows, keysToShow) {
    if (!rows || rows.length === 0) return { outSeries: [], categories: [] };

    // detect year column
    const yearKey = Object.keys(rows[0]).find(k => k.toLowerCase().includes("year")) || Object.keys(rows[0])[0];

    // Build x values as timestamps (use Jan 1st of year)
    const xValues = rows.map(r => {
      const yraw = String(r[yearKey]).trim();
      const yearNum = parseInt(yraw, 10);
      if (isNaN(yearNum)) {
        // try parse as date fallback
        const dt = new Date(yraw);
        return isNaN(dt.getTime()) ? null : dt.getTime();
      }
      return new Date(yearNum, 0, 1).getTime();
    });

    const outSeries = keysToShow.map(key => {
      const data = rows.map((r, idx) => {
        const raw = r[key];
        const y = raw === undefined || raw === "" ? null : Number(String(raw).replace(",", "."));
        return { x: xValues[idx], y: isNaN(y) ? null : y };
      });
      return { name: key, data };
    });

    // categories still can be years as strings if needed
    const categories = rows.map(r => String(r[yearKey]).trim());

    return { outSeries, categories };
}


  // Load CSV from public folder or provided URL
  async function loadFromCsv(url = csvUrl) {
    try {
      setLoading(true);
      const res = await fetch(url, { cache: "no-cache" });
      if (!res.ok) throw new Error("Failed to fetch CSV: " + res.status);
      const text = await res.text();
      const rows = parseCsvTextGeneric(text);
      if (!rows || rows.length === 0) throw new Error("CSV vuoto o non valido");
      setRawRows(rows);

      // detect numeric columns (exclude year)
      const keys = Object.keys(rows[0]);
      const yearKey = keys.find(k => k.toLowerCase().includes("year")) || keys[0];
      const numericKeys = keys.filter(k => k !== yearKey).filter(k => {
        // quick numeric test on first few rows
        for (let i = 0; i < Math.min(rows.length, 5); i++) {
          const v = rows[i][k];
          if (v === undefined || v === "") return false;
          const n = Number(String(v).replace(",", "."));
          if (!isNaN(n)) return true;
        }
        return false;
      });

      setAvailableKeys(numericKeys);
      // default: select all numeric keys
      setSelectedKeys(numericKeys);
      const { outSeries, categories } = buildSeriesFromRows(rows, numericKeys);
      setSeries(outSeries);
      // set x-axis categories by updating options via state (we will recreate options with categories below)
      // but easier: set chart categories in a wrapper prop
      setXCategories(categories);
    } catch (e) {
      console.error(e);
      alert("Errore nel caricamento CSV: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  // keep x-axis categories in state so we can pass them to Chart options
  const [xCategories, setXCategories] = useState([]);
  const [annotations, setAnnotations] = useState({ yaxis: [], xaxis: [], points: [] });

  useEffect(() => {
  if (!rawRows || rawRows.length === 0) return;
  const { outSeries, categories } = buildSeriesFromRows(rawRows, selectedKeys);
  setSeries(outSeries);
  setXCategories(categories);

  // build annotations from the first series (or from all series if you prefer)
  const anns = buildAnnotationsFromSeries(outSeries);
  setAnnotations(anns);
}, [selectedKeys, rawRows]);

  // toggle selection helper
  function toggleKey(k) {
    setSelectedKeys(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);
  }

  return (
    <div className="p-4">
      <h3 className="mb-2">LineChart</h3>

      <div className="mb-3">
        <button className="mr-2 px-3 py-1 rounded bg-slate-800 text-white" onClick={() => loadFromCsv()} disabled={loading}>
          Load CSV from {csvUrl}
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
            options={{
              ...options,
              annotations: annotations,
              xaxis: { ...options.xaxis, type: "datetime" } // assicurati di usare datetime
            }}
            series={series}
            type="line"
            height={350}
        />
      </div>

      <div className="mt-3 text-xs text-gray-500">
        Note: Null values ​​are ignored. The categories on the X-axis are the values from <code>year</code> column.
      </div>
    </div>
  );
}
