import { useState } from "react";
import { MultiStepMeetingForm, MeetingFormData } from "@/components/MultiStepMeetingForm";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { meetingService } from "@/services/meetingService";
import { format } from "date-fns";
import type { CreateMeetingRequest } from "@/types/meeting";

const CreateMeeting = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (data: MeetingFormData) => {
    try {
      setIsProcessing(true);
      console.log("Starting meeting creation flow...");
      
      const meetingRequest: CreateMeetingRequest = {
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
        // Set status to PROCESSING by default
        status: 'PROCESSING' as const,
      };

      // Handle series creation if needed
      if (data.seriesOption === 'new' && data.newSeriesTitle) {
        console.log("Creating new series first...");
        const newSeries = await meetingService.createMeetingSeries({
          title: data.newSeriesTitle.trim(),
          description: '', // Optional description for new series
        });
        console.log("New series created:", newSeries);
        meetingRequest.seriesId = newSeries.id;
      } else if (data.seriesOption === 'existing' && data.seriesId) {
        meetingRequest.seriesId = data.seriesId;
      }

      // Create the meeting
      const meeting = await meetingService.createMeeting(meetingRequest);
      console.log("Meeting created:", meeting);
      
      // If the meeting was created with DRAFT status, immediately update it to PROCESSING
      let updatedMeeting = meeting;
      if (meeting.status === 'DRAFT') {
        console.log("Updating meeting status from DRAFT to PROCESSING...");
        updatedMeeting = await meetingService.updateMeeting(meeting.id, { status: 'PROCESSING' as const });
        console.log("Meeting status updated:", updatedMeeting.status);
      }

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
        await meetingService.inviteParticipants(meeting.id, { 
          emails: data.participantEmails 
        });
        console.log("Participants invited");
      }

      // Step 4: Start AI processing (fire and forget - don't wait for completion)
      toast({
        title: "Starting AI processing...",
        description: "Your meeting is now being processed. This may take several minutes.",
      });
      
      // Start processing without waiting for completion
      meetingService.startProcessing(meeting.id).catch(error => {
        console.warn("Processing start failed (but meeting was created):", error);
      });
      console.log("Processing started (async)");

      toast({
        title: "Meeting Created Successfully!",
        description: "Your meeting is being processed. We'll notify you by email when the minutes are ready.",
      });

      // Navigate to dashboard instead of meeting detail page
      console.log("Navigating to dashboard after meeting creation");
      navigate("/dashboard");

    } catch (error: unknown) {
      console.error("Meeting creation failed:", error);
      
      let errorMessage = "Something went wrong. Please try again.";
      
      // Type guard to check if error is an AxiosError with proper typing
      const isAxiosError = (error: unknown): error is { 
        response: { status: number; data: { message?: string } } 
      } => {
        return error && typeof error === 'object' && 'response' in error;
      };
      
      if (isAxiosError(error)) {
        if (error.response.status === 401) {
          errorMessage = "Session expired. Please log in again.";
          setTimeout(() => navigate('/auth'), 2000);
        } else if (error.response.status === 400) {
          errorMessage = error.response.data?.message || "Invalid meeting data. Please check your inputs.";
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
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