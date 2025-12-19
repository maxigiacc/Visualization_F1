import React, { useMemo } from "react";
import Chart from "react-apexcharts";
import type { Circuit } from "./models/Circuit";
import { buildContinentPieOptions } from "./utils/chartConfig";

type Props = {
  circuits: Circuit[];
};

const ContinentPieChart: React.FC<Props> = ({ circuits }) => {
  const { series, options } = useMemo(
    () => buildContinentPieOptions(circuits),
    [circuits]
  );

  if (series.length === 0) return null;

  return <Chart options={options} series={series} type="pie" />;
};

export default ContinentPieChart;
