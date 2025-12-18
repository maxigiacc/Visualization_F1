import "../css/ContinentPie.css";

type Slice = {
    label: string;
    value: number; // percentage (sum = 100)
    color: string;
};

type Props = {
    title: string;
    slices: Slice[];
};

export function ContinentPie({ title, slices }: Props) {
    const radius = 60;
    const cx = 80;
    const cy = 80;

    let cumulativeAngle = 0;

    const describeSlice = (startAngle: number, endAngle: number) => {
        const startRad = (Math.PI / 180) * startAngle;
        const endRad = (Math.PI / 180) * endAngle;

        const x1 = cx + radius * Math.cos(startRad);
        const y1 = cy + radius * Math.sin(startRad);
        const x2 = cx + radius * Math.cos(endRad);
        const y2 = cy + radius * Math.sin(endRad);

        const largeArc = endAngle - startAngle > 180 ? 1 : 0;

        return `
            M ${cx} ${cy}
            L ${x1} ${y1}
            A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
            Z
        `;
    };

    return (
        <div className="continent-chart">
            <div className="continent-title">{title}</div>

            <div className="chart-row">
                <svg width="160" height="160" viewBox="0 0 160 160">
                    {slices.map((s, i) => {
                        const start = cumulativeAngle;
                        const angle = (s.value / 100) * 360;
                        const end = start + angle;
                        cumulativeAngle = end;

                        return (
                            <path
                                key={i}
                                d={describeSlice(start - 90, end - 90)}
                                fill={s.color}
                            />
                        );
                    })}
                </svg>

                <div className="legend">
                    {slices.map((s, i) => (
                        <div key={i} className="legend-item">
                            <span
                                className="legend-color"
                                style={{ backgroundColor: s.color }}
                            />
                            <span>{s.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

