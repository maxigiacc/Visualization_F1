import "./App.css";
import InteractiveMap from "./InteractiveMap";

import ApexCsvRealtimeChart from './components/ApexCsvRealtimeChart.js';
import TravelKmPerYearChart from './components/TravelKmPerYearChart.tsx';

function App() {
    return (
        <>
            <h1>F1 Visualisation</h1>
            <InteractiveMap />
            <ApexCsvRealtimeChart csvUrl="/emission_factors_2000_2025.csv" />.
            <TravelKmPerYearChart />
            
        </>
    );
}

export default App;
