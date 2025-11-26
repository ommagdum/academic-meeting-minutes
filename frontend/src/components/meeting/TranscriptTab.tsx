import React, { useState, useEffect, useCallback } from 'react';
import { meetingService } from '@/services/meetingService';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, RefreshCw } from 'lucide-react';
import { Transcript, WordTimestamp } from '@/types/transcript';

interface TranscriptTabProps {
  meetingId: string;
}

export const TranscriptTab: React.FC<TranscriptTabProps> = ({ meetingId }) => {
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadTranscript = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await meetingService.getMeetingTranscript(meetingId);
      setTranscript(data);
    } catch (err) {
      console.error('Error loading transcript:', err);
      setError('Failed to load transcript. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to load transcript',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [meetingId, toast]);

  useEffect(() => {
    if (meetingId) {
      loadTranscript();
    }
  }, [meetingId, loadTranscript]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopyText = async () => {
    if (!transcript?.rawText) return;
    
    try {
      await navigator.clipboard.writeText(transcript.rawText);
      toast({
        title: 'Copied!',
        description: 'Transcript text copied to clipboard',
      });
    } catch (err) {
      console.error('Failed to copy text:', err);
      toast({
        title: 'Error',
        description: 'Failed to copy text to clipboard',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading transcript...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <div className="text-yellow-600 mb-4">
          <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-lg font-semibold mb-2">Transcript Not Available</h3>
          <p className="text-sm">{error}</p>
        </div>
        <Button
          onClick={loadTranscript}
          variant="outline"
          className="mt-4"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (!transcript) {
    return (
      <div className="text-center p-8">
        <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Transcript Available</h3>
        <p className="text-gray-600">The transcript for this meeting hasn't been generated yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with stats and actions */}
      <div className="flex flex-wrap justify-between items-center gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Duration</p>
            <p className="font-medium">{formatTime(transcript.audioDuration)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Processing Time</p>
            <p className="font-medium">{transcript.processingTime?.toFixed(2)}s</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyText}>
            <Copy className="w-4 h-4 mr-2" />
            Copy Text
          </Button>
          <Button variant="outline" size="sm" onClick={loadTranscript}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Transcript Content */}
      <Card>
        <CardContent className="p-6">
          <div className="prose max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-foreground">
              {transcript.rawText}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Metadata */}
      <div className="text-xs text-muted-foreground mt-6 pt-4 border-t">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <span className="font-medium">Language:</span> {transcript.language || 'N/A'}
          </div>
          <div>
            <span className="font-medium">Device:</span> {transcript.deviceUsed || 'N/A'}
          </div>
          <div>
            <span className="font-medium">Generated:</span> {new Date(transcript.createdAt).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranscriptTab;
