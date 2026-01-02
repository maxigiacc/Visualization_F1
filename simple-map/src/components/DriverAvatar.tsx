import { TEAM_COLORS } from "./StatCard";

const DriverAvatar = ({ name, team }: { name: string; team?: string }) => {
  const initials = name
    .split(" ")
    .map(n => n[0])
    .join("")
    .slice(0, 2);

  return (
    <>
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        background: TEAM_COLORS[team ?? ""] ?? "#333",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: 13,
      }}
    >
      {initials}
    </div>
    </>
  );
};

export default DriverAvatar;
