// src/components/InteractiveCountriesMap.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    ComposableMap,
    Geographies,
    Geography,
    ZoomableGroup,
    createCoordinates,
    createScaleExtent,
    createTranslateExtent,
} from "@vnedyalk0v/react19-simple-maps";
import { csv } from "d3-fetch";
import type { Circuit } from "./models/Circuit";
import { fromStringCircuit } from "./models/Circuit";
import MapMarkers from "./MapMarkers";
import SidePanelDrawer from "./SidePanelDrawer";
import { sameCountry } from "./utils/countryUtils";

import GEO_URL from "../assets/countries-50m.json";

const InteractiveCountriesMap: React.FC = () => {
    const [circuits, setCircuits] = useState<Circuit[]>([]);
    const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedCircuit, setSelectedCircuit] = useState<Circuit | null>(
        null,
    );

    // zoom / marker state
    const zoomRef = useRef<number>(1);
    const [markerScale, setMarkerScale] = useState<number>(1);
    const [showLabels, setShowLabels] = useState(false);
    const debounceTimer = useRef<number | null>(null);

    const STEP = 0.05;
    const EPS = 0.002;
    const DEBOUNCE_MS = 50;
    const SHOW_LABEL_ZOOM_THRESHOLD = 2;

    useEffect(() => {
        csv("/circuits.csv").then((circuitsRaw) => {
            const parsed = (circuitsRaw as any[]).map(fromStringCircuit);
            setCircuits(parsed);
        });
    }, []);

    const handleCountrySelect = (countryName: string) => {
        setSelectedCountry(countryName);
        setSelectedCircuit(null);
        setDrawerOpen(true);
    };

    const circuitsForCountry = useMemo(() => {
        if (!selectedCountry) return [];
        return circuits.filter((c) => sameCountry(c.country, selectedCountry));
    }, [circuits, selectedCountry]);

    return (
        <>
            <div style={{ position: "relative" }}>
                <ComposableMap
                    projection="geoEqualEarth"
                    width={780}
                    height={520}
                >
                    <ZoomableGroup
                        minZoom={1}
                        maxZoom={8}
                        scaleExtent={createScaleExtent(1, 8)}
                        translateExtent={createTranslateExtent(
                            createCoordinates(-2000, -1000),
                            createCoordinates(2000, 1000),
                        )}
                        onMoveEnd={(position: any) => {
                            const rawZoom =
                                position?.k ??
                                position?.scale ??
                                position?.zoom ??
                                1;
                            const snapped = Math.round(rawZoom / STEP) * STEP;
                            const prevZoom = zoomRef.current;
                            zoomRef.current = Math.round(snapped * 1000) / 1000;

                            if (Math.abs(snapped - prevZoom) > EPS) {
                                if (debounceTimer.current)
                                    window.clearTimeout(debounceTimer.current);
                                debounceTimer.current = window.setTimeout(
                                    () => {
                                        setMarkerScale(
                                            1 /
                                                Math.max(
                                                    0.001,
                                                    zoomRef.current,
                                                ),
                                        );
                                        setShowLabels(
                                            zoomRef.current >=
                                                SHOW_LABEL_ZOOM_THRESHOLD,
                                        );
                                        debounceTimer.current = null;
                                    },
                                    DEBOUNCE_MS,
                                );
                            }
                        }}
                    >
                        <Geographies geography={GEO_URL}>
                            {({ geographies }) =>
                                geographies.map((geo, idx) => (
                                    <Geography
                                        key={`${geo.id ?? "geo"}-${idx}`}
                                        geography={geo}
                                        onClick={() =>
                                            handleCountrySelect(
                                                geo.properties?.name ??
                                                    "Unknown",
                                            )
                                        }
                                        style={{
                                            default: {
                                                fill: "#D6D6DA",
                                                outline: "none",
                                                stroke: "#fff",
                                                strokeWidth: 0.5,
                                                userSelect: "none",
                                            },
                                            hover: {
                                                fill: "#F53",
                                                cursor: "pointer",
                                                outline: "none",
                                            },
                                            pressed: {
                                                fill: "#E42",
                                                outline: "none",
                                            },
                                        }}
                                    />
                                ))
                            }
                        </Geographies>

                        <MapMarkers
                            data={circuits}
                            markerScale={markerScale}
                            showLabels={showLabels}
                        />
                    </ZoomableGroup>
                </ComposableMap>
            </div>

            <SidePanelDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                country={selectedCountry}
                circuits={circuitsForCountry}
                selectedCircuit={selectedCircuit}
                onSelectCircuit={(c) => setSelectedCircuit(c)} // Ora accetta anche null
            />
        </>
    );
};

export default InteractiveCountriesMap;

