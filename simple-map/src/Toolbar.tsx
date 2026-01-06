import { NavLink } from "react-router-dom";
import "./css/Toolbar.css";
import { useSettings } from "./SettingsContext";

const Toolbar = () => {
    const { year, setYear } = useSettings();

    const linkClassName = ({ isActive }: { isActive: boolean }) =>
        isActive ? "is-active" : undefined;

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
                    <NavLink to="/" end className={linkClassName}>
                        Home
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/circuits" className={linkClassName}>
                        Circuits
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/races" className={linkClassName}>
                        Races
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/carbon" className={linkClassName}>
                        Carbon
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/about" className={linkClassName}>
                        About
                    </NavLink>
                </li>
            </ul>
        </div>
    );
};

export default Toolbar;
