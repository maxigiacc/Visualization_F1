import { useMemo, useState } from "react";
import ApexCsvRealtimeChart from "./components/ApexCsvRealtimeChart";
import BarChartEmissions from "./components/BarChartEmissions";
import TravelKmPerYearChart from "./components/TravelKmPerYearChart";
import { useSettings } from "./SettingsContext";
import "./css/Page.css";
import "./css/CarbonPage.css";

type CarbonChart = {
  id: string;
  title: string;
  description: string;
  render: (filterYear?: number | null) => JSX.Element;
  accent: string;
};

const CHARTS: CarbonChart[] = [
  {
    id: "emissions",
    title: "Logistics CO₂ (kt)",
    description: "Estimated air freight emissions per season",
    render: (filterYear) => <BarChartEmissions filterYear={filterYear} />,
    accent: "#3b82f6",
  },
  {
    id: "travel",
    title: "Travel km per year",
    description: "Kilometers covered by the paddock across seasons",
    render: (filterYear) => <TravelKmPerYearChart filterYear={filterYear} />,
    accent: "#10b981",
  },
  {
    id: "factors",
    title: "Emission factors trend",
    description: "Air freight factor evolution from 2000 to 2025",
    render: (filterYear) => <ApexCsvRealtimeChart filterYear={filterYear} />,
    accent: "#f59e0b",
  },
];

const MAX_COMPARISON = 2;

const CarbonPage = () => {
  const { year, setYear } = useSettings();
  const [showYearOnly, setShowYearOnly] = useState(false);
  const [selectedCharts, setSelectedCharts] = useState<string[]>([
    "emissions",
    "travel",
  ]);
  const [focusedChart, setFocusedChart] = useState<string | null>(null);

  const yearOptions = useMemo(
    () => Array.from({ length: 26 }, (_, idx) => 2000 + idx),
    []
  );

  const allChartIds = CHARTS.map((c) => c.id);
  const isAllSelected = selectedCharts.length === allChartIds.length;
  const reachedLimit =
    selectedCharts.length >= MAX_COMPARISON && !isAllSelected && !focusedChart;
  const effectiveFilterYear =
    showYearOnly && Number.isFinite(year) ? Number(year) : null;

  const visibleCharts = useMemo(() => {
    if (focusedChart) {
      return CHARTS.filter((c) => c.id === focusedChart);
    }

    const picked = CHARTS.filter((c) => selectedCharts.includes(c.id));
    return picked.length ? picked : [CHARTS[0]];
  }, [selectedCharts, focusedChart]);

  const toggleChart = (chartId: string) => {
    setFocusedChart((current) => (current === chartId ? null : current));

    setSelectedCharts((current) => {
      if (current.includes(chartId)) {
        return current.filter((id) => id !== chartId);
      }

      const atLimit =
        current.length >= MAX_COMPARISON &&
        current.length !== allChartIds.length &&
        !focusedChart;

      if (atLimit) return current;
      return [...current, chartId];
    });
  };

  const selectAll = () => {
    setFocusedChart(null);
    setSelectedCharts(allChartIds);
  };

  const focusChart = (chartId: string) => {
    setFocusedChart(chartId);
    setSelectedCharts([chartId]);
  };

  const resetView = () => {
    setFocusedChart(null);
    setSelectedCharts(["emissions", "travel"]);
  };

  return (
    <div className="Page carbon-page">
      <div className="MainContent carbon-main">
        <div className="carbon-header">
          <div>
            <p className="eyebrow">Carbon dashboard</p>
            <h2>CO₂ footprint overview</h2>
            <p className="lede">
              Compare how logistics emissions and travel kilometers evolve
              season over season, and drill into a single chart when you need to
              focus.
            </p>
          </div>
          <div className="carbon-actions">
            <button className="ghost-btn" onClick={resetView}>
              Reset
            </button>
            <button className="primary-btn" onClick={selectAll}>
              Select all
            </button>
          </div>
        </div>

        <div className="filterBar carbon-filter">
          <div className="year-select-wrapper">
            <label htmlFor="carbon-year-select">Season</label>
            <select
              id="carbon-year-select"
              value={year ?? ""}
              onChange={(event) =>
                setYear(
                  event.target.value
                    ? Number(event.target.value)
                    : Number.NaN
                )
              }
            >
              <option value="">Select a year</option>
              {yearOptions.map((y) => (
                <option key={`carbon-year-${y}`} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <label className="year-toggle">
            <input
              type="checkbox"
              checked={showYearOnly && !!effectiveFilterYear}
              onChange={(e) => setShowYearOnly(e.target.checked)}
              disabled={!Number.isFinite(year)}
            />
            <span>Show only selected year</span>
          </label>
        </div>

        <div
          className={`carbon-grid columns-${Math.min(visibleCharts.length, 3)}`}
        >
          {visibleCharts.map((chart) => (
            <div className="chart-card" key={chart.id}>
              <div className="chart-card__header">
                <div className="pill" style={{ backgroundColor: chart.accent }}>
                  {chart.title}
                </div>
                {focusedChart === chart.id ? (
                  <span className="focus-chip">Focused</span>
                ) : (
                  <span className="compare-chip">
                    {visibleCharts.length > 1 ? "Comparing" : "Single view"}
                  </span>
                )}
              </div>
              <p className="chart-card__description">{chart.description}</p>
              <div className="chart-card__body">
                {chart.render(effectiveFilterYear)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="Sidebar carbon-sidebar">
        <div className="panel-section">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Chart menu</p>
              <h3>Choose what to compare</h3>
            </div>
            <span className="selection-count">
              {focusedChart ? "Viewing 1 chart" : `${visibleCharts.length} on`}
            </span>
          </div>
          <p className="panel-helper">
            Pick up to {MAX_COMPARISON} charts to compare. You can always select
            all of them; they will resize to stay readable.
          </p>

          <div className="chart-toggle-list">
            {CHARTS.map((chart) => {
              const isSelected = selectedCharts.includes(chart.id);
              const isFocused = focusedChart === chart.id;
              const isDisabled = reachedLimit && !isSelected;

              return (
                <div
                  key={chart.id}
                  className={`chart-toggle ${isSelected ? "is-selected" : ""} ${
                    isDisabled ? "is-disabled" : ""
                  }`}
                >
                  <div className="chart-toggle__top">
                    <div>
                      <p className="chart-toggle__title">{chart.title}</p>
                      <p className="chart-toggle__desc">{chart.description}</p>
                    </div>
                    <div className="chart-toggle__buttons">
                      <button
                        className={`chip-btn ${
                          isSelected ? "chip-btn--active" : ""
                        }`}
                        onClick={() => toggleChart(chart.id)}
                        disabled={isDisabled}
                      >
                        {isSelected ? "Selected" : "Select"}
                      </button>
                      <button
                        className="chip-btn chip-btn--ghost"
                        onClick={() => focusChart(chart.id)}
                      >
                        View
                      </button>
                    </div>
                  </div>
                  <div className="chart-toggle__footer">
                    {isFocused ? (
                      <span className="pill pill--subtle">Focused view</span>
                    ) : isSelected ? (
                      <span className="pill pill--subtle">In comparison</span>
                    ) : (
                      <span className="pill pill--muted">Hidden</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {reachedLimit && (
            <div className="limit-note">
              You&apos;re comparing {MAX_COMPARISON} charts. Unselect one or hit
              &ldquo;Select all&rdquo; to bring everything back.
            </div>
          )}
        </div>

        <div className="panel-section info-card">
          <h4>How to use</h4>
          <ul>
            <li>
              Use <strong>View</strong> to spotlight a single chart in the main
              area.
            </li>
            <li>
              <strong>Select</strong> up to two charts for a side-by-side
              comparison.
            </li>
            <li>
              <strong>Select all</strong> keeps every chart visible and adapts
              the grid.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CarbonPage;
