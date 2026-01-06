import React from "react";
import "../css/Flow.css";
import type { FlowList } from "./models/Graph_API";


const colorMap = [
  "#b91c1c",
  "#dc2626",
  "#f97316",
  "#f59e0b",
  "#ea580c",
  "#be123c",
  "#9f1239",
  "#d97706",
  "#fb923c",
];

export const Flow: React.FC<{ flowList: FlowList[] }> = ({ flowList }) => {
  return (
    <div className="timeline-wrapper">
      <div className="timeline-line" />

      {flowList && flowList.length === 0 && <p>Loading flow...</p>}

      <div className="timeline-steps">
        {flowList.map((step) => (
          <div key={step.id} className="step">
            <div className="step-number">{step.id}</div>

            <div
              className="dot"
              style={{ backgroundColor: colorMap[(step.id - 1) % colorMap.length] }}
            >
              <span className="tooltip">{step.circuit_name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
