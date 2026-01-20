import React from "react";
import "../css/Flow.css";
import type { FlowList } from "./models/Graph_API";
import { getClusterColor } from "./models/Circuit";

export const Flow: React.FC<{ flowList: FlowList[] }> = ({ flowList }) => {
  return (
    <div className="timeline-wrapper">
      <div className="timeline-line" />

      {flowList && flowList.length === 0 && <p>Loading flow...</p>}

      <div className="timeline-steps">
        {flowList.map((step) => {
          const clusterColor = getClusterColor(step.clusterId || "cluster_unknown");
          return (
            <div key={step.id} className="step">
              <div
                className="step-number"
                style={{ color: clusterColor }}
              >
                {step.id}
              </div>

              <div
                className="dot"
                style={{ backgroundColor: clusterColor }}
              >
                <span className="tooltip">{step.circuit_name}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
