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
        ...(data.scheduledTime ? { scheduledTime: format(data.scheduledTime, "yyyy-MM-dd'T'HH:mm:ss") } : {}),
        usePreviousContext: data.usePreviousContext,
        status: 'PROCESSING' as const,
      };

      if (data.seriesOption === 'new' && data.newSeriesTitle) {
        const newSeries = await meetingService.createMeetingSeries({
          title: data.newSeriesTitle.trim(),
          description: '',
        });
        meetingRequest.seriesId = newSeries.id;
      } else if (data.seriesOption === 'existing' && data.seriesId) {
        meetingRequest.seriesId = data.seriesId;
      }

      const meeting = await meetingService.createMeeting(meetingRequest);
      
      if (meeting.status === 'DRAFT') {
        await meetingService.updateMeeting(meeting.id, { status: 'PROCESSING' as const });
      }

      if (data.audioFile) {
        toast({ title: "Uploading audio...", description: "This may take a few moments" });
        await meetingService.uploadAudio(meeting.id, data.audioFile);
      }

      if (data.participantEmails.length > 0) {
        toast({ title: "Inviting participants...", description: `Sending invitations to ${data.participantEmails.length} participant(s)` });
        await meetingService.inviteParticipants(meeting.id, { emails: data.participantEmails });
      }

      toast({ title: "Starting AI processing...", description: "Your meeting is now being processed. This may take several minutes." });
      meetingService.startProcessing(meeting.id).catch(error => {
        console.warn("Processing start failed:", error);
      });

      toast({ title: "Meeting Created Successfully!", description: "Your meeting is being processed. We'll notify you by email when the minutes are ready." });
      navigate("/dashboard");

    } catch (error: unknown) {
      let errorMessage = "Something went wrong. Please try again.";
      const isAxiosError = (error: unknown): error is { response: { status: number; data: { message?: string } } } => {
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
      toast({ title: "Failed to Create Meeting", description: errorMessage, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    navigate("/dashboard");
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 animate-fade-in">

      <MultiStepMeetingForm onSubmit={handleSubmit} onCancel={handleCancel} />

      {isProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
          <div className="card-surface p-8 max-w-sm w-full text-center flex flex-col items-center">
            <div className="w-10 h-10 rounded-full border-2 border-transparent animate-spin mb-4" style={{ borderTopColor: "#0071E3" }} />
            <h3 className="text-lg font-semibold font-display mb-1" style={{ color: "var(--text-primary)" }}>Processing Meeting</h3>
            <p className="body-sm">Please wait while we set up your meeting...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateMeeting;