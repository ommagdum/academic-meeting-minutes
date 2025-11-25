import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { MeetingDetailsStep } from './multi-step-form/MeetingDetailsStep';
import { AgendaItemsStep } from './multi-step-form/AgendaItemsStep';
import { AudioUploadStep } from './multi-step-form/AudioUploadStep';
import { ParticipantsStep } from './multi-step-form/ParticipantsStep';
import { ReviewConfirmStep } from './multi-step-form/ReviewConfirmStep';

export interface MeetingFormData {
  // Step 1: Meeting Basic Information
  title: string;
  description?: string;
  seriesOption: 'none' | 'existing' | 'new';
  seriesId?: string;
  newSeriesTitle?: string;
  scheduledTime?: Date;
  usePreviousContext: boolean;
  
  // Step 2: Agenda Setup
  agendaText?: string;
  agendaItems: Array<{
    id: string;
    title: string;
    description?: string;
    estimatedDuration?: number;
    orderIndex: number;
  }>;
  
  // Step 3: Audio Upload
  audioFile: File | null;
  
  // Step 4: Participants
  participantEmails: string[];
  
  // Step 5: Review & Confirm
  confirmation: boolean;
}

const STEPS = [
  {
    id: 1,
    title: 'Meeting Details',
    description: 'Basic information about your meeting'
  },
  {
    id: 2,
    title: 'Agenda Setup',
    description: 'Add topics for AI-powered content extraction'
  },
  {
    id: 3,
    title: 'Audio Upload',
    description: 'Upload meeting recording for transcription'
  },
  {
    id: 4,
    title: 'Participants',
    description: 'Add participant email addresses'
  },
  {
    id: 5,
    title: 'Review & Confirm',
    description: 'Review all details before submission'
  }
];

interface MultiStepMeetingFormProps {
  onSubmit: (data: MeetingFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<MeetingFormData>;
}

export function MultiStepMeetingForm({ onSubmit, onCancel, initialData }: MultiStepMeetingFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const { toast } = useToast();

  const [formData, setFormData] = useState<MeetingFormData>({
    // Meeting Details
    title: '',
    description: '',
    seriesOption: 'none',
    seriesId: undefined,
    newSeriesTitle: undefined,
    scheduledTime: undefined,
    usePreviousContext: false,
    
    // Agenda Items
    agendaText: '',
    agendaItems: [],
    
    // Audio Upload
    audioFile: null,
    
    // Participants
    participantEmails: [],
    
    // Review & Confirm
    confirmation: false,
    
    ...initialData
  });

  const updateFormData = useCallback((updates: Partial<MeetingFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const validateStep = useCallback((step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.title || formData.title.length < 3) return false;
        if (formData.seriesOption === 'existing' && !formData.seriesId) return false;
        if (formData.seriesOption === 'new' && (!formData.newSeriesTitle || formData.newSeriesTitle.length < 2)) return false;
        return true;
      case 2:
        return !!(formData.agendaText || formData.agendaItems.length > 0);
      case 3:
        return !!formData.audioFile;
      case 4:
        // Participants are optional
        return true;
      case 5:
        return formData.confirmation;
      default:
        return false;
    }
  }, [formData]);

  const handleNext = useCallback(() => {
    if (validateStep(currentStep)) {
      setCompletedSteps(prev => [...prev, currentStep]);
      if (currentStep < STEPS.length) {
        setCurrentStep(currentStep + 1);
      }
    } else {
      toast({
        title: "Incomplete Step",
        description: "Please fill in all required fields before proceeding.",
        variant: "destructive"
      });
    }
  }, [currentStep, validateStep, toast]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleStepClick = useCallback((step: number) => {
    if (step <= currentStep || completedSteps.includes(step)) {
      setCurrentStep(step);
    }
  }, [currentStep, completedSteps]);

  const handleSubmit = useCallback(async () => {
    if (!validateStep(5)) {
      toast({
        title: "Incomplete Form",
        description: "Please confirm all details before submitting.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      toast({
        title: "Meeting Created Successfully!",
        description: "AI processing started. You'll be notified when minutes are ready (2-5 minutes)."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create meeting. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateStep, onSubmit, toast]);

  const progress = (currentStep / STEPS.length) * 100;

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <MeetingDetailsStep
            data={formData}
            onUpdate={updateFormData}
          />
        );
      case 2:
        return (
          <AgendaItemsStep
            data={formData}
            onUpdate={updateFormData}
          />
        );
      case 3:
        return (
          <AudioUploadStep
            data={formData}
            onUpdate={updateFormData}
          />
        );
      case 4:
        return (
          <ParticipantsStep
            data={formData}
            onUpdate={updateFormData}
          />
        );
      case 5:
        return (
          <ReviewConfirmStep
            data={formData}
            onUpdate={updateFormData}
            onEditStep={setCurrentStep}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Create New Meeting</h1>
        <p className="text-muted-foreground">
          Set up your meeting for AI-powered minutes extraction
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-foreground">
            Step {currentStep} of {STEPS.length}
          </span>
          <span className="text-sm text-muted-foreground">
            {Math.round(progress)}% Complete
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Navigation */}
      <div className="flex justify-center">
        <div className="flex space-x-4">
          {STEPS.map((step) => (
            <button
              key={step.id}
              onClick={() => handleStepClick(step.id)}
              className={cn(
                "flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200",
                "hover:bg-muted/50",
                currentStep === step.id && "bg-primary text-primary-foreground",
                completedSteps.includes(step.id) && currentStep !== step.id && "bg-muted text-muted-foreground",
                step.id > currentStep && !completedSteps.includes(step.id) && "opacity-50 cursor-not-allowed"
              )}
              disabled={step.id > currentStep && !completedSteps.includes(step.id)}
            >
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                completedSteps.includes(step.id) && "bg-green-500 text-white"
              )}>
                {completedSteps.includes(step.id) ? (
                  <Check className="w-3 h-3" />
                ) : (
                  step.id
                )}
              </div>
              <div className="hidden sm:block">
                <div className="font-medium text-sm">{step.title}</div>
                <div className="text-xs opacity-75">{step.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Badge variant="outline">{currentStep}</Badge>
            <span>{STEPS.find(s => s.id === currentStep)?.title}</span>
          </CardTitle>
          <CardDescription>
            {STEPS.find(s => s.id === currentStep)?.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderStep()}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <div className="flex space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
          {currentStep > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              className={cn(
                currentStep === STEPS.length
                  ? "bg-transparent text-white border-white hover:bg-white hover:text-black"
                  : undefined
              )}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
          )}
        </div>

        <div className="flex space-x-2">
          {currentStep < STEPS.length ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={!validateStep(currentStep)}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !validateStep(5)}
            >
              {isSubmitting ? 'Creating...' : 'Create Meeting'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}