import InteractiveMap from "./components/InteractiveMap";
import GraphPlayer from "./components/GraphPlayer";
import "./css/Page.css";

const RacesPage = () => {
    return (
        <div className="Page">
            <div className="MainContent">
                <InteractiveMap />
            </div>
            <div className="Sidebar">
                <GraphPlayer />
            </div>
        </div>
    );
};

export default RacesPage;
