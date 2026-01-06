import { Link } from "react-router-dom";
import "./css/Page.css";
import "./css/HomePage.css";

const HomePage = () => {
    return (
        <div className="Page HomePage">
            <header className="home-hero">
                <div className="home-hero__content">
                    <p className="eyebrow">DM878 - Data Visualization</p>
                    <h1>Mapping the hidden cost of F1 logistics</h1>
                    <p className="lede">
                        We turn Formula 1&apos;s global calendar into a clear
                        logistics story: where races happen, how the travel
                        path unfolds, and how much CO2 that movement implies.
                    </p>
                    <div className="home-hero__actions">
                        <Link to="/circuits" className="primary-btn">
                            Start with circuits
                        </Link>
                        <Link to="/races" className="ghost-btn">
                            Jump to race paths
                        </Link>
                    </div>
                </div>

                <div className="home-hero__panel">
                    <div className="panel-chip">Project snapshot</div>
                    <ul>
                        <li>
                            Seasons tracked: <strong>2000-2025</strong>
                        </li>
                        <li>
                            Focus: <strong>routes + emissions</strong>
                        </li>
                        <li>
                            Output: <strong>maps + charts + insights</strong>
                        </li>
                    </ul>
                    <p>
                        Use the year selector in the toolbar to keep every page
                        in sync while you explore.
                    </p>
                </div>
            </header>

            <section className="home-flow">
                <h2>Suggested flow</h2>
                <div className="flow-steps">
                    <div className="flow-step">
                        <span>1</span>
                        <div>
                            <h3>Pick a season</h3>
                            <p>Set the year once to drive all pages.</p>
                        </div>
                    </div>
                    <div className="flow-step">
                        <span>2</span>
                        <div>
                            <h3>Explore circuits</h3>
                            <p>See where races happen and inspect venues.</p>
                        </div>
                    </div>
                    <div className="flow-step">
                        <span>3</span>
                        <div>
                            <h3>Trace the race path</h3>
                            <p>Follow the original vs optimized route.</p>
                        </div>
                    </div>
                    <div className="flow-step">
                        <span>4</span>
                        <div>
                            <h3>Compare emissions</h3>
                            <p>Validate the impact with carbon dashboards.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="home-grid">
                <article className="home-card">
                    <h3>Circuits map</h3>
                    <p>
                        Discover the geographic spread of circuits and dig into
                        individual venues to see historical stats.
                    </p>
                    <Link to="/circuits" className="text-link">
                        Go to circuits
                    </Link>
                </article>
                <article className="home-card">
                    <h3>Race path</h3>
                    <p>
                        Track how the calendar travels and compare an optimized
                        route to the official order.
                    </p>
                    <Link to="/races" className="text-link">
                        Go to races
                    </Link>
                </article>
                <article className="home-card">
                    <h3>Carbon dashboard</h3>
                    <p>
                        Visualize CO₂ estimates, distance totals, and the most
                        intense travel legs.
                    </p>
                    <Link to="/carbon" className="text-link">
                        Go to carbon
                    </Link>
                </article>
            </section>

            <section className="home-footnote">
                <h2>What to look for</h2>
                <p>
                    We highlight how calendar sequencing changes the logistics
                    footprint. Compare the original path against the optimized
                    one, then validate the savings in the carbon charts.
                </p>
                <Link to="/about" className="ghost-btn">
                    About the project
                </Link>
            </section>
        </div>
    );
};

export default HomePage;
