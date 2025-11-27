import "./css/Toolbar.css";
import { useSettings } from "./SettingsContext";

const Toolbar = () => {
    const { year, setYear } = useSettings();

    return (
        <div className="Toolbar">
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
        </div>
    );
};

export default Toolbar;
