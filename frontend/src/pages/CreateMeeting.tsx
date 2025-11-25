import { useState } from "react";
import { MultiStepMeetingForm, MeetingFormData } from "@/components/MultiStepMeetingForm";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { meetingService } from "@/services/meetingService";
import { format } from "date-fns";

const CreateMeeting = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (data: MeetingFormData) => {
    try {
      setIsProcessing(true);
      console.log("Starting meeting creation flow...");
      
      // Step 1: Create meeting with basic info and agenda
      toast({
        title: "Creating meeting...",
        description: "Setting up your meeting details",
      });

      const meetingRequest = {
        title: data.title,
        description: data.description,
        agendaText: data.agendaText,
        agendaItems: data.agendaItems.map((item, index) => ({
          title: item.title,
          description: item.description,
          estimatedDuration: item.estimatedDuration || 0,
          orderIndex: index,
        })),
        ...(data.scheduledTime
          ? { scheduledTime: format(data.scheduledTime, "yyyy-MM-dd'T'HH:mm:ss") }
          : {}),
        usePreviousContext: data.usePreviousContext,
        ...(data.seriesOption === 'existing' && data.seriesId 
          ? { seriesId: data.seriesId }
          : {}),
        ...(data.seriesOption === 'new' && data.newSeriesTitle 
          ? { newSeriesTitle: data.newSeriesTitle }
          : {}),
      };

      const meeting = await meetingService.createMeeting(meetingRequest);
      console.log("Meeting created:", meeting.id);

      // Step 2: Upload audio file
      if (data.audioFile) {
        toast({
          title: "Uploading audio...",
          description: "This may take a few moments",
        });
        await meetingService.uploadAudio(meeting.id, data.audioFile);
        console.log("Audio uploaded successfully");
      }

      // Step 3: Invite participants (if any)
      if (data.participantEmails.length > 0) {
        toast({
          title: "Inviting participants...",
          description: `Sending invitations to ${data.participantEmails.length} participant(s)`,
        });
        await meetingService.inviteParticipants(meeting.id, data.participantEmails);
        console.log("Participants invited");
      }

      // Step 4: Start AI processing
      toast({
        title: "Starting AI processing...",
        description: "Your meeting is now being processed",
      });
      await meetingService.startProcessing(meeting.id);
      console.log("Processing started");

      toast({
        title: "Meeting Created Successfully!",
        description: "Your meeting is now being processed. You'll receive updates on the processing status.",
      });

      // Navigate to meeting detail page to show processing status
      navigate(`/meetings/${meeting.id}`);

    } catch (error: any) {
      console.error("Meeting creation failed:", error);
      
      let errorMessage = "Something went wrong. Please try again.";
      
      if (error.response?.status === 401) {
        errorMessage = "Session expired. Please log in again.";
        setTimeout(() => navigate('/auth'), 2000);
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.message || "Invalid meeting data. Please check your inputs.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      toast({
        title: "Failed to Create Meeting",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Create New Meeting</h1>
            <p className="text-muted-foreground">
              Set up your meeting with AI-powered documentation and participant management.
            </p>
          </div>
          
          <MultiStepMeetingForm 
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />

          {isProcessing && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="bg-card p-8 rounded-lg shadow-lg text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <div>
                  <h3 className="text-lg font-semibold">Processing Meeting</h3>
                  <p className="text-sm text-muted-foreground">Please wait while we set up your meeting...</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateMeeting;