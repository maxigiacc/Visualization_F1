import React from "react";
import "../css/Flow.css";
import type { FlowList } from "./models/Graph_API";


const colorMap = ["#7b83eb", "#f2b176", "#e57373", "#81c784", "#64b5f6", "#ba68c8" , "#4db6ac", "#ffb74d" , "#90a4ae"];

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
