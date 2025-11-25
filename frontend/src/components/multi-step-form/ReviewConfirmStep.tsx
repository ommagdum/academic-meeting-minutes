import React from 'react';
import { MeetingFormData } from '../MultiStepMeetingForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Edit, Calendar, FileText, Music, Users, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface ReviewConfirmStepProps {
  data: MeetingFormData;
  onUpdate: (updates: Partial<MeetingFormData>) => void;
  onEditStep: (step: number) => void;
}

export function ReviewConfirmStep({ data, onUpdate, onEditStep }: ReviewConfirmStepProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const totalAgendaDuration = data.agendaItems.reduce(
    (sum, item) => sum + (item.estimatedDuration || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Meeting Details Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Meeting Details</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEditStep(1)}
            className="gap-1"
          >
            <Edit className="w-3 h-3" />
            Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="text-sm text-muted-foreground">Title</div>
            <div className="text-base font-medium">{data.title}</div>
          </div>

          {data.description && (
            <div>
              <div className="text-sm text-muted-foreground">Description</div>
              <div className="text-base">{data.description}</div>
            </div>
          )}

          <div>
            <div className="text-sm text-muted-foreground">Series</div>
            <div className="text-base">
              {data.seriesOption === 'none' && <Badge variant="outline">Standalone Meeting</Badge>}
              {data.seriesOption === 'existing' && (
                <Badge variant="secondary">Existing Series: {data.seriesId}</Badge>
              )}
              {data.seriesOption === 'new' && (
                <Badge variant="secondary">New Series: {data.newSeriesTitle}</Badge>
              )}
            </div>
          </div>

          {data.scheduledTime && (
            <div>
              <div className="text-sm text-muted-foreground">Scheduled</div>
              <div className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                {format(data.scheduledTime, "PPP p")}
              </div>
            </div>
          )}

          {data.usePreviousContext && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <Badge variant="outline">Using Previous Context</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agenda Summary Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Agenda</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEditStep(2)}
            className="gap-1"
          >
            <Edit className="w-3 h-3" />
            Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.agendaText && (
            <div>
              <div className="text-sm text-muted-foreground">Free-form Agenda</div>
              <div className="text-base whitespace-pre-wrap bg-muted/50 p-3 rounded">
                {data.agendaText}
              </div>
            </div>
          )}

          {data.agendaItems.length > 0 && (
            <div>
              <div className="text-sm text-muted-foreground mb-2">
                Structured Agenda ({data.agendaItems.length} items)
              </div>
              <div className="space-y-2">
                {data.agendaItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="p-3 bg-muted/30 rounded border border-border"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium">
                          {index + 1}. {item.title}
                        </div>
                        {item.description && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {item.description}
                          </div>
                        )}
                      </div>
                      {item.estimatedDuration && (
                        <Badge variant="outline" className="ml-2 gap-1">
                          <Clock className="w-3 h-3" />
                          {item.estimatedDuration}m
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {totalAgendaDuration > 0 && (
                <div className="text-sm text-muted-foreground mt-2">
                  Total estimated duration: <strong>{totalAgendaDuration} minutes</strong>
                </div>
              )}
            </div>
          )}

          {!data.agendaText && data.agendaItems.length === 0 && (
            <div className="text-muted-foreground text-sm">No agenda items added</div>
          )}
        </CardContent>
      </Card>

      {/* Audio File Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Audio File</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEditStep(3)}
            className="gap-1"
          >
            <Edit className="w-3 h-3" />
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          {data.audioFile ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded border border-border">
                <div className="flex items-center gap-3">
                  <Music className="w-8 h-8 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{data.audioFile.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatFileSize(data.audioFile.size)}
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
                  Ready
                </Badge>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground text-sm">No audio file uploaded</div>
          )}
        </CardContent>
      </Card>

      {/* Participants Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Participants</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEditStep(4)}
            className="gap-1"
          >
            <Edit className="w-3 h-3" />
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          {data.participantEmails.length > 0 ? (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                {data.participantEmails.length} participant{data.participantEmails.length !== 1 ? 's' : ''}
              </div>
              <div className="flex flex-wrap gap-2">
                {data.participantEmails.map((email, index) => (
                  <Badge key={index} variant="secondary">
                    {email}
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground text-sm">No participants added</div>
          )}
        </CardContent>
      </Card>

      {/* Processing Information */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-primary" />
            Processing Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            After submission, your meeting will be processed by our AI system:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
            <li>Audio transcription with speaker identification</li>
            <li>AI-powered content extraction based on agenda</li>
            <li>Meeting minutes generation and summarization</li>
            <li>Participant invitation emails (if provided)</li>
          </ul>
          <p className="font-medium text-primary mt-3">
            Estimated processing time: 2-5 minutes
          </p>
          <p className="text-muted-foreground">
            You'll be notified when your meeting minutes are ready.
          </p>
        </CardContent>
      </Card>

      {/* Confirmation Checkbox */}
      <div className="flex items-start space-x-3 p-4 bg-muted/50 rounded-lg border border-border">
        <Checkbox
          id="confirmation"
          checked={data.confirmation}
          onCheckedChange={(checked) => onUpdate({ confirmation: !!checked })}
          className="mt-1"
        />
        <Label
          htmlFor="confirmation"
          className="text-sm cursor-pointer leading-relaxed"
        >
          <strong>I confirm that all details are correct</strong> and I'm ready to submit this
          meeting for AI processing. I understand that the audio file will be transcribed and
          analyzed to generate meeting minutes.
        </Label>
      </div>
    </div>
  );
}
