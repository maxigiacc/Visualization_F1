// src/components/CircuitDetails.tsx
import React, { useEffect, useState } from "react";
import type { Circuit } from "./models/Circuit";
import type { CircuitStats } from "./utils/dataLoader";
import { getCircuitStats } from "./utils/dataLoader";
import { TEAM_COLORS } from "./StatCard";
import StatCard from "./StatCard";
import DriverAvatar from "./DriverAvatar";

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
    <div
      style={{
        marginTop: 16,
        animation: "fadeSlideIn 0.4s ease",
        color: "#fff",
      }}
    >
      {/* HEADER */}
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            color: "#aaa",
            cursor: "pointer",
            marginBottom: 6,
          }}
        >
          ← Back
        </button>

        <h2 style={{ margin: 0, color:"#301d1dff"}}>{circuit.name}</h2>
        <div style={{ color: "#aaa", fontSize: 13 }}>
          {circuit.location} • {circuit.country}
        </div>
      </div>

      {/* LOADING */}
      {loading && (
        <div style={{ color: "#aaa", fontStyle: "italic" }}>
          Loading circuit statistics…
        </div>
      )}

      {/* STATS */}
      {!loading && stats && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 12,
              marginBottom: 20,
            }}
          >
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
            <strong style={{ textTransform: "uppercase", fontSize: 12, color: "#301d1dff"}}>
              Last podium
            </strong>

            {stats.lastPodium.length === 0 ? (
              <div style={{ color: "#777", marginTop: 6 }}>No data</div>
            ) : (
              <ol style={{ marginTop: 8, paddingLeft: 18 }}>
                {stats.lastPodium.map((p, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>
                    <DriverAvatar name={p.driver} team={p.team} />
                    <strong style={{ color: TEAM_COLORS[p.team] ?? "#fff" }}>
                      {p.driver}
                    </strong>{" "}
                    <strong style={{ color: TEAM_COLORS[p.team] ?? "#fff" }}>
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
            style={{
              display: "inline-block",
              marginTop: 18,
              padding: "8px 14px",
              background: "#DC0000",
              color: "#fff",
              borderRadius: 6,
              textDecoration: "none",
              fontSize: 13,
            }}
          >
            Official circuit page
          </a>
        </>
      )}
    </div>
  );
};

export default CircuitDetails;
