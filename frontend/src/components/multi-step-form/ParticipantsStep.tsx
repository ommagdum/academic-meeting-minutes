import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Trash2, 
  Mail, 
  UserPlus,
  Users,
  Import,
  Download,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { MeetingFormData } from '../MultiStepMeetingForm';

interface ParticipantsStepProps {
  data: MeetingFormData;
  onUpdate: (updates: Partial<MeetingFormData>) => void;
}

const MAX_PARTICIPANTS = 50;

export function ParticipantsStep({ data, onUpdate }: ParticipantsStepProps) {
  const [newEmail, setNewEmail] = useState('');
  const [bulkEmailInput, setBulkEmailInput] = useState('');
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const { toast } = useToast();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const addParticipant = () => {
    const email = newEmail.trim();
    
    if (!email) {
      toast({
        title: "Missing Email",
        description: "Please enter an email address.",
        variant: "destructive"
      });
      return;
    }

    if (!validateEmail(email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }

    // Check for duplicate emails
    if (data.participantEmails.some(e => e.toLowerCase() === email.toLowerCase())) {
      toast({
        title: "Duplicate Email",
        description: "This email address has already been added.",
        variant: "destructive"
      });
      return;
    }

    // Check max participants
    if (data.participantEmails.length >= MAX_PARTICIPANTS) {
      toast({
        title: "Maximum Reached",
        description: `You can add a maximum of ${MAX_PARTICIPANTS} participants.`,
        variant: "destructive"
      });
      return;
    }

    onUpdate({
      participantEmails: [...data.participantEmails, email]
    });

    setNewEmail('');

    toast({
      title: "Participant Added",
      description: `${email} has been added to the meeting.`
    });
  };

  const removeParticipant = (email: string) => {
    onUpdate({
      participantEmails: data.participantEmails.filter(e => e !== email)
    });
    
    toast({
      title: "Participant Removed",
      description: `${email} has been removed from the meeting.`
    });
  };

  const addBulkParticipants = () => {
    const emails = bulkEmailInput
      .split(/[,\n]/)
      .map(email => email.trim())
      .filter(email => email.length > 0);

    let addedCount = 0;
    const errors: string[] = [];
    const newEmails = [...data.participantEmails];

    emails.forEach(email => {
      if (!validateEmail(email)) {
        errors.push(`Invalid email: ${email}`);
        return;
      }

      if (newEmails.some(e => e.toLowerCase() === email.toLowerCase())) {
        errors.push(`Duplicate email: ${email}`);
        return;
      }

      if (newEmails.length >= MAX_PARTICIPANTS) {
        errors.push(`Maximum of ${MAX_PARTICIPANTS} participants reached`);
        return;
      }

      newEmails.push(email);
      addedCount++;
    });

    if (addedCount > 0) {
      onUpdate({ participantEmails: newEmails });
      
      toast({
        title: "Participants Added",
        description: `${addedCount} participant(s) added successfully.`
      });
    }

    if (errors.length > 0) {
      toast({
        title: `${errors.length} Error(s)`,
        description: errors.slice(0, 3).join(', ') + (errors.length > 3 ? '...' : ''),
        variant: "destructive"
      });
    }

    setBulkEmailInput('');
    setShowBulkAdd(false);
  };

  const exportParticipantList = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Email\n" +
      data.participantEmails.map(email => `"${email}"`).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "meeting_participants.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Information */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-medium text-blue-800 dark:text-blue-200">
              Participant Email Addresses
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Add email addresses of meeting participants. They will receive invitations and have access to the meeting minutes once processed.
            </p>
          </div>
        </div>
      </div>

      {/* Add Single Participant */}
      <Card className="border-dashed border-2">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center">
              <Plus className="mr-2 h-5 w-5" />
              Add Participant
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkAdd(!showBulkAdd)}
              >
                <Import className="w-4 h-4 mr-2" />
                Bulk Add
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showBulkAdd ? (
            // Single participant form
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="participant-email">Email Address</Label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="participant-email"
                      type="email"
                      placeholder="participant@university.edu"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addParticipant();
                        }
                      }}
                      className="pl-9"
                    />
                  </div>
                  <Button 
                    onClick={addParticipant} 
                    disabled={!newEmail.trim() || data.participantEmails.length >= MAX_PARTICIPANTS}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Press Enter or click Add to include the participant
                </p>
              </div>
            </div>
          ) : (
            // Bulk add form
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bulk-emails">Email Addresses</Label>
                <textarea
                  id="bulk-emails"
                  placeholder="Enter email addresses separated by commas or new lines:&#10;john@university.edu, jane@university.edu&#10;bob@university.edu"
                  value={bulkEmailInput}
                  onChange={(e) => setBulkEmailInput(e.target.value)}
                  className="w-full h-32 px-3 py-2 border border-input bg-background rounded-md text-sm resize-y"
                />
                <p className="text-xs text-muted-foreground">
                  Enter one email per line or separate with commas
                </p>
              </div>
              
              <div className="flex space-x-2">
                <Button onClick={addBulkParticipants} disabled={!bulkEmailInput.trim()}>
                  Add All
                </Button>
                <Button variant="outline" onClick={() => setShowBulkAdd(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Participants List */}
      {data.participantEmails.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <h3 className="text-lg font-semibold">
                Meeting Participants ({data.participantEmails.length}/{MAX_PARTICIPANTS})
              </h3>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={exportParticipantList}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <div className="space-y-2">
            {data.participantEmails.map((email, index) => (
              <Card key={email} className="relative">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <Badge variant="secondary" className="text-xs">
                        {index + 1}
                      </Badge>
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{email}</span>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeParticipant(email)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {data.participantEmails.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">No participants added yet</p>
          <p className="text-sm">
            Add participant email addresses above. This step is optional.
          </p>
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <p className="font-medium mb-1">Note about participants</p>
        <p>
          Participants are optional. You can add them now or later. All participants will receive email invitations with access to the meeting minutes.
        </p>
      </div>
    </div>
  );
}
