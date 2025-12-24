import React, { useEffect, useMemo, useState } from "react";
import Chart from "react-apexcharts";
import type { Circuit } from "./models/Circuit";
import type { Country } from "./models/Country";
import { buildContinentPieOptions } from "./utils/chartConfig";
import { getCountries } from "./utils/dataLoader";

type Props = {
  circuits: Circuit[];
};

const ContinentPieChart: React.FC<Props> = ({ circuits }) => {
  const [countries, setCountries] = useState<Country[]>([]);

  useEffect(() => {
    getCountries().then(setCountries).catch(console.error);
  }, []);

  const { series, options } = useMemo(
    () => buildContinentPieOptions(circuits, countries),
    [circuits, countries]
  );

  if (!series.length) return null;

  return <Chart options={options} series={series} type="pie" />;
};


export default ContinentPieChart;
