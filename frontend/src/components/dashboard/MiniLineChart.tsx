import { useMemo } from "react";

interface MiniLineChartProps {
  data: Record<string, number>;   // { "2026-05-19": 3, "2026-05-26": 7, ... }
  height?: number;
  color?: string;
}

const MiniLineChart = ({ data, height = 64, color = "#0071E3" }: MiniLineChartProps) => {
  const entries = useMemo(() => {
    return Object.entries(data)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));
  }, [data]);

  if (entries.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-xs"
        style={{ height, color: "var(--text-tertiary)" }}
      >
        Not enough data
      </div>
    );
  }

  const W = 300;
  const H = height;
  const PAD = { t: 6, b: 4, l: 2, r: 2 };
  const chartW = W - PAD.l - PAD.r;
  const chartH = H - PAD.t - PAD.b;

  const counts = entries.map(e => e.count);
  const maxVal = Math.max(...counts, 1);
  const minVal = 0;
  const range  = maxVal - minVal || 1;

  const pts = entries.map((e, i) => ({
    x: PAD.l + (i / (entries.length - 1)) * chartW,
    y: PAD.t + (1 - (e.count - minVal) / range) * chartH,
    count: e.count,
    date: e.date,
  }));

  const linePath = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const areaPath =
    `${linePath} L ${pts[pts.length - 1].x.toFixed(1)} ${(PAD.t + chartH).toFixed(1)}` +
    ` L ${pts[0].x.toFixed(1)} ${(PAD.t + chartH).toFixed(1)} Z`;

  // Format date label — show just "Mon dd" or week key
  const fmtLabel = (date: string) => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return date.slice(5); // fallback: trim year
    return d.toLocaleDateString("en", { month: "short", day: "numeric" });
  };

  return (
    <div className="w-full overflow-hidden" style={{ height }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0"    />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <path d={areaPath} fill="url(#chartGrad)" />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dots + tooltips */}
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3" fill={color} />
            <title>{`${fmtLabel(p.date)}: ${p.count} meeting${p.count !== 1 ? "s" : ""}`}</title>
          </g>
        ))}
      </svg>
    </div>
  );
};

export default MiniLineChart;
