import { useMemo, useId } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardAreaChartProps {
  data: Record<string, number>;
  height?: number;
  color?: string;
}

const DashboardAreaChart = ({ data, height = 300, color = "#0071E3" }: DashboardAreaChartProps) => {
  const gradientId = useId().replace(/:/g, '');
  const chartData = useMemo(() => {
    return Object.entries(data)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => {
        const d = new Date(date);
        const formattedDate = isNaN(d.getTime()) ? date : d.toLocaleDateString("en", { month: "short", day: "numeric" });
        return {
          date: formattedDate,
          fullDate: date,
          count
        };
      });
  }, [data]);

  if (chartData.length < 2) {
    return (
      <div className="flex items-center justify-center text-xs" style={{ height, color: "var(--text-tertiary)" }}>
        Not enough data
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass p-3 rounded-lg shadow-lg border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface)' }}>
          <p className="font-medium text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{label}</p>
          <p className="text-sm" style={{ color: color }}>
            <span className="font-bold">{payload[0].value}</span> meeting{payload[0].value !== 1 ? 's' : ''}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
            dy={10}
            minTickGap={20}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="count" 
            stroke={color} 
            strokeWidth={2}
            fillOpacity={1} 
            fill={`url(#${gradientId})`} 
            activeDot={{ r: 6, fill: color, stroke: 'var(--surface)', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DashboardAreaChart;
