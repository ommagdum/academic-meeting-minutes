import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Calendar, Repeat, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { meetingService } from '@/services/meetingService';
import { Meeting, MeetingSeries } from '@/types/meeting';

interface UpdateMeetingData {
  title: string;
  description?: string;
  agendaText?: string;
  scheduledTime?: string;
  usePreviousContext?: boolean;
  seriesId?: string | null;
  newSeriesTitle?: string;
}

interface EditMeetingModalProps {
  meeting: Meeting | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedMeeting: Meeting) => void;
}

interface EditFormData {
  title: string;
  description: string;
  scheduledTime?: Date;
  agendaText: string;
  seriesOption: 'none' | 'existing' | 'new';
  seriesId?: string;
  newSeriesTitle?: string;
  usePreviousContext: boolean;
}

export function EditMeetingModal({ meeting, isOpen, onClose, onSuccess }: EditMeetingModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [series, setSeries] = useState<MeetingSeries[]>([]);
  const [isLoadingSeries, setIsLoadingSeries] = useState(false);
  
  const [formData, setFormData] = useState<EditFormData>({
    title: '',
    description: '',
    scheduledTime: undefined,
    agendaText: '',
    seriesOption: 'none',
    seriesId: undefined,
    newSeriesTitle: undefined,
    usePreviousContext: false,
  });

  // Load meeting series data
  useEffect(() => {
    const fetchSeries = async () => {
      try {
        setIsLoadingSeries(true);
        const seriesData = await meetingService.getMeetingSeries();
        setSeries(seriesData);
      } catch (error) {
        console.error('Failed to fetch series:', error);
      } finally {
        setIsLoadingSeries(false);
      }
    };
    
    if (isOpen) {
      fetchSeries();
    }
  }, [isOpen]);

  // Initialize form data when meeting changes
  useEffect(() => {
    if (meeting) {
      setFormData({
        title: meeting.title,
        description: meeting.description || '',
        scheduledTime: meeting.scheduledTime ? new Date(meeting.scheduledTime) : undefined,
        agendaText: meeting.agendaText || '',
        seriesOption: meeting.seriesId ? 'existing' : 'none',
        seriesId: meeting.seriesId || undefined,
        newSeriesTitle: undefined,
        usePreviousContext: meeting.usePreviousContext || false,
      });
    }
  }, [meeting]);

  const updateFormData = (updates: Partial<EditFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!meeting) return;

    // Validation
    if (!formData.title.trim() || formData.title.length < 3) {
      toast({
        title: "Validation Error",
        description: "Meeting title must be at least 3 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (formData.seriesOption === 'existing' && !formData.seriesId) {
      toast({
        title: "Validation Error",
        description: "Please select a meeting series.",
        variant: "destructive",
      });
      return;
    }

    if (formData.seriesOption === 'new' && (!formData.newSeriesTitle || formData.newSeriesTitle.length < 2)) {
      toast({
        title: "Validation Error",
        description: "New series title must be at least 2 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const updateData: UpdateMeetingData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        agendaText: formData.agendaText.trim(),
        scheduledTime: formData.scheduledTime?.toISOString(),
        usePreviousContext: formData.usePreviousContext,
      };

      // Handle series updates
      if (formData.seriesOption === 'existing' && formData.seriesId) {
        updateData.seriesId = formData.seriesId;
      } else if (formData.seriesOption === 'new' && formData.newSeriesTitle) {
        updateData.newSeriesTitle = formData.newSeriesTitle.trim();
      } else if (formData.seriesOption === 'none') {
        updateData.seriesId = null;
      }

      const updatedMeeting = await meetingService.updateMeeting(meeting.id, updateData);
      
      toast({
        title: "Success",
        description: "Meeting updated successfully.",
      });
      
      onSuccess(updatedMeeting);
      onClose();
    } catch (error) {
      console.error('Failed to update meeting:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update meeting';
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Meeting</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Meeting Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Meeting Title *
            </Label>
            <Input
              id="title"
              placeholder="e.g., Weekly Department Committee Meeting"
              value={formData.title}
              onChange={(e) => updateFormData({ title: e.target.value })}
              disabled={isLoading}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Minimum 3 characters, maximum 255 characters
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Meeting Description
            </Label>
            <Textarea
              id="description"
              placeholder="Brief description of the meeting purpose and objectives..."
              value={formData.description}
              onChange={(e) => updateFormData({ description: e.target.value })}
              disabled={isLoading}
              className="min-h-[100px] resize-y"
            />
          </div>

          {/* Agenda */}
          <div className="space-y-2">
            <Label htmlFor="agenda" className="text-sm font-medium">
              Meeting Agenda
            </Label>
            <Textarea
              id="agenda"
              placeholder="List the topics and items to be discussed in this meeting..."
              value={formData.agendaText}
              onChange={(e) => updateFormData({ agendaText: e.target.value })}
              disabled={isLoading}
              className="min-h-[120px] resize-y"
            />
          </div>

          {/* Series Option */}
          <div className="space-y-4 p-4 rounded-lg border border-border bg-muted/50">
            <div className="space-y-1">
              <Label className="text-sm font-medium flex items-center">
                <Repeat className="mr-2 h-4 w-4" />
                Meeting Series
              </Label>
              <p className="text-xs text-muted-foreground">
                Group related meetings together for better context and continuity
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="series-none"
                  name="series"
                  value="none"
                  checked={formData.seriesOption === 'none'}
                  onChange={() => updateFormData({ seriesOption: 'none', seriesId: undefined, newSeriesTitle: undefined })}
                  disabled={isLoading}
                  className="w-4 h-4"
                />
                <Label htmlFor="series-none" className="cursor-pointer">
                  Standalone meeting (no series)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="series-existing"
                  name="series"
                  value="existing"
                  checked={formData.seriesOption === 'existing'}
                  onChange={() => updateFormData({ seriesOption: 'existing', newSeriesTitle: undefined })}
                  disabled={isLoading}
                  className="w-4 h-4"
                />
                <Label htmlFor="series-existing" className="cursor-pointer">
                  Add to existing series
                </Label>
              </div>

              {formData.seriesOption === 'existing' && (
                <div className="ml-6 space-y-2">
                  <Select
                    value={formData.seriesId}
                    onValueChange={(value) => updateFormData({ seriesId: value })}
                    disabled={isLoadingSeries || isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingSeries ? "Loading series..." : "Select a series"} />
                    </SelectTrigger>
                    <SelectContent>
                      {series.length === 0 && !isLoadingSeries ? (
                        <SelectItem value="none" disabled>No series available</SelectItem>
                      ) : (
                        series.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.title} ({s.meetingCount} meetings)
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="series-new"
                  name="series"
                  value="new"
                  checked={formData.seriesOption === 'new'}
                  onChange={() => updateFormData({ seriesOption: 'new', seriesId: undefined })}
                  disabled={isLoading}
                  className="w-4 h-4"
                />
                <Label htmlFor="series-new" className="cursor-pointer">
                  Create new series
                </Label>
              </div>

              {formData.seriesOption === 'new' && (
                <div className="ml-6 space-y-2">
                  <Input
                    placeholder="Enter new series title"
                    value={formData.newSeriesTitle || ''}
                    onChange={(e) => updateFormData({ newSeriesTitle: e.target.value })}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 2 characters
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Scheduled Time */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Scheduled Date & Time (Optional)
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.scheduledTime && "text-muted-foreground"
                  )}
                  disabled={isLoading}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {formData.scheduledTime ? format(formData.scheduledTime, "PPP 'at' p") : "Select date and time"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={formData.scheduledTime}
                  onSelect={(date) => {
                    if (date) {
                      // Preserve time if already set, otherwise set to current time
                      const newDate = formData.scheduledTime ? new Date(date) : new Date();
                      if (formData.scheduledTime) {
                        newDate.setHours(formData.scheduledTime.getHours());
                        newDate.setMinutes(formData.scheduledTime.getMinutes());
                      }
                      updateFormData({ scheduledTime: newDate });
                    }
                  }}
                  initialFocus
                  className="pointer-events-auto"
                />
                <div className="p-3 border-t">
                  <Input
                    type="time"
                    value={formData.scheduledTime ? format(formData.scheduledTime, "HH:mm") : ""}
                    onChange={(e) => {
                      const [hours, minutes] = e.target.value.split(':').map(Number);
                      const newDate = formData.scheduledTime ? new Date(formData.scheduledTime) : new Date();
                      newDate.setHours(hours);
                      newDate.setMinutes(minutes);
                      updateFormData({ scheduledTime: newDate });
                    }}
                    disabled={isLoading}
                  />
                </div>
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              When was or will this meeting take place?
            </p>
          </div>

          {/* Use Previous Context */}
          {(formData.seriesOption === 'existing' || formData.seriesOption === 'new') && (
            <div className="space-y-4 p-4 rounded-lg border border-border bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="use-context" className="text-sm font-medium">
                    Use Context from Previous Meetings
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    AI will reference previous meeting minutes for better continuity
                  </p>
                </div>
                <Switch
                  id="use-context"
                  checked={formData.usePreviousContext}
                  onCheckedChange={(checked) => updateFormData({ usePreviousContext: checked })}
                  disabled={isLoading}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Meeting'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
