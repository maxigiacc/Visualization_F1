
import {
  Marker,
  Line,
} from "@vnedyalk0v/react19-simple-maps";
import type { RouteSegment } from "./models/RouteSegment";

const RouteSegmentsLayer: React.FC<{ segments: RouteSegment[]; markerScale: number }> = ({ segments, markerScale }) => {
  return (
    <>
      {segments.map((seg) => (
        <Line
          key={`line-${seg.id}`}
          from={seg.from.coordinates}
          to={seg.to.coordinates}
          coordinates={seg.coordinates}
          stroke={seg.color}
          strokeWidth={1}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}

      {segments.map((seg) => (
        <Marker key={`arrow-${seg.id}`} coordinates={seg.arrowCoordinates}>
          <g transform={`scale(${markerScale})`} style={{ transformOrigin: "0 0", pointerEvents: "none" }}>
            <path d="M0 0 L-10 4 L-10 -4 Z" fill={seg.color} opacity={0.95} />
          </g>
        </Marker>
      ))}

      {segments.map((seg) => (
        <Marker key={`label-${seg.id}`} coordinates={seg.labelCoordinates}>
          <g transform={`scale(${markerScale})`} style={{ transformOrigin: "0 0", pointerEvents: "none" }}>
            <rect x={-11} y={-14 - 3} width={22} height={14} rx={7} fill="rgba(255,255,255,0.95)" stroke={seg.color} strokeWidth={0.8} />
            <text x={0} y={-7} textAnchor="middle" fill={seg.color} style={{ fontSize: "8px", fontWeight: 600 }}>
              #{seg.order}
            </text>
          </g>
        </Marker>
      ))}
    </>
  );
};

export default RouteSegmentsLayer;