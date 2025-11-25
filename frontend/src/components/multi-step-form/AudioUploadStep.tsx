import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  X, 
  CheckCircle, 
  AlertCircle, 
  FileAudio,
  Clock,
  HardDrive
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { MeetingFormData } from '../MultiStepMeetingForm';

interface AudioUploadStepProps {
  data: MeetingFormData;
  onUpdate: (updates: Partial<MeetingFormData>) => void;
}

const SUPPORTED_FORMATS = ['mp3', 'wav', 'm4a', 'flac', 'ogg', 'webm'];
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

export function AudioUploadStep({ data, onUpdate }: AudioUploadStepProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const { toast } = useToast();

  const validateFile = (file: File): boolean => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File Too Large",
        description: `File size must be less than 500MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`,
        variant: "destructive"
      });
      return false;
    }

    // Check file format
    const extension = file.name.toLowerCase().split('.').pop();
    if (!extension || !SUPPORTED_FORMATS.includes(extension)) {
      toast({
        title: "Unsupported Format",
        description: `Please upload a file in one of these formats: ${SUPPORTED_FORMATS.join(', ').toUpperCase()}`,
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleFileSelect = useCallback((file: File) => {
    if (!validateFile(file)) return;

    // Create audio preview URL
    const audioUrl = URL.createObjectURL(file);
    setAudioPreview(audioUrl);
    
    onUpdate({ audioFile: file });

    // Simulate upload progress for demo
    setIsUploading(true);
    setUploadProgress(0);
    
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setIsUploading(false);
          toast({
            title: "Upload Complete",
            description: "Audio file uploaded successfully!"
          });
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  }, [onUpdate, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const removeFile = () => {
    if (audioPreview) {
      URL.revokeObjectURL(audioPreview);
      setAudioPreview(null);
    }
    setUploadProgress(0);
    setIsUploading(false);
    onUpdate({ audioFile: null });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      {!data.audioFile ? (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            isDragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
            "hover:bg-muted/50"
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          <div className="space-y-4">
            <div className="mx-auto">
              <Upload className={cn(
                "w-16 h-16 mx-auto",
                isDragOver ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">
                Upload Meeting Audio
              </h3>
              <p className="text-muted-foreground mb-4">
                Drag and drop your audio file here, or click to browse
              </p>
              
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {SUPPORTED_FORMATS.map(format => (
                  <Badge key={format} variant="outline" className="text-xs">
                    {format.toUpperCase()}
                  </Badge>
                ))}
              </div>
              
              <Button asChild>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept={SUPPORTED_FORMATS.map(f => `.${f}`).join(',')}
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  Browse Files
                </label>
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground">
              Maximum file size: 500MB
            </p>
          </div>
        </div>
      ) : (
        /* File Preview */
        <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <FileAudio className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-green-800 dark:text-green-200">
                    {data.audioFile.name}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <HardDrive className="w-4 h-4" />
                    <span>{formatFileSize(data.audioFile.size)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>Processing will take ~2-5 minutes</span>
                  </div>
                </div>
                
                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}
                
                {!isUploading && uploadProgress === 100 && (
                  <div className="flex items-center space-x-2 text-sm text-green-600 dark:text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span>Ready for processing</span>
                  </div>
                )}
                
                {/* Audio Preview */}
                {audioPreview && !isUploading && (
                  <div className="space-y-2">
                    <audio
                      src={audioPreview}
                      controls
                      className="w-full max-w-md"
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing Information */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="space-y-2">
            <h4 className="font-medium text-blue-800 dark:text-blue-200">
              Processing Information
            </h4>
            <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <p>• Audio transcription typically takes 2-5 minutes depending on file length</p>
              <p>• AI extraction and minute generation adds another 1-2 minutes</p>
              <p>• You'll receive real-time updates on processing status</p>
              <p>• The meeting will be accessible once processing is complete</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
