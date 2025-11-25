# Multi-Step Meeting Form - Implementation Guide

## Overview

The Multi-Step Meeting Form is a comprehensive wizard-style interface for creating meetings with audio processing, participant management, and agenda planning capabilities.

## Architecture

### Component Structure

```
CreateMeeting (Page)
  └── MultiStepMeetingForm (Container)
        ├── Step Progress Indicator
        ├── Step Content Renderer
        │     ├── MeetingDetailsStep
        │     ├── AgendaItemsStep
        │     ├── AudioUploadStep
        │     ├── ParticipantsStep
        │     └── ReviewConfirmStep
        └── Navigation Controls
```

## Form Data Structure

```typescript
interface MeetingFormData {
  // Meeting Details (Step 1)
  title: string;
  description: string;
  scheduledTime: string;
  seriesOption: 'standalone' | 'existing' | 'new';
  selectedSeriesId?: string;
  newSeriesTitle?: string;
  usePreviousContext: boolean;

  // Agenda Items (Step 2)
  agendaItems: AgendaItem[];

  // Audio Upload (Step 3)
  audioFile: File | null;

  // Participants (Step 4)
  participantEmails: string[];

  // Review & Confirm (Step 5)
  confirmed: boolean;
}

interface AgendaItem {
  title: string;
  description?: string;
  estimatedDuration: number;
  orderIndex: number;
}
```

## Implementation Steps

### Step 1: Meeting Details

**Purpose**: Collect basic meeting information and series management.

**Fields**:
- `title` (required): Meeting title, max 200 characters
- `description` (optional): Meeting description, max 1000 characters
- `scheduledTime` (optional): Date and time picker
- `seriesOption` (required): Radio buttons with 3 options
  - `standalone`: Single meeting
  - `existing`: Add to existing series (shows dropdown)
  - `new`: Create new series (shows input field)
- `usePreviousContext` (conditional): Only shown for series meetings

**Validation**:
```typescript
const validateMeetingDetails = (data: MeetingFormData): boolean => {
  if (!data.title || data.title.trim().length === 0) {
    toast.error("Meeting title is required");
    return false;
  }
  
  if (data.title.length > 200) {
    toast.error("Title must be less than 200 characters");
    return false;
  }

  if (data.seriesOption === 'existing' && !data.selectedSeriesId) {
    toast.error("Please select a series");
    return false;
  }

  if (data.seriesOption === 'new' && !data.newSeriesTitle) {
    toast.error("Please enter a series title");
    return false;
  }

  return true;
};
```

**Data Fetching**:
```typescript
useEffect(() => {
  const fetchSeries = async () => {
    try {
      const data = await meetingService.getMeetingSeries();
      setSeries(data);
    } catch (error) {
      toast.error("Failed to load meeting series");
    }
  };
  fetchSeries();
}, []);
```

### Step 2: Agenda Items

**Purpose**: Define meeting agenda with predefined templates or custom items.

**Features**:
- **Templates**: Quick-start templates (Daily Standup, Sprint Planning, etc.)
- **Custom Items**: Add/edit/remove agenda items
- **Reordering**: Drag-and-drop support (optional enhancement)
- **Duration Tracking**: Auto-calculate total estimated duration

**Validation**:
```typescript
const validateAgenda = (data: MeetingFormData): boolean => {
  // Agenda is optional, but if items exist, validate them
  if (data.agendaItems.length > 0) {
    for (const item of data.agendaItems) {
      if (!item.title || item.title.trim().length === 0) {
        toast.error("All agenda items must have a title");
        return false;
      }
      if (item.estimatedDuration <= 0) {
        toast.error("Duration must be greater than 0");
        return false;
      }
    }
  }
  return true;
};
```

**Template Implementation**:
```typescript
const AGENDA_TEMPLATES = [
  {
    name: "Daily Standup",
    items: [
      { 
        title: "What did you do yesterday?", 
        estimatedDuration: 5,
        description: "Team members share yesterday's progress"
      },
      { 
        title: "What will you do today?", 
        estimatedDuration: 5,
        description: "Team members outline today's tasks"
      },
      { 
        title: "Any blockers?", 
        estimatedDuration: 5,
        description: "Discuss any obstacles or challenges"
      }
    ]
  },
  // ... more templates
];

const loadTemplate = (template: AgendaTemplate) => {
  const items = template.items.map((item, index) => ({
    ...item,
    orderIndex: index
  }));
  onUpdate({ agendaItems: items });
};
```

### Step 3: Audio Upload

**Purpose**: Upload meeting audio file for transcription and AI processing.

**Features**:
- Drag-and-drop interface
- File validation (format, size)
- Upload progress indicator
- Audio preview player
- File removal capability

**File Validation**:
```typescript
const SUPPORTED_FORMATS = ['.mp3', '.wav', '.m4a', '.ogg', '.webm'];
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

const validateFile = (file: File): boolean => {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    toast.error(`File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`);
    return false;
  }

  // Check file format
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!SUPPORTED_FORMATS.includes(extension)) {
    toast.error(`Unsupported format. Please use: ${SUPPORTED_FORMATS.join(', ')}`);
    return false;
  }

  return true;
};
```

**Upload Simulation** (for preview):
```typescript
const handleFileSelect = async (file: File) => {
  if (!validateFile(file)) return;

  setUploading(true);
  setUploadProgress(0);

  // Create audio preview
  const audioUrl = URL.createObjectURL(file);
  setAudioPreviewUrl(audioUrl);

  // Simulate upload progress
  const interval = setInterval(() => {
    setUploadProgress(prev => {
      if (prev >= 100) {
        clearInterval(interval);
        setUploading(false);
        onUpdate({ audioFile: file });
        return 100;
      }
      return prev + 10;
    });
  }, 300);
};
```

**Step Validation**:
```typescript
const validateAudio = (data: MeetingFormData): boolean => {
  if (!data.audioFile) {
    toast.error("Please upload an audio file");
    return false;
  }
  return true;
};
```

### Step 4: Participants

**Purpose**: Add and manage meeting participants via email.

**Features**:
- Single email entry
- Bulk email import (comma/newline separated)
- Email validation
- Duplicate detection
- Export participant list (CSV)
- Maximum participant limit (optional)

**Email Validation**:
```typescript
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

const addParticipant = () => {
  const email = newEmail.trim();

  if (!email) {
    toast.error("Please enter an email address");
    return;
  }

  if (!validateEmail(email)) {
    toast.error("Please enter a valid email address");
    return;
  }

  if (data.participantEmails.includes(email)) {
    toast.error("This participant has already been added");
    return;
  }

  onUpdate({ 
    participantEmails: [...data.participantEmails, email] 
  });
  setNewEmail("");
  toast.success("Participant added");
};
```

**Bulk Import**:
```typescript
const addBulkParticipants = () => {
  const emails = bulkEmailInput
    .split(/[,\n]/)
    .map(e => e.trim())
    .filter(e => e.length > 0);

  const validEmails: string[] = [];
  const invalidEmails: string[] = [];
  const duplicates: string[] = [];

  emails.forEach(email => {
    if (!validateEmail(email)) {
      invalidEmails.push(email);
    } else if (data.participantEmails.includes(email) || validEmails.includes(email)) {
      duplicates.push(email);
    } else {
      validEmails.push(email);
    }
  });

  if (validEmails.length > 0) {
    onUpdate({ 
      participantEmails: [...data.participantEmails, ...validEmails] 
    });
    toast.success(`Added ${validEmails.length} participant(s)`);
  }

  if (invalidEmails.length > 0) {
    toast.error(`${invalidEmails.length} invalid email(s) skipped`);
  }

  if (duplicates.length > 0) {
    toast.warning(`${duplicates.length} duplicate(s) skipped`);
  }

  setBulkEmailInput("");
  setShowBulkAdd(false);
};
```

**CSV Export**:
```typescript
const exportParticipantList = () => {
  const csv = data.participantEmails.join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${data.title || 'meeting'}-participants.csv`;
  link.click();
  URL.revokeObjectURL(url);
};
```

**Step Validation**:
```typescript
const validateParticipants = (data: MeetingFormData): boolean => {
  // Participants are optional
  return true;
};
```

### Step 5: Review & Confirm

**Purpose**: Review all entered information before submission.

**Display Sections**:
1. Meeting details summary
2. Series information (if applicable)
3. Agenda items list
4. Audio file info
5. Participant list
6. Confirmation checkbox

**Validation**:
```typescript
const validateReview = (data: MeetingFormData): boolean => {
  if (!data.confirmed) {
    toast.error("Please confirm the information is correct");
    return false;
  }
  return true;
};
```

## State Management

### Container Component Pattern

```typescript
const MultiStepMeetingForm: React.FC<MultiStepMeetingFormProps> = ({
  onSubmit,
  onCancel,
  initialData
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [formData, setFormData] = useState<MeetingFormData>(
    initialData || DEFAULT_FORM_DATA
  );

  // Update form data from child steps
  const updateFormData = useCallback((updates: Partial<MeetingFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  // Validate current step before proceeding
  const validateStep = useCallback((stepIndex: number): boolean => {
    switch (stepIndex) {
      case 0: return validateMeetingDetails(formData);
      case 1: return validateAgenda(formData);
      case 2: return validateAudio(formData);
      case 3: return validateParticipants(formData);
      case 4: return validateReview(formData);
      default: return true;
    }
  }, [formData]);

  // Navigation handlers
  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (!completedSteps.includes(currentStep)) {
        setCompletedSteps([...completedSteps, currentStep]);
      }
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleStepClick = (stepIndex: number) => {
    // Allow navigation to completed steps or current step
    if (stepIndex <= currentStep || completedSteps.includes(stepIndex)) {
      setCurrentStep(stepIndex);
    }
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    try {
      await onSubmit(formData);
    } catch (error) {
      toast.error("Failed to create meeting");
    }
  };

  return (
    // ... render form
  );
};
```

## Navigation Flow

### Step Progress Indicator

```typescript
<div className="flex items-center justify-between mb-8">
  {STEPS.map((step, index) => (
    <React.Fragment key={step.id}>
      <div 
        className={cn(
          "flex flex-col items-center cursor-pointer",
          index > currentStep && !completedSteps.includes(index) && "opacity-50"
        )}
        onClick={() => handleStepClick(index)}
      >
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center",
          index === currentStep && "bg-primary text-primary-foreground",
          completedSteps.includes(index) && "bg-green-500 text-white",
          index !== currentStep && !completedSteps.includes(index) && "bg-muted"
        )}>
          {completedSteps.includes(index) ? (
            <Check className="w-5 h-5" />
          ) : (
            <span>{index + 1}</span>
          )}
        </div>
        <span className="text-xs mt-2">{step.title}</span>
      </div>
      {index < STEPS.length - 1 && (
        <div className={cn(
          "flex-1 h-0.5 mx-2",
          completedSteps.includes(index) ? "bg-green-500" : "bg-muted"
        )} />
      )}
    </React.Fragment>
  ))}
</div>
```

### Navigation Buttons

```typescript
<div className="flex justify-between mt-8">
  <Button
    type="button"
    variant="outline"
    onClick={currentStep === 0 ? onCancel : handlePrevious}
  >
    {currentStep === 0 ? "Cancel" : "Previous"}
  </Button>

  {currentStep < STEPS.length - 1 ? (
    <Button type="button" onClick={handleNext}>
      Next
    </Button>
  ) : (
    <Button type="button" onClick={handleSubmit}>
      Create Meeting
    </Button>
  )}
</div>
```

## Submission Flow

### API Integration Sequence

```typescript
const handleSubmit = async (data: MeetingFormData) => {
  setIsProcessing(true);

  try {
    // Step 1: Create meeting
    const meeting = await meetingService.createMeeting({
      title: data.title,
      description: data.description,
      scheduledTime: data.scheduledTime,
      agendaItems: data.agendaItems,
      usePreviousContext: data.usePreviousContext,
      seriesId: data.seriesOption === 'existing' ? data.selectedSeriesId : undefined,
      newSeriesTitle: data.seriesOption === 'new' ? data.newSeriesTitle : undefined
    });

    toast.success("Meeting created successfully");

    // Step 2: Upload audio file
    if (data.audioFile) {
      await meetingService.uploadAudio(meeting.id, data.audioFile);
      toast.success("Audio file uploaded");
    }

    // Step 3: Invite participants
    if (data.participantEmails.length > 0) {
      await meetingService.inviteParticipants(meeting.id, data.participantEmails);
      toast.success("Participants invited");
    }

    // Step 4: Start AI processing
    await meetingService.startProcessing(meeting.id);
    toast.success("AI processing started");

    // Navigate to meeting detail page
    navigate(`/meetings/${meeting.id}`);

  } catch (error) {
    toast.error("Failed to create meeting");
    console.error(error);
  } finally {
    setIsProcessing(false);
  }
};
```

## Best Practices

### 1. State Management
- Keep form state in parent container
- Pass down `data` and `onUpdate` to child steps
- Use callback pattern for updates to prevent unnecessary re-renders

### 2. Validation
- Validate on step transition, not on every input change
- Provide clear, actionable error messages
- Allow users to navigate back to fix errors

### 3. User Experience
- Show progress clearly
- Allow navigation to completed steps
- Provide helpful placeholder text and examples
- Show loading states during async operations

### 4. Performance
- Use `React.memo()` for step components if needed
- Debounce expensive operations (e.g., file validation)
- Clean up object URLs to prevent memory leaks

### 5. Accessibility
- Use semantic HTML (`<form>`, `<label>`, etc.)
- Provide keyboard navigation support
- Include ARIA labels for screen readers
- Ensure sufficient color contrast

## Error Handling

### Network Errors
```typescript
try {
  await apiCall();
} catch (error) {
  if (error.response?.status === 401) {
    toast.error("Session expired. Please log in again");
    navigate('/auth');
  } else if (error.response?.status === 413) {
    toast.error("File size too large");
  } else {
    toast.error("An error occurred. Please try again");
  }
}
```

### Validation Errors
```typescript
// Show specific field errors
if (!data.title) {
  toast.error("Meeting title is required");
  return false;
}

// Aggregate multiple errors
const errors = [];
if (!data.title) errors.push("title");
if (!data.audioFile) errors.push("audio file");

if (errors.length > 0) {
  toast.error(`Please provide: ${errors.join(', ')}`);
  return false;
}
```

## Testing Considerations

### Unit Tests
- Test validation functions independently
- Test state updates and transformations
- Test error handling logic

### Component Tests
- Test step navigation flow
- Test form data updates
- Test validation on step transitions
- Test submission flow

### Integration Tests
- Test complete form submission
- Test API integration
- Test error scenarios
- Test file upload flow

## Cursor AI Implementation Prompts

### Create Meeting Details Step
```
Create the MeetingDetailsStep component for a multi-step form:

Requirements:
- Input for meeting title (required, max 200 chars)
- Textarea for description (optional, max 1000 chars)
- Date/time picker for scheduledTime
- Radio buttons for seriesOption: standalone, existing, new
- Conditional dropdown for existing series (fetch from API)
- Conditional input for new series title
- Conditional switch for usePreviousContext (only for series)
- Use shadcn/ui components (Input, Textarea, RadioGroup, Select, Popover, Calendar, Switch)
- Fetch series list on mount using meetingService.getMeetingSeries()
- Update parent via onUpdate callback

Props: { data: MeetingFormData, onUpdate: (updates: Partial<MeetingFormData>) => void }
```

### Create Audio Upload Step
```
Create the AudioUploadStep component for audio file upload:

Requirements:
- Drag-and-drop zone for audio files
- File input for browsing files
- Validate file format: .mp3, .wav, .m4a, .ogg, .webm
- Validate file size: max 500MB
- Show upload progress bar
- Display file preview card with name, size, and audio player
- Allow file removal
- Use toast notifications for validation errors
- Update parent with audioFile on successful upload

Props: { data: MeetingFormData, onUpdate: (updates: Partial<MeetingFormData>) => void }
```

---

**End of Guide**

For implementation assistance with specific steps, refer to the source files:
- `src/components/MultiStepMeetingForm.tsx`
- `src/components/multi-step-form/MeetingDetailsStep.tsx`
- `src/components/multi-step-form/AgendaItemsStep.tsx`
- `src/components/multi-step-form/AudioUploadStep.tsx`
- `src/components/multi-step-form/ParticipantsStep.tsx`
- `src/components/multi-step-form/ReviewConfirmStep.tsx`
