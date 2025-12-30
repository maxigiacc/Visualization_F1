const StatCard = ({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent?: string;
}) => (
  <div
    style={{
      background: "#111",
      borderLeft: `4px solid ${accent ?? "#DC0000"}`,
      borderRadius: 8,
      padding: "12px 14px",
      animation: "fadeUp 0.4s ease forwards",
    }}
  >
    <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase" }}>
      {label}
    </div>
    <div style={{ fontSize: 18, fontWeight: 600, color: "#fff" }}>
      {value}
    </div>
  </div>
);
export default StatCard; 



export const TEAM_COLORS: Record<string, string> = {
  Ferrari: "#DC0000",
  Mercedes: "#00D2BE",
  "Red Bull": "#1E41FF",
  McLaren: "#FF8700",
  Alpine: "#0090FF",
  Williams: "#005AFF",
  Haas: "#B6BABD",
  AlphaTauri: "#2B4562",
  Alfa: "#900000",
};
