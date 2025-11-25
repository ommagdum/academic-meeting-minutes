import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { Calendar, Users, FileText, Eye, Clock, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MeetingSearchResult } from "@/services/searchService";

interface RecentMeetingsListProps {
  meetings: MeetingSearchResult[];
  isLoading?: boolean;
}

export const RecentMeetingsList = ({ meetings, isLoading }: RecentMeetingsListProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PROCESSED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'FAILED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not scheduled';
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Meetings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (meetings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Meetings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No meetings yet</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Create your first meeting to get started
            </p>
            <Button onClick={() => navigate('/create-meeting')}>
              Create Meeting
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Meetings</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/meetings')}>
          View All
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {meetings.map((meeting) => {
            console.log('Rendering meeting:', { id: meeting.id, title: meeting.title });
            return (
              <div
                key={meeting.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => {
                    console.log('Meeting clicked - full object:', JSON.stringify(meeting, null, 2));
                    
                    if (!meeting?.id) {
                      console.error('Meeting ID is missing', meeting);
                      toast({
                        title: 'Error',
                        description: 'Could not open meeting: Missing meeting ID',
                        variant: 'destructive',
                      });
                      return;
                    }
                    
                    console.log('Navigating to meeting with ID:', meeting.id);
                    navigate(`/meetings/${encodeURIComponent(meeting.id)}`);
                  }}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{meeting.title}</h3>
                    <Badge className={getStatusColor(meeting.status)}>
                      {meeting.status.toLowerCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="mr-1 h-4 w-4" />
                    {formatDate(meeting.scheduledTime || meeting.createdAt)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {meeting.attendeeCount > 0 && (
                      <div className="flex items-center">
                        <Users className="mr-1 h-4 w-4" />
                        {meeting.attendeeCount} {meeting.attendeeCount === 1 ? 'attendee' : 'attendees'}
                      </div>
                    )}
                    {meeting.actionItemCount > 0 && (
                      <div className="flex items-center">
                        <CheckCircle className="mr-1 h-4 w-4" />
                        {meeting.actionItemCount} {meeting.actionItemCount === 1 ? 'action item' : 'action items'}
                      </div>
                    )}
                    {meeting.hasTranscript && (
                      <div className="flex items-center">
                        <Clock className="mr-1 h-4 w-4" />
                        Has transcript
                      </div>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
