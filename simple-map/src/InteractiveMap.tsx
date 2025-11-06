import React, { useState } from "react";
import {
    ComposableMap,
    Geographies,
    Geography,
    Marker,
    ZoomableGroup,
    createCoordinates,
    createScaleExtent,
    createTranslateExtent,
} from "@vnedyalk0v/react19-simple-maps";
import type { Feature, Geometry } from "geojson";

const geoUrl = "https://unpkg.com/world-atlas@2/countries-50m.json";

const InteractiveMap: React.FC = () => {
    const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

    const handleGeographyClick = (geography: Feature<Geometry>) => {
        const countryName = geography.properties?.name || "Unknown";
        setSelectedCountry(countryName);
    };

    return (
        <div>
            {selectedCountry && <p>Selected: {selectedCountry}</p>}

            <ComposableMap projection="geoEqualEarth" width={800} height={500}>
                <ZoomableGroup
                    zoom={1}
                    center={createCoordinates(0, 0)}
                    minZoom={0.5}
                    maxZoom={8}
                    scaleExtent={createScaleExtent(0.5, 8)}
                    translateExtent={createTranslateExtent(
                        createCoordinates(-2000, -1000),
                        createCoordinates(2000, 1000),
                    )}
                >
                    <Geographies geography={geoUrl}>
                        {({ geographies }) =>
                            geographies.map((geo) => (
                                <Geography
                                    key={geo.rsmKey}
                                    geography={geo}
                                    onClick={() => handleGeographyClick(geo)}
                                    style={{
                                        default: {
                                            fill:
                                                selectedCountry ===
                                                geo.properties?.name
                                                    ? "#1976d2"
                                                    : "#D6D6DA",
                                            outline: "none",
                                            stroke: "#FFFFFF",
                                            strokeWidth: 0.5,
                                        },
                                        hover: {
                                            fill: "#F53",
                                            cursor: "pointer",
                                        },
                                        pressed: { fill: "#E42" },
                                    }}
                                />
                            ))
                        }
                    </Geographies>

                    {/* Add a marker for New York */}
                    <Marker coordinates={createCoordinates(-74.006, 40.7128)}>
                        <circle
                            r={5}
                            fill="#F53"
                            stroke="#fff"
                            strokeWidth={2}
                        />
                        <text
                            textAnchor="middle"
                            y={-10}
                            style={{ fontSize: "12px", fill: "#333" }}
                        >
                            New York
                        </text>
                    </Marker>
                </ZoomableGroup>
            </ComposableMap>
        </div>
    );
};

export default InteractiveMap;
