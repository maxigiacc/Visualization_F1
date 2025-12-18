import { Link } from "react-router-dom";
import "./css/Toolbar.css";
import { useSettings } from "./SettingsContext";

const Toolbar = () => {
    const { year, setYear } = useSettings();

    return (
        <div className="Toolbar">
            <h1>Visualisation Project</h1>
            <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
            >
                {
                    // currently the options are hardcoded
                    Array.from("aaaaaaaaaaaaaaaaaaaaaaaaaa").map((_, i) => (
                        <option key={i} value={i + 2000}>
                            {i + 2000}
                        </option>
                    ))
                }
            </select>
            <ul>
                <li>
                    <Link to="circuits">Circuits</Link>
                </li>
                <li>
                    <Link to="races">Races</Link>
                </li>
                <li>
                    <Link to="carbon">Carbon</Link>
                </li>
                <li>
                    <Link to="about">About</Link>
                </li>
            </ul>
        </div>
    );
};

export default Toolbar;
