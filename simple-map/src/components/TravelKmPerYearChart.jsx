import React, { useEffect, useState, useMemo } from "react";
import Chart from "react-apexcharts";
import Papa from "papaparse";

// formula Haversine per km
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function TravelKmPerYearChart() {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);

  const options = useMemo(() => ({
    chart: { id: "travel-km-per-year", type: "line", height: 350, zoom: { enabled: true }, toolbar: { show: true } },
    xaxis: { type: "datetime", title: { text: "Year" } },
    yaxis: { title: { text: "Km" } },
    stroke: { curve: "smooth" },
    dataLabels: { enabled: false },
    tooltip: { shared: true, intersect: false },
    title: { text: "Km per year", align: "left" },
  }), []);

  useEffect(() => {
    async function loadData() {
      try {
        const circuitsRes = await fetch("/circuits.csv");
        const circuitsText = await circuitsRes.text();
        const circuits = Papa.parse(circuitsText, { header: true, skipEmptyLines: true }).data;
        const circuitMap = {};
        circuits.forEach(c => {
          circuitMap[c.circuitId] = { lat: parseFloat(c.lat), lng: parseFloat(c.lng) };
        });

        const racesRes = await fetch("/races.csv");
        const racesText = await racesRes.text();
        const races = Papa.parse(racesText, { header: true, skipEmptyLines: true }).data;

        // Raggruppa gare per anno
        const racesByYear = {};
        races.forEach(r => {
          const y = r.year;
          if (!racesByYear[y]) racesByYear[y] = [];
          racesByYear[y].push(r);
        });

        // Calcola km per anno
        const kmPerYear = {};
        Object.keys(racesByYear).forEach(year => {
          const sorted = racesByYear[year].sort((a,b) => parseInt(a.round)-parseInt(b.round));
          let totalKm = 0;
          for (let i=1; i<sorted.length; i++) {
            const prev = circuitMap[sorted[i-1].circuitId];
            const curr = circuitMap[sorted[i].circuitId];
            if (prev && curr) totalKm += haversine(prev.lat, prev.lng, curr.lat, curr.lng);
          }
          kmPerYear[year] = Math.round(totalKm*100)/100; // arrotondato a 2 decimali
        });

        const outSeries = [{
          name: "Km Travelled",
          data: Object.keys(kmPerYear).sort((a,b)=>a-b).map(y => ({ x: new Date(parseInt(y),0,1).getTime(), y: kmPerYear[y] }))
        }];

        setSeries(outSeries);
      } catch(e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) return <div>Loading...</div>;

  return <Chart options={options} series={series} type="line" height={420} />;
}
