import { useEffect, useMemo, useState } from "react";
import Chart from "react-apexcharts";
import { haversine } from "./utils/utils";
import {
    fetchAndAutoParseCsv,
    getEmissionFactorsForYear,
    getRacesWithCircuitsByYear,
} from "./utils/dataLoader";

const DEFAULT_CARGO_MASS = 50;

type Props = {
    filterYear?: number | null;
    cargoMassTonnes?: number;
};

type SplitTotals = {
    truckKm: number;
    flightKm: number;
    truckCo2Kt: number;
    flightCo2Kt: number;
};

export default function SeasonFootprintSplitChart({
    filterYear,
    cargoMassTonnes = DEFAULT_CARGO_MASS,
}: Props) {
    const [totals, setTotals] = useState<SplitTotals | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const year = Number.isFinite(filterYear) ? Number(filterYear) : null;
        if (!year) {
            setTotals(null);
            setError(null);
            return;
        }

        setLoading(true);
        setError(null);

        Promise.all([
            getRacesWithCircuitsByYear(year),
            fetchAndAutoParseCsv("/distances.csv"),
            getEmissionFactorsForYear(year),
        ])
            .then(([races, rows, factors]) => {
                if (!races.length) {
                    setTotals(null);
                    return;
                }

                const distanceMap = new Map<string, { car: number; plane: number }>();
                for (const row of rows as any[]) {
                    const rowYear = Number(row.Year ?? row.year);
                    if (!Number.isFinite(rowYear) || rowYear !== year) continue;
                    const fromId = Number(row.circuitIdFrom ?? row.circuitidfrom);
                    const toId = Number(row.circuitIdTo ?? row.circuitidto);
                    if (!Number.isFinite(fromId) || !Number.isFinite(toId)) continue;
                    const key = fromId < toId ? `${fromId}-${toId}` : `${toId}-${fromId}`;
                    const car = Number(row.Car ?? row.car);
                    const plane = Number(row.Plane ?? row.plane);
                    distanceMap.set(key, {
                        car: Number.isFinite(car) ? car : 0,
                        plane: Number.isFinite(plane) ? plane : 0,
                    });
                }

                const sorted = [...races].sort((a, b) => a.round - b.round);
                let truckKm = 0;
                let flightKm = 0;

                for (let i = 1; i < sorted.length; i++) {
                    const prev = sorted[i - 1];
                    const curr = sorted[i];
                    const fromId = prev.circuit.circuitId;
                    const toId = curr.circuit.circuitId;
                    const key = fromId < toId ? `${fromId}-${toId}` : `${toId}-${fromId}`;
                    const entry = distanceMap.get(key);

                    if (entry) {
                        truckKm += entry.car;
                        flightKm += entry.plane;
                    } else {
                        const distanceKm = haversine(
                            prev.circuit.lat,
                            prev.circuit.lng,
                            curr.circuit.lat,
                            curr.circuit.lng,
                        );
                        flightKm += distanceKm;
                    }
                }

                const truckKg = truckKm * factors.truckFactor * cargoMassTonnes;
                const flightKg = flightKm * factors.airFactor * cargoMassTonnes;

                setTotals({
                    truckKm,
                    flightKm,
                    truckCo2Kt: truckKg / 1_000_000,
                    flightCo2Kt: flightKg / 1_000_000,
                });
            })
            .catch((e) => {
                console.error("Failed to load footprint split", e);
                setError("Failed to load footprint split.");
            })
            .finally(() => setLoading(false));
    }, [filterYear, cargoMassTonnes]);

    const series = useMemo(() => {
        if (!totals) return [];
        return [
            {
                name: "CO2 (kt)",
                data: [Number(totals.truckCo2Kt.toFixed(3)), Number(totals.flightCo2Kt.toFixed(3))],
            },
        ];
    }, [totals]);

    const options = useMemo(
        () => ({
            chart: { type: "bar", height: 320, toolbar: { show: true } },
            plotOptions: { bar: { horizontal: false, borderRadius: 6, columnWidth: "70%" } },
            xaxis: { categories: ["Truck", "Flight"] },
            yaxis: { min: 0, title: { text: "kt CO2" } },
            dataLabels: {
                enabled: true,
                formatter: (val: number, { dataPointIndex }: any) => {
                    if (!totals) return "";
                    const km = dataPointIndex === 0 ? totals.truckKm : totals.flightKm;
                    return `${val.toFixed(3)} kt (${Math.round(km)} km)`;
                },
            },
            tooltip: {
                y: {
                    formatter: (val: number, { dataPointIndex }: any) => {
                        if (!totals) return "";
                        const km = dataPointIndex === 0 ? totals.truckKm : totals.flightKm;
                        return `${val.toFixed(4)} kt • ${Math.round(km)} km`;
                    },
                },
            },
            title: { text: "Season footprint split", align: "left" },
            grid: { yaxis: { lines: { show: true } } },
        }),
        [totals],
    );

    if (!Number.isFinite(filterYear)) {
        return <div>Select a year to see truck vs flight split.</div>;
    }

    if (loading) return <div>Loading footprint split...</div>;
    if (error) return <div>{error}</div>;
    if (!totals) return <div>No data for this season.</div>;

    return <Chart options={options as any} series={series as any} type="bar" height={320} />;
}
