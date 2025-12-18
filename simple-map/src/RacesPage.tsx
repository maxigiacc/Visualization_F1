import InteractiveMap from "./components/InteractiveMap";
import "./css/Page.css";

const RacesPage = () => {
    return (
        <div className="Page">
            <div className="MainContent">
                <InteractiveMap />
            </div>
            <div className="Sidebar"></div>
        </div>
    );
};

export default RacesPage;
