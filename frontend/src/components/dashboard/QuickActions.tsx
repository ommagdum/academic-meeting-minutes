import { Plus, Folder, Users, Settings, Search, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const QuickActions = () => {
  const navigate = useNavigate();

  const actions = [
    {
      title: "Create Meeting",
      description: "Start a new meeting with AI processing",
      icon: Plus,
      onClick: () => navigate('/create-meeting'),
      isAccent: true,
    },
    {
      title: "My Tasks",
      description: "View and manage your action items",
      icon: CheckCircle,
      onClick: () => navigate('/tasks'),
      isAccent: false,
    },
    {
      title: "Series",
      description: "Browse all your series",
      icon: Folder,
      onClick: () => navigate('/series'),
      isAccent: false,
    },
    {
      title: "View All Meetings",
      description: "Browse your meeting history",
      icon: Users,
      onClick: () => navigate('/meetings'),
      isAccent: false,
    },
  ];

  return (
    <div className="card-surface p-6 flex flex-col">
      <h2 className="text-base font-semibold mb-5 font-display" style={{ color: "var(--text-primary)" }}>
        Quick Actions
      </h2>
      <div className="flex flex-col gap-3">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className={`w-full flex items-start gap-3 p-3 text-left rounded-lg transition-all duration-200 group ${
              action.isAccent ? "btn-accent" : ""
            }`}
            style={!action.isAccent ? {
              background: "var(--surface-raised)",
              border: "1px solid var(--border-subtle)",
            } : {
              borderRadius: "var(--radius-md)",
            }}
            onMouseEnter={!action.isAccent ? (e) => {
              e.currentTarget.style.borderColor = "var(--border-strong)";
              e.currentTarget.style.background = "rgba(255,255,255,0.03)";
            } : undefined}
            onMouseLeave={!action.isAccent ? (e) => {
              e.currentTarget.style.borderColor = "var(--border-subtle)";
              e.currentTarget.style.background = "var(--surface-raised)";
            } : undefined}
          >
            <action.icon 
              className="w-5 h-5 shrink-0 mt-0.5" 
              style={{ color: action.isAccent ? "#fff" : "var(--text-secondary)" }} 
            />
            <div className="flex-1 min-w-0">
              <div 
                className="font-medium text-sm truncate transition-colors" 
                style={{ color: action.isAccent ? "#fff" : "var(--text-primary)" }}
              >
                {action.title}
              </div>
              <div 
                className="text-xs font-normal line-clamp-1 mt-0.5"
                style={{ color: action.isAccent ? "rgba(255,255,255,0.8)" : "var(--text-tertiary)" }}
              >
                {action.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
