// src/components/CircuitDetails.tsx
import React, { useEffect, useState } from "react";
import type { Circuit } from "./models/Circuit";
import type { CircuitStats } from "./utils/statsUtils";
import { fetchCircuitStats } from "./utils/statsUtils";

type Props = { circuit: Circuit };

const CircuitDetails: React.FC<Props> = ({ circuit }) => {
  const [stats, setStats] = useState<CircuitStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchCircuitStats(circuit.circuitId).then((s) => {
      if (mounted) setStats(s);
    }).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, [circuit.circuitId]);

  return (
    <div style={{ marginTop: 12 }}>
      <h4 style={{ marginBottom: 4 }}>{circuit.name}</h4>
      <div style={{ color: "#666", fontSize: 13 }}>{circuit.location}, {circuit.country}</div>
      <div style={{ marginTop: 12 }}>
        <a href={circuit.url} target="_blank" rel="noreferrer">Circuit page</a>
      </div>

      <div style={{ marginTop: 14 }}>
        <strong>Statistics</strong>
        {loading && <div style={{ color: "#666" }}>Loading stats…</div>}
        {!loading && stats && (
          <div style={{ marginTop: 6 }}>
            <div><strong>Most wins (driver):</strong> {stats.mostWinsDriver?.driver ?? "—"} ({stats.mostWinsDriver?.wins ?? 0})</div>
            <div><strong>Most wins (team):</strong> {stats.mostWinsTeam?.team ?? "—"} ({stats.mostWinsTeam?.wins ?? 0})</div>
            <div><strong>Most poles:</strong> {stats.mostPolesDriver?.driver ?? "—"} ({stats.mostPolesDriver?.poles ?? 0})</div>
            <div style={{ marginTop: 8 }}>
              <strong>Last podium:</strong>
              {stats.lastPodium.length === 0 ? <div style={{ color: "#666" }}>—</div> :
                <ol>
                  {stats.lastPodium.map((p, i) => <li key={i}> {p.driver} — {p.team}</li>)}
                </ol>
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CircuitDetails;
