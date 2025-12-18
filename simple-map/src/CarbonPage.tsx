import BarChartEmissions from "./components/BarChartEmissions";
import TravelKmPerYearChart from "./components/TravelKmPerYearChart";
import "./css/Page.css";

const CarbonPage = () => {
    return (
        <div className="Page">
            <div className="MainContent">
                <BarChartEmissions />
                <TravelKmPerYearChart />
            </div>
            <div className="Sidebar">Carbon sidebar</div>
        </div>
    );
};

export default CarbonPage;
