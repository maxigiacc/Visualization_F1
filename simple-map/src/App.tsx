import "./css/App.css";
import { SettingsProvider } from "./SettingsContext";
import Toolbar from "./Toolbar";
import { HashRouter, Route, Routes } from "react-router-dom";
import CircuitsPage from "./CircuitsPage";
import RacesPage from "./RacesPage";
import CarbonPage from "./CarbonPage";
import AboutPage from "./AboutPage";
import HomePage from "./HomePage";

function App() {
    return (
        <SettingsProvider>
            <HashRouter>
                <div className="App">
                    <Routes>
                        <Route index element={<HomePage />} />
                        <Route path="home" element={<HomePage />} />
                        <Route path="circuits" element={<CircuitsPage />} />
                        <Route path="races" element={<RacesPage />} />
                        <Route path="carbon" element={<CarbonPage />} />
                        <Route path="about" element={<AboutPage />} />
                        <Route element="Error page" />
                    </Routes>
                    <Toolbar />
                </div>
            </HashRouter>
        </SettingsProvider>
    );
}

export default App;
