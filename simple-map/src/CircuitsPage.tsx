import InteractiveCountriesMap from "./components/InteractiveCountriesMap";
import "./css/Page.css";

const CircuitsPage = () => {
    return (
        <main className="Page">
            <div className="MainContent">
                <InteractiveCountriesMap />
            </div>
            <div className="Sidebar">Sidebar</div>
        </main>
    );
};

export default CircuitsPage;
