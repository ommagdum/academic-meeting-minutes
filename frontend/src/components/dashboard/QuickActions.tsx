import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Folder, Users, Settings, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const QuickActions = () => {
  const navigate = useNavigate();

  const actions = [
    {
      title: "Create Meeting",
      description: "Start a new meeting with AI processing",
      icon: Plus,
      onClick: () => navigate('/create-meeting'),
      variant: "default" as const,
    },
    {
      title: "Search Meetings",
      description: "Find meetings, transcripts, and more",
      icon: Search,
      onClick: () => navigate('/search'),
      variant: "outline" as const,
    },
    {
      title: "Series",
      description: "Browse all your series",
      icon: Folder,
      onClick: () => navigate('/series'),
      variant: "outline" as const,
    },
    {
      title: "View All Meetings",
      description: "Browse your meeting history",
      icon: Users,
      onClick: () => navigate('/meetings'),
      variant: "outline" as const,
    },
    {
      title: "Settings",
      description: "Manage your preferences",
      icon: Settings,
      onClick: () => navigate('/settings'),
      variant: "outline" as const,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant}
              className="h-auto w-full py-3 sm:py-4 justify-start text-left items-stretch min-w-0"
              onClick={action.onClick}
            >
              <div className="flex items-start gap-2 sm:gap-3 w-full min-w-0">
                <action.icon className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 shrink-0" />
                <div className="text-left flex-1 overflow-hidden min-w-0">
                  <div className="font-semibold text-sm sm:text-base truncate">{action.title}</div>
                  <div 
                    className="text-xs font-normal line-clamp-2 break-words whitespace-normal leading-snug"
                    style={{ color: action.title === 'Create Meeting' ? '#E3E8FF' : 'hsl(var(--muted-foreground))' }}
                  >
                    {action.description}
                  </div>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
