import logo from "./assets/F1.png";
import "./css/Page.css";
import "./css/AboutPage.css";

const AboutPage = () => {
    return (
        <div className="Page AboutPage">
            <header className="about-hero">
                <div className="title-row">
                    <img src={logo} alt="F1 logo" className="about-logo" />
                    <div>
                        <p className="eyebrow">DM878 · Data Visualization</p>
                        <h1>Mapping the hidden cost of F1 logistics</h1>
                    </div>
                </div>
                <p className="intro">
                    A compact overview of how Formula 1’s global calendar
                    drives travel distance and carbon emissions — and how a
                    smarter schedule could help.
                </p>
                <div className="about-highlight">
                    <div>
                        <span className="pill">Focus</span>
                        <strong>Logistics & CO₂</strong>
                    </div>
                    <div>
                        <span className="pill">Scope</span>
                        <strong>2000–2025 seasons</strong>
                    </div>
                </div>
            </header>

            <section className="about-grid">
                <div className="card">
                    <h2>Why Formula 1?</h2>
                    <p>
                        F1 spans five continents and ships hundreds of tonnes of
                        equipment between races. The calendar sometimes bounces
                        between regions within weeks, creating avoidable
                        back-and-forth routes.
                    </p>
                </div>

                <div className="card">
                    <h2>What we show</h2>
                    <ul>
                        <li>Map each circuit and the official race order.</li>
                        <li>Sum distance between consecutive events.</li>
                        <li>
                            Estimate logistics emissions using published air
                            freight factors.
                        </li>
                    </ul>
                </div>

                <div className="card">
                    <h2>Environmental angle</h2>
                    <p>
                        Distances feed into CO₂ estimates to illustrate the
                        scale of freight emissions. Values are indicative, but
                        they surface the footprint of a global calendar.
                    </p>
                </div>

                <div className="card">
                    <h2>Calendar optimization</h2>
                    <p>
                        We compare the official route with a distance-minimized
                        alternative to see how many kilometers — and emissions —
                        could be saved with a better ordering.
                    </p>
                </div>
            </section>

            <section className="data-tools card">
                <h2>Data & tools</h2>
                <p>
                    Race history from{" "}
                    <a
                        href="https://www.kaggle.com/datasets/rohanrao/formula-1-world-championship-1950-2020"
                        target="_blank"
                        rel="noreferrer"
                    >
                        Kaggle (1950–2020)
                    </a>{" "}
                    plus extended seasons; emission factors from public
                    logistics sources; geospatial calcs via haversine; charts
                    built with ApexCharts and React.
                </p>
            </section>
        </div>
    );
};

export default AboutPage;
