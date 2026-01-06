import { useEffect, useMemo, useState } from "react";
import Chart from "react-apexcharts";
import { getCircuitMap, getCountries, getRacesByYear } from "./utils/dataLoader";
import type { Country } from "./models/Country";

const COUNTRY_ALIASES: Record<string, string> = {
    uk: "united kingdom",
    usa: "united states of america",
    "u.s.a": "united states of america",
    uae: "united arab emirates",
    korea: "south korea",
};

const normalizeCountryKey = (name: string): string =>
    name
        .toLowerCase()
        .replace(/\./g, "")
        .replace(/\s+/g, " ")
        .trim();

type JumpDatum = {
    year: number;
    jumps: number;
};

export default function IntercontinentalJumpsChart() {
    const [series, setSeries] = useState<JumpDatum[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);

        Promise.all([getRacesByYear(), getCircuitMap(), getCountries()])
            .then(([racesByYear, circuitMap, countries]) => {
                const continentMap = new Map<string, string>();
                countries.forEach((country: Country) => {
                    continentMap.set(
                        normalizeCountryKey(country.name),
                        country.continentId,
                    );
                });

                const data: JumpDatum[] = [];

                for (const [year, races] of racesByYear.entries()) {
                    if (year < 2000) continue;
                    const sorted = [...races].sort((a, b) => a.round - b.round);
                    let jumps = 0;
                    let lastContinent: string | null = null;

                    for (const race of sorted) {
                        const circuit = circuitMap.get(Number(race.circuitId));
                        if (!circuit) continue;
                        const raw = normalizeCountryKey(circuit.country);
                        const key = COUNTRY_ALIASES[raw] ?? raw;
                        const continent = continentMap.get(key) ?? "Unknown";
                        if (lastContinent && continent !== lastContinent) {
                            jumps += 1;
                        }
                        lastContinent = continent;
                    }

                    if (Number.isFinite(year)) {
                        data.push({ year, jumps });
                    }
                }

                data.sort((a, b) => a.year - b.year);
                setSeries(data);
            })
            .catch((e) => {
                console.error("Failed to build intercontinental jumps", e);
                setError("Failed to load intercontinental jumps.");
            })
            .finally(() => setLoading(false));
    }, []);

    const chartSeries = useMemo(
        () => [
            {
                name: "Intercontinental jumps",
                data: series.map((d) => d.jumps),
            },
        ],
        [series],
    );

    const options = useMemo(
        () => ({
            chart: { type: "bar", height: 340, toolbar: { show: true } },
            colors: ["#0ea5e9"],
            plotOptions: { bar: { borderRadius: 6, columnWidth: "55%" } },
            xaxis: {
                categories: series.map((d) => d.year),
                title: { text: "Season" },
                labels: { rotate: -45 },
            },
            yaxis: { min: 0, title: { text: "Continent switches" } },
            tooltip: {
                y: {
                    formatter: (val: number) => `${Math.round(val)} switches`,
                },
            },
            dataLabels: {
                enabled: true,
                formatter: (val: number) => String(Math.round(val)),
                style: { colors: ["#0f172a"], fontWeight: 700 },
            },
            title: { text: "Intercontinental jumps per season", align: "left" },
            grid: { yaxis: { lines: { show: true } } },
        }),
        [series],
    );

    if (loading) return <div>Loading intercontinental jumps...</div>;
    if (error) return <div>{error}</div>;
    if (!series.length) return <div>No jump data available.</div>;

    return <Chart options={options as any} series={chartSeries as any} type="bar" height={340} />;
}
