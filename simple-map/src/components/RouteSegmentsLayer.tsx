
import {
  Marker,
  Line,
  useMapContext,
  type Coordinates,
  createCoordinates
} from "@vnedyalk0v/react19-simple-maps";
import type { RouteSegment } from "./models/RouteSegment";


export const RouteSegmentsLayer: React.FC<{ segments: RouteSegment[]; markerScale: number }> = ({ segments, markerScale }) => {
    const { projection } = useMapContext();
    const getArrowAngle = (segment: RouteSegment) => {
        if (!projection) return 0;
        const coords = segment.coordinates;
        const anchorIdx = Math.max(coords.length - 3, 0);
        const anchor = projection(coords[anchorIdx]);
        const nextPoint = projection(
            coords[Math.min(anchorIdx + 1, coords.length - 1)],
        );
        if (!anchor || !nextPoint) return 0;
        return (
            (Math.atan2(nextPoint[1] - anchor[1], nextPoint[0] - anchor[0]) *
                180) /
            Math.PI
        );
    };

    const LABEL_WIDTH = 22;
    const LABEL_HEIGHT = 14;
  
     return (
        <>
            {segments.map((segment) => (
                <Line
                    key={segment.id}
                    from={segment.from.coordinates}
                    to={segment.to.coordinates}
                    coordinates={segment.coordinates}
                    stroke={segment.color}
                    strokeWidth={1}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            ))}

            {segments.map((segment) => {
                const invZoom = markerScale;
                const arrowAngle = getArrowAngle(segment);
                return (
                    <Marker
                        key={`arrow-${segment.id}`}
                        coordinates={segment.arrowCoordinates}
                    >
                        <g
                            transform={`scale(${invZoom}) rotate(${arrowAngle})`}
                            style={{
                                transformOrigin: "0 0",
                                pointerEvents: "none",
                            }}
                        >
                            <path
                                d="M0 0 L-10 4 L-10 -4 Z"
                                fill={segment.color}
                                opacity={0.9}
                            />
                        </g>
                    </Marker>
                );
            })}

            {segments.map((segment) => {
                const invZoom = markerScale;
                return (
                    <Marker
                        key={`label-${segment.id}`}
                        coordinates={segment.labelCoordinates}
                    >
                        <g
                            transform={`scale(${invZoom})`}
                            style={{
                                transformOrigin: "0 0",
                                pointerEvents: "none",
                            }}
                        >
                            <rect
                                x={-LABEL_WIDTH / 2}
                                y={-LABEL_HEIGHT - 3}
                                width={LABEL_WIDTH}
                                height={LABEL_HEIGHT}
                                rx={LABEL_HEIGHT / 2}
                                fill="rgba(255, 255, 255, 0.9)"
                                stroke={segment.color}
                                strokeWidth={0.8}
                            />
                            <text
                                x={0}
                                y={-LABEL_HEIGHT / 2}
                                textAnchor="middle"
                                fill={segment.color}
                                style={{
                                    fontSize: "8px",
                                    fontWeight: 600,
                                    letterSpacing: "0.3px",
                                    textTransform: "uppercase",
                                    userSelect: "none",
                                }}
                            >
                                #{segment.order}
                            </text>
                        </g>
                    </Marker>
                );
            })}
        </>
    );
};

export function generateCurvedLine(
    from: Coordinates,
    to: Coordinates,
    curvature = 0.25,
    segments = 48,
): Coordinates[] {
    const [startLng, startLat] = from;
    const [endLng, endLat] = to;
    const dx = endLng - startLng;
    const dy = endLat - startLat;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) {
        return [createCoordinates(startLng, startLat)];
    }

    const nx = -dy / distance;
    const ny = dx / distance;
    const maxOffset = 45;
    const offset = Math.min(maxOffset, distance * curvature);
    const steps = Math.max(2, segments);
    const coordinates: Coordinates[] = [];

    for (let step = 0; step <= steps; step += 1) {
        const t = step / steps;
        const baseLng = startLng + dx * t;
        const baseLat = startLat + dy * t;
        const curveStrength = Math.sin(Math.PI * t);
        const curvedLng = baseLng + nx * offset * curveStrength;
        const curvedLat = baseLat + ny * offset * curveStrength;
        coordinates.push(createCoordinates(curvedLng, curvedLat));
    }

    return coordinates;
}
