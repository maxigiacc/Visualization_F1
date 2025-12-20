
import {
  Marker,
  Line,
  useMapContext,
  type Coordinates,
  createCoordinates
} from "@vnedyalk0v/react19-simple-maps";
import { useState } from "react";
import type { RouteSegment } from "./models/RouteSegment";

type RouteSegmentsLayerProps = {
    segments: RouteSegment[];
    markerScale: number;
    onSegmentClick?: (segment: RouteSegment) => void;
    activeSegmentOrders: number[];
};

export const RouteSegmentsLayer: React.FC<RouteSegmentsLayerProps> = ({ segments, markerScale, onSegmentClick, activeSegmentOrders,}) => {
    
    const [hoveredId, setHoveredId] = useState<string | null>(null);
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
    const activeOrderSet = new Set<number>(activeSegmentOrders);
    const neighborOrderSet = new Set<number>();
    activeSegmentOrders.forEach((order) => {
        neighborOrderSet.add(order - 1);
        neighborOrderSet.add(order + 1);
    });

    const visibleSegments = segments.filter((segment) => {
        if (activeOrderSet.size === 0) return true;
        return (
            activeOrderSet.has(segment.order) ||
            neighborOrderSet.has(segment.order)
        );
    });

     return (
        <>  
            {/* LINES */}
            {visibleSegments.map((segment) => {
                const isMuted = activeOrderSet.size > 0 && !activeOrderSet.has(segment.order) && neighborOrderSet.has(segment.order);
                const displayColor = isMuted ? "#B0B0B0" : segment.color;
                return (
                <Line
                    key={segment.id}
                    from={segment.from.coordinates}
                    to={segment.to.coordinates}
                    coordinates={segment.coordinates}
                    stroke={displayColor}
                    strokeWidth={0.5}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            )})}

            {/* ARROWS */}
            {visibleSegments.map((segment) => {
                const invZoom = markerScale;
                const arrowAngle = getArrowAngle(segment);
                const isMuted = activeOrderSet.size > 0 && !activeOrderSet.has(segment.order) && neighborOrderSet.has(segment.order);
                const displayColor = isMuted ? "#B0B0B0" : segment.color;
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
                                fill={displayColor}
                                opacity={0.9}
                            />
                        </g>
                    </Marker>
                );
            })}

            {/* LABELS */}
            {visibleSegments.map((segment) => {
                const invZoom = markerScale;
                const isMuted = activeOrderSet.size > 0 && !activeOrderSet.has(segment.order) && neighborOrderSet.has(segment.order);
                const displayColor = isMuted ? "#B0B0B0" : segment.color;
                const isHovered = hoveredId === segment.id;
                return (
                    <Marker
                        key={`label-${segment.id}`}
                        coordinates={segment.labelCoordinates}
                    >
                        <g
                            transform={`scale(${invZoom})`}
                            style={{
                                transformOrigin: "0 0",
                                pointerEvents: "auto",
                                cursor: onSegmentClick ? "pointer" : "default",
                            }}
                            onClick={() => onSegmentClick?.(segment)}
                            onMouseEnter={() => setHoveredId(segment.id)}
                            onMouseLeave={() => setHoveredId(null)}
                        >
                            <rect
                                x={-LABEL_WIDTH / 2}
                                y={-LABEL_HEIGHT - 3}
                                width={LABEL_WIDTH}
                                height={LABEL_HEIGHT}
                                rx={LABEL_HEIGHT / 2}
                                fill={
                                    isHovered
                                        ? displayColor
                                        : "rgba(255, 255, 255, 0.9)"
                                }
                                stroke={displayColor}
                                strokeWidth={0.8}
                            />
                            <text
                                x={0}
                                y={-LABEL_HEIGHT / 2}
                                textAnchor="middle"
                                fill={isHovered ? "#fff" : displayColor}
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
