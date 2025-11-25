import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { meetingService } from "@/services/meetingService";
import { Meeting, ProcessingStatus, ActionItem } from "@/types/meeting";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProcessingStatusBanner } from "@/components/meeting/ProcessingStatusBanner";
import { ArrowLeft, Calendar, Users, FileText, Download, Edit } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { AxiosError } from "axios";

const MeetingDetail = () => {
  const { id: meetingId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Log URL parameters when component mounts or meetingId changes
  useEffect(() => {
    console.log('[MeetingDetail] Component mounted with URL:', {
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      meetingIdFromParams: meetingId,
      meetingIdFromURL: window.location.pathname.split('/').pop()
    });
  }, [meetingId]);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [actionItems, setActionItems] = useState<ActionItem[] | null>(null);
  const [isLoadingActionItems, setIsLoadingActionItems] = useState(false);
  const [actionItemsError, setActionItemsError] = useState<string | null>(null);

  // Define loadMeeting first
  const loadMeeting = useCallback(async () => {
    console.log('[MeetingDetail] loadMeeting called with meetingId:', meetingId);
    
    if (!meetingId) {
      console.error('[MeetingDetail] No meeting ID provided');
      setError('No meeting ID provided');
      setIsLoading(false);
      return;
    }

    try {
      console.log('[MeetingDetail] Fetching meeting data...');
      setIsLoading(true);
      setError(null);
      
      const data = await meetingService.getMeeting(meetingId);
      console.log('[MeetingDetail] Meeting data received:', data);
      
      if (!data) {
        throw new Error('No data received from server');
      }
      
      setMeeting(data);
      console.log('[MeetingDetail] Meeting state updated');

      if (data.status === 'PROCESSING') {
        console.log('[MeetingDetail] Meeting is processing, starting status polling...');
        try {
          const status = await meetingService.getProcessingStatus(meetingId);
          console.log('[MeetingDetail] Processing status:', status);
          setProcessingStatus(status);
        } catch (statusError) {
          console.error('[MeetingDetail] Error getting processing status:', statusError);
        }
      }
    } catch (error) {
      console.error('[MeetingDetail] Error in loadMeeting:', error);
      const axiosError = error as AxiosError<{ message?: string }>;
      const errorMessage = axiosError.response?.data?.message || axiosError.message || 'Failed to load meeting';
      setError(errorMessage);
      
      if (axiosError.response?.status === 403) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to view this meeting",
          variant: "destructive",
        });
        navigate('/meetings');
      } else if (axiosError.response?.status === 404) {
        toast({
          title: "Meeting Not Found",
          description: "The requested meeting does not exist or has been deleted",
          variant: "destructive",
        });
        navigate('/meetings');
      } else if (axiosError.response?.status === 401) {
        toast({
          title: "Session Expired",
          description: "Please log in again to continue",
          variant: "destructive",
        });
        navigate('/login');
      } else {
        toast({
          title: 'Error Loading Meeting',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      console.log('[MeetingDetail] Setting isLoading to false');
      setIsLoading(false);
    }
  }, [meetingId, navigate, toast]);

  // Then define other functions that use loadMeeting
  const handleRetry = useCallback(async () => {
    if (!meetingId) return;

    try {
      await meetingService.startProcessing(meetingId);
      toast({
        title: "Processing Started",
        description: "Your meeting is being reprocessed",
      });
      await loadMeeting();
    } catch (error) {
      console.error('Failed to start processing:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start processing';
      toast({
        title: "Failed to Start Processing",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [meetingId, toast, loadMeeting]);

  // Then define useEffects
  useEffect(() => {
    console.log('[MeetingDetail] useEffect - meetingId changed:', meetingId);
    if (meetingId) {
      console.log('[MeetingDetail] Calling loadMeeting with meetingId:', meetingId);
      loadMeeting().catch(error => {
        console.error('[MeetingDetail] Error in loadMeeting:', error);
      });
    } else {
      console.error('[MeetingDetail] No meetingId provided in URL');
      setError('No meeting ID provided');
      setIsLoading(false);
    }
  }, [meetingId, loadMeeting]);

  // Poll for processing status if meeting is processing
  useEffect(() => {
    if (!meetingId || !meeting || meeting.status !== 'PROCESSING') return;

    const pollStatus = async () => {
      try {
        const status = await meetingService.getProcessingStatus(meetingId);
        setProcessingStatus(status);

        if (status.status === 'PROCESSED' || status.status === 'FAILED') {
          loadMeeting();
        }
      } catch (error) {
        console.error('Failed to fetch processing status:', error);
      }
    };

    // Poll every 5 seconds
    pollStatus();
    const interval = setInterval(pollStatus, 5000);

    return () => clearInterval(interval);
  }, [meetingId, meeting, loadMeeting]);

  // Load action items when tab changes to tasks
  useEffect(() => {
    const loadActionItems = async () => {
      if (activeTab !== "tasks" || !meetingId) return;
      
      try {
        setIsLoadingActionItems(true);
        setActionItemsError(null);
        console.log(`[MeetingDetail] Loading action items for meeting: ${meetingId}`);
        
        const items = await meetingService.getActionItems(meetingId);
        console.log('[MeetingDetail] Action items loaded:', items);
        setActionItems(items);
      } catch (error) {
        console.error('[MeetingDetail] Failed to load action items:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load action items';
        setActionItemsError(errorMessage);
        
        toast({
          title: "Error Loading Action Items",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsLoadingActionItems(false);
      }
    };
    
    loadActionItems();
  }, [activeTab, meetingId, toast]);

  const handleDownloadMinutes = async () => {
    if (!meetingId) return;
    try {
      // Try to extract a documentId from minutesDocumentUrl if present
      const url = meeting?.minutesDocumentUrl || '';
      const match = url.match(/\/documents\/([A-Za-z0-9_-]+)\b/);
      if (match && match[1]) {
        await meetingService.downloadDocument(meetingId, match[1], `${meeting?.title || 'minutes'}.pdf`);
        return;
      }
      // Fallback: if a direct URL exists, open it in a new tab
      if (url) {
        window.open(url, '_blank');
        return;
      }
      toast({
        title: 'No Document Available',
        description: 'Minutes document is not available for download yet.',
        variant: 'destructive',
      });
    } catch (error) {
      console.error('Failed to download document:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to download document';
      toast({
        title: 'Download Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: Meeting['status']) => {
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading meeting...</p>
          <p className="text-xs text-muted-foreground mt-2">Meeting ID: {meetingId}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md p-6 bg-card rounded-lg shadow">
          <h2 className="text-2xl font-bold text-destructive">Error Loading Meeting</h2>
          <p className="text-muted-foreground">{error}</p>
          <div className="pt-4">
            <Button 
              onClick={() => loadMeeting()}
              className="w-full"
            >
              Retry
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/meetings')}
              className="w-full mt-2"
            >
              Back to Meetings
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Back Buttons */}
        <div className="flex gap-2 mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/meetings')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Meetings
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard')}
          >
            Back to Dashboard
          </Button>
        </div>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-foreground">{meeting.title}</h1>
                <Badge className={getStatusColor(meeting.status)}>
                  {meeting.status}
                </Badge>
              </div>
              {meeting.description && (
                <p className="text-muted-foreground">{meeting.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              {meeting.minutesDocumentUrl && (
                <Button size="sm" onClick={handleDownloadMinutes}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Minutes
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {meeting.scheduledTime && (
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(meeting.scheduledTime), 'MMMM dd, yyyy HH:mm')}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{meeting.attendeeCount} participants</span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              <span>{meeting.actionItemCount} action items</span>
            </div>
          </div>
        </div>

        {/* Processing Status */}
        {(meeting.status === 'PROCESSING' || meeting.status === 'FAILED') && processingStatus && (
          <div className="mb-6">
            <ProcessingStatusBanner
              status={processingStatus}
              onRetry={meeting.status === 'FAILED' ? handleRetry : undefined}
            />
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transcript" disabled={meeting.status !== 'PROCESSED'}>
              Transcript
            </TabsTrigger>
            <TabsTrigger value="tasks" disabled={meeting.status !== 'PROCESSED'}>
              Tasks
            </TabsTrigger>
            <TabsTrigger value="participants">Participants</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Meeting Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {meeting.agendaText && (
                  <div>
                    <h3 className="font-semibold mb-2">Agenda</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {meeting.agendaText}
                    </p>
                  </div>
                )}
                
                <div>
                  <h3 className="font-semibold mb-2">Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created by:</span>
                      <span>{meeting.createdBy.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created at:</span>
                      <span>{format(new Date(meeting.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last updated:</span>
                      <span>{format(new Date(meeting.updatedAt), 'MMM dd, yyyy HH:mm')}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transcript">
            <Card>
              <CardHeader>
                <CardTitle>Transcript</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Transcript functionality coming soon...
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks">
            <Card>
              <CardHeader>
                <CardTitle>Action Items</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingActionItems ? (
                  <div className="text-sm text-muted-foreground">Loading...</div>
                ) : actionItemsError ? (
                  <div className="text-sm text-destructive">{actionItemsError}</div>
                ) : !actionItems || actionItems.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No action items found.</div>
                ) : (
                  <div className="space-y-4">
                    {actionItems.map(item => (
                      <div key={item.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="font-medium">{item.description}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Status: {item.status}
                              {item.deadline ? ` • Due: ${format(new Date(item.deadline), 'MMM dd, yyyy')}` : ''}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="participants">
            <Card>
              <CardHeader>
                <CardTitle>Participants</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {meeting.attendeeCount} participant(s) invited
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MeetingDetail;
