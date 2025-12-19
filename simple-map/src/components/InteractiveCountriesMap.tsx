// src/components/InteractiveCountriesMap.tsx
import React, { useRef, useState } from "react";
import {
    ComposableMap,
    Geographies,
    Geography,
    ZoomableGroup,
    createCoordinates,
    createScaleExtent,
    createTranslateExtent,
} from "@vnedyalk0v/react19-simple-maps";
import MapMarkers from "./MapMarkers";

import GEO_URL from "../assets/countries-50m.json";
import type { Circuit } from "./models/Circuit";

type Props = {
  circuits: Circuit[];
  selectedCircuit: Circuit | null;
  onCountrySelect: (country: string) => void;
  onCircuitSelect: (circuit: Circuit | null) => void;
};


const InteractiveCountriesMap: React.FC<Props> = ({
  circuits,
  selectedCircuit,
  onCountrySelect,
  onCircuitSelect,
}) => {
  
    const zoomRef = useRef<number>(1);
    const [markerScale, setMarkerScale] = useState<number>(1);
    const [showLabels, setShowLabels] = useState(false);
    const debounceTimer = useRef<number | null>(null);
    
    const STEP = 0.05;
    const EPS = 0.002;
    const DEBOUNCE_MS = 50;
    const SHOW_LABEL_ZOOM_THRESHOLD = 2;

  return (
    <>
        <div style={{ position: "relative" }}>
            <ComposableMap projection="geoEqualEarth" width={780} height={520}>
                <ZoomableGroup
                    minZoom={1}
                    maxZoom={8}
                    scaleExtent={createScaleExtent(1, 8)}
                    translateExtent={createTranslateExtent(
                            createCoordinates(-2000, -1000),
                            createCoordinates(2000, 1000),
                    )}
                    onMoveEnd={(position: any) => {
                            const rawZoom = position?.k ?? position?.scale ?? position?.zoom ?? 1;
                            const snapped = Math.round(rawZoom / STEP) * STEP;
                            const prevZoom = zoomRef.current;
                            zoomRef.current = Math.round(snapped * 1000) / 1000;
                            
                            if (Math.abs(snapped - prevZoom) > EPS) {
                                if (debounceTimer.current) {
                                    window.clearTimeout(debounceTimer.current);
                                }
                                debounceTimer.current = window.setTimeout(() => {
                                    setMarkerScale(1 / Math.max(0.001, zoomRef.current));
                                    setShowLabels(zoomRef.current >= SHOW_LABEL_ZOOM_THRESHOLD);
                                    debounceTimer.current = null;
                                }, DEBOUNCE_MS);
                            }
                        }}
                >
                    <Geographies geography={GEO_URL}>
                    {({ geographies }) =>
                        geographies.map((geo) => (
                        <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            onClick={() =>
                                onCountrySelect(
                                    geo.properties?.name ?? "Unknown"
                                )
                            }
                            style={{
                                            default: { 
                                                fill: "#D6D6DA", 
                                                outline: "none", 
                                                stroke: "#fff", 
                                                strokeWidth: 0.5, 
                                                userSelect: "none" 
                                            },
                                            hover: { 
                                                fill: "#F53", 
                                                cursor: "pointer", 
                                                outline: "none" 
                                            },
                                            pressed: { 
                                                fill: "#E42", 
                                                outline: "none" 
                                            },
                                        }}
                        />
                        ))
                    }
                    </Geographies>

                    <MapMarkers
                        circuits={circuits}
                        markerScale={markerScale}
                        showLabels={showLabels}
                        selectedCircuit={selectedCircuit}
                        onSelectCircuit={onCircuitSelect}
                    />
                </ZoomableGroup>
                </ComposableMap>
        </div>
    </>
    
  );
};

export default InteractiveCountriesMap;
