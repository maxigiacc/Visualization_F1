import React, { useEffect, useState } from "react";
import {
    ComposableMap,
    createCoordinates,
    Geographies,
    Geography,
    Marker,
} from "@vnedyalk0v/react19-simple-maps";
import { scaleLinear } from "d3-scale";
import { csv } from "d3-fetch";
import { fromStringCircuit, type Circuit } from "./Circuit";

const geoUrl = "https://unpkg.com/world-atlas@2/countries-110m.json";

const colorScale = scaleLinear([-1, 2], ["red", "blue"]);

export default function Map() {
    const [data, setData] = useState<Circuit[]>([]);

    useEffect(() => {
        csv(`/circuits.csv`).then((data) => {
            const asArray = data.map((value) => {
                return fromStringCircuit(value);
            });
            setData(asArray);
        });
    }, []);

    return (
        <ComposableMap>
            <Geographies geography={geoUrl}>
                {({ geographies }) =>
                    geographies.map((geo) => (
                        <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill="#FEE1C7"
                            stroke="black"
                            strokeWidth={0.5}
                        />
                    ))
                }
            </Geographies>

            {data.map((circuit) => {
                return (
                    <Marker
                        coordinates={createCoordinates(
                            circuit.lng,
                            circuit.lat,
                        )}
                    >
                        <circle r={3} fill="#F44174" />
                        <text
                            textAnchor="middle"
                            y={-5}
                            style={{ fontSize: "6px", fill: "#333" }}
                        >
                            {circuit.name}
                        </text>
                    </Marker>
                );
            })}
        </ComposableMap>
    );
}
