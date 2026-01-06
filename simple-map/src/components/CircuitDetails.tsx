// src/components/CircuitDetails.tsx
import React, { useEffect, useState } from "react";
import type { Circuit } from "./models/Circuit";
import type { CircuitStats } from "./utils/dataLoader";
import { getCircuitStats } from "./utils/dataLoader";
import { TEAM_COLORS } from "./StatCard";
import StatCard from "./StatCard";
import DriverAvatar from "./DriverAvatar";
import "../css/CircuitDetails.css";

type Props = {
  circuit: Circuit;
  onBack: () => void;
};

const CircuitDetails: React.FC<Props> = ({ circuit, onBack }) => {
  const [stats, setStats] = useState<CircuitStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getCircuitStats(circuit.circuitId)
      .then((s) => mounted && setStats(s))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [circuit.circuitId]);

  return (
    <div className="circuit-details">
      {/* HEADER */}
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={onBack}
          className="circuit-details__back"
        >
          ← Back
        </button>

        <h2 className="circuit-details__title">{circuit.name}</h2>
        <div className="circuit-details__meta">
          {circuit.location} • {circuit.country}
        </div>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="circuit-details__meta">
          Loading circuit statistics…
        </div>
      )}

      {/* STATS */}
      {!loading && stats && (
        <>
          <div className="circuit-details__stats">
            <StatCard
              label="Most wins (driver)"
              value={`${stats.mostWinsDriver?.driver ?? "—"} (${stats.mostWinsDriver?.wins ?? 0})`}
            />
            <StatCard
              label="Most wins (team)"
              value={`${stats.mostWinsTeam?.team ?? "—"} (${stats.mostWinsTeam?.wins ?? 0})`}
              accent={
                TEAM_COLORS[stats.mostWinsTeam?.team ?? ""] ?? "#DC0000"
              }
            />
            <StatCard
              label="Most poles"
              value={`${stats.mostPolesDriver?.driver ?? "—"} (${stats.mostPolesDriver?.poles ?? 0})`}
            />
          </div>

          {/* PODIUM */}
          <div>
            <strong className="circuit-details__section-title">
              Last podium
            </strong>

            {stats.lastPodium.length === 0 ? (
              <div className="circuit-details__empty">No data</div>
            ) : (
              <ol className="circuit-details__podium">
                {stats.lastPodium.map((p, i) => (
                  <li key={i}>
                    <DriverAvatar name={p.driver} team={p.team} />
                    <strong style={{ color: TEAM_COLORS[p.team] ?? "#111827" }}>
                      {p.driver}
                    </strong>{" "}
                    <strong style={{ color: TEAM_COLORS[p.team] ?? "#111827" }}>
                      — {p.team}
                    </strong>
                    
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* LINK */}
          <a
            href={circuit.url}
            target="_blank"
            rel="noreferrer"
            className="circuit-details__link"
          >
            Wikipedia circuit page
          </a>
        </>
      )}
    </div>
  );
};

export default CircuitDetails;
