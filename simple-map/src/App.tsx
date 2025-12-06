import "./App.css";
import InteractiveMap from "./components/InteractiveMap";
import ApexCsvRealtimeChart from "./components/ApexCsvRealtimeChart";
import TravelKmPerYearChart from "./components/TravelKmPerYearChart";
import BarChartEmissions from "./components/BarChartEmissions";
import InteractiveCountriesMap from "./components/InteractiveCountriesMap";
import { SettingsProvider } from "./SettingsContext";
import Toolbar from "./Toolbar";

function App() {
    return (
        <SettingsProvider>
            <h1>F1 Visualisation</h1>
            <InteractiveMap />
            <ApexCsvRealtimeChart/>
            <TravelKmPerYearChart />
            <BarChartEmissions />
            <InteractiveCountriesMap />
            <Toolbar />
        </SettingsProvider>
    );
}

export default App;
