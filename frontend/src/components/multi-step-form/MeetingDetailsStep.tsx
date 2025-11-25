import React, { useEffect, useState } from 'react';
import { Calendar, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { MeetingFormData } from '../MultiStepMeetingForm';
import { meetingService } from '@/services/meetingService';
import { MeetingSeries } from '@/types/meeting';

interface MeetingDetailsStepProps {
  data: MeetingFormData;
  onUpdate: (updates: Partial<MeetingFormData>) => void;
}

export function MeetingDetailsStep({ data, onUpdate }: MeetingDetailsStepProps) {
  const [series, setSeries] = useState<MeetingSeries[]>([]);
  const [isLoadingSeries, setIsLoadingSeries] = useState(true);

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
    fetchSeries();
  }, []);

  return (
    <div className="space-y-6">
      {/* Meeting Title */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-sm font-medium">
          Meeting Title *
        </Label>
        <Input
          id="title"
          placeholder="e.g., Weekly Department Committee Meeting"
          value={data.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
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
          value={data.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          className="min-h-[100px] resize-y"
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
              checked={data.seriesOption === 'none'}
              onChange={() => onUpdate({ seriesOption: 'none', seriesId: undefined, newSeriesTitle: undefined })}
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
              checked={data.seriesOption === 'existing'}
              onChange={() => onUpdate({ seriesOption: 'existing', newSeriesTitle: undefined })}
              className="w-4 h-4"
            />
            <Label htmlFor="series-existing" className="cursor-pointer">
              Add to existing series
            </Label>
          </div>

          {data.seriesOption === 'existing' && (
            <div className="ml-6 space-y-2">
              <Select
                value={data.seriesId}
                onValueChange={(value) => onUpdate({ seriesId: value })}
                disabled={isLoadingSeries}
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
              checked={data.seriesOption === 'new'}
              onChange={() => onUpdate({ seriesOption: 'new', seriesId: undefined })}
              className="w-4 h-4"
            />
            <Label htmlFor="series-new" className="cursor-pointer">
              Create new series
            </Label>
          </div>

          {data.seriesOption === 'new' && (
            <div className="ml-6 space-y-2">
              <Input
                placeholder="Enter new series title"
                value={data.newSeriesTitle || ''}
                onChange={(e) => onUpdate({ newSeriesTitle: e.target.value })}
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
                !data.scheduledTime && "text-muted-foreground"
              )}
            >
              <Calendar className="mr-2 h-4 w-4" />
              {data.scheduledTime ? format(data.scheduledTime, "PPP 'at' p") : "Select date and time"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={data.scheduledTime}
              onSelect={(date) => {
                if (date) {
                  // Preserve time if already set, otherwise set to current time
                  const newDate = data.scheduledTime ? new Date(date) : new Date();
                  if (data.scheduledTime) {
                    newDate.setHours(data.scheduledTime.getHours());
                    newDate.setMinutes(data.scheduledTime.getMinutes());
                  }
                  onUpdate({ scheduledTime: newDate });
                }
              }}
              initialFocus
              className="pointer-events-auto"
            />
            <div className="p-3 border-t">
              <Input
                type="time"
                value={data.scheduledTime ? format(data.scheduledTime, "HH:mm") : ""}
                onChange={(e) => {
                  const [hours, minutes] = e.target.value.split(':').map(Number);
                  const newDate = data.scheduledTime ? new Date(data.scheduledTime) : new Date();
                  newDate.setHours(hours);
                  newDate.setMinutes(minutes);
                  onUpdate({ scheduledTime: newDate });
                }}
              />
            </div>
          </PopoverContent>
        </Popover>
        <p className="text-xs text-muted-foreground">
          When was or will this meeting take place?
        </p>
      </div>

      {/* Use Previous Context */}
      {(data.seriesOption === 'existing' || data.seriesOption === 'new') && (
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
              checked={data.usePreviousContext}
              onCheckedChange={(checked) => onUpdate({ usePreviousContext: checked })}
            />
          </div>
        </div>
      )}

      {/* Required Fields Notice */}
      <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <p className="font-medium mb-1">Required fields are marked with an asterisk (*)</p>
        <p>Complete all required fields to proceed to the next step.</p>
      </div>
    </div>
  );
}
