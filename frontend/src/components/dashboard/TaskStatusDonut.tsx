import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TaskStatusDonutProps {
  completed: number;
  pending: number;
  overdue: number;
  height?: number;
}

const TaskStatusDonut = ({ completed, pending, overdue, height = 300 }: TaskStatusDonutProps) => {
  const data = useMemo(() => [
    { name: 'Completed', value: completed, color: '#34C759' }, // Green
    { name: 'Pending', value: pending, color: '#0071E3' },   // Blue
    { name: 'Overdue', value: overdue, color: '#FF3B30' },   // Red
  ].filter(item => item.value > 0), [completed, pending, overdue]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-xs" style={{ height, color: "var(--text-tertiary)" }}>
        No tasks assigned to you
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass p-3 rounded-lg shadow-lg border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface)' }}>
          <p className="font-medium text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: payload[0].payload.color }}></span>
            {payload[0].name}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            <span className="font-bold" style={{ color: payload[0].payload.color }}>{payload[0].value}</span> task{payload[0].value !== 1 ? 's' : ''}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            height={36} 
            iconType="circle"
            wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TaskStatusDonut;
