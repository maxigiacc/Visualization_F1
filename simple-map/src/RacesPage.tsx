import InteractiveMap from "./components/InteractiveMap";
import GraphPlayer from "./components/GraphPlayer";
import "./css/Page.css";
import { useState } from "react";

const RacesPage = () => {

    const [co2_emission_car, setCo2EmissionCar] = useState<number>(0.192); // Kg CO2 per Km for car
    const [co2_emission_flight, setCo2EmissionFlight] = useState<number>(0.255); // Kg CO2 per Km for flight

    return (
        <div className="Page PageWithSidebar PageNoScroll">
            <div className="MainContent">
                <InteractiveMap 
                    co2_emission_car={co2_emission_car}
                    co2_emission_flight={co2_emission_flight}
                    setCo2EmissionCar={setCo2EmissionCar}
                    setCo2EmissionFlight={setCo2EmissionFlight}
                />
            </div>
            <div className="Sidebar">
                <GraphPlayer 
                    co2_emission_car={co2_emission_car}
                    co2_emission_flight={co2_emission_flight}
                />
            </div>
        </div>
    );
};

export default RacesPage;
