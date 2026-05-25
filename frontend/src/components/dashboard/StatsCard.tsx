import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number | string;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export const StatsCard = ({ title, value, description, icon: Icon, trend }: StatsCardProps) => {
  return (
    <div className="card-surface p-6 hover-lift hover-glow cursor-default h-full flex flex-col justify-between group">
      <div className="flex items-start justify-between mb-4">
        <p className="label-caps" style={{ color: "var(--text-secondary)" }}>{title}</p>
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-300"
          style={{ background: "rgba(0,113,227,0.1)", border: "1px solid rgba(0,113,227,0.2)" }}
        >
          <Icon className="w-5 h-5" style={{ color: "#0071E3" }} />
        </div>
      </div>
      
      <div>
        <p className="display-sm mb-1" style={{ color: "var(--text-primary)" }}>{value}</p>
        {description && (
          <p className="body-xs" style={{ color: "var(--text-tertiary)" }}>{description}</p>
        )}
        
        {trend && (
          <div className="mt-3 flex items-center text-xs font-medium font-body">
            <span className={trend.isPositive ? "text-green-500" : "text-red-500"}>
              {trend.isPositive ? "+" : ""}{trend.value}%
            </span>
            <span className="ml-1" style={{ color: "var(--text-tertiary)" }}>from last month</span>
          </div>
        )}
      </div>
    </div>
  );
};
