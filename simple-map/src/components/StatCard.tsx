import type { ReactNode } from "react";
import "../css/StatCard.css";

const StatCard = ({
  label,
  value,
  accent,
}: {
  label: string;
  value: ReactNode;
  accent?: string;
}) => (
  <div
    className="stat-card"
    style={{ ["--accent-color" as const]: accent ?? "#e10600" }}
  >
    <div className="stat-card__label">{label}</div>
    <div className="stat-card__value">{value}</div>
  </div>
);
export default StatCard; 



export const TEAM_COLORS: Record<string, string> = {
  Ferrari: "#DC0000",
  Mercedes: "#00D2BE",
  "Red Bull": "#1E41FF",
  McLaren: "#ff8800ad",
  "Alpine F1 Team": "#0090FF",
  Williams: "#005AFF",
  Haas: "#B6BABD",
  AlphaTauri: "#2B4562",
  Alfa: "#900000",
  AstonMartin: "#006F62",
  Ligier: "#ccc503ff",
  Benetton: "#52B848",
  Toyota: "#E4002B",
  "Toro Rosso": "#469BFF",
  "Lotus F1": "#FFCD00",
  Renault: "#FFE500",
  "BMW Sauber": "#006EFF",
  Footwork: "#3f3131ff",
  March: "#9c9c00ff",
  "Team Lotus": "#FFCD00",
  "Tyrrell": "#005AFF",
  Brabham: "#a31515ff",
  Arrows: "#0080FF",
  Wolf: "#5f2929ff",
  Matra: "#FF00FF",
  Honda: "#9900FF",
  "Matra-Ford": "#FF00FF",
  "Brabham-Repco": "#a31515ff",
  "Brabham-Climax": "#a31515ff",
  BRM: "#008000",
  "Lotus-Climax": "#FFCD00",
  Lola: "#ff8800ff",
  "Cooper-Climax": "#000000",
  "Vanwall": "#ff0000ff",
  Maserati: "#04048aff",
};
