import type { CSSProperties } from "react";
import { TEAM_COLORS } from "./StatCard";
import "../css/DriverAvatar.css";

const DriverAvatar = ({ name, team }: { name: string; team?: string }) => {
  const initials = name
    .split(" ")
    .map(n => n[0])
    .join("")
    .slice(0, 2);

  return (
    <div
      className="driver-avatar"
      style={
        { ["--avatar-bg" as string]: TEAM_COLORS[team ?? ""] ?? "#333" } as CSSProperties
      }
    >
      {initials}
    </div>
  );
};

export default DriverAvatar;
