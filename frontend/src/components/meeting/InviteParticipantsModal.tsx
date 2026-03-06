import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Trash2, 
  Mail, 
  UserPlus,
  Users,
  Import,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { meetingService } from '@/services/meetingService';

const MAX_PARTICIPANTS = 50;

interface InviteParticipantsModalProps {
  meetingId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (invitedCount: number) => void;
}

export function InviteParticipantsModal({ meetingId, isOpen, onClose, onSuccess }: InviteParticipantsModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [bulkEmailInput, setBulkEmailInput] = useState('');
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [participantEmails, setParticipantEmails] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState('');

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
    if (participantEmails.some(e => e.toLowerCase() === email.toLowerCase())) {
      toast({
        title: "Duplicate Email",
        description: "This email address has already been added.",
        variant: "destructive"
      });
      return;
    }

    // Check max participants
    if (participantEmails.length >= MAX_PARTICIPANTS) {
      toast({
        title: "Maximum Reached",
        description: `You can add a maximum of ${MAX_PARTICIPANTS} participants.`,
        variant: "destructive"
      });
      return;
    }

    setParticipantEmails(prev => [...prev, email]);
    setNewEmail('');

    toast({
      title: "Participant Added",
      description: `${email} has been added to the invitation list.`
    });
  };

  const removeParticipant = (email: string) => {
    setParticipantEmails(prev => prev.filter(e => e !== email));
    
    toast({
      title: "Participant Removed",
      description: `${email} has been removed from the invitation list.`
    });
  };

  const addBulkParticipants = () => {
    const emails = bulkEmailInput
      .split(/[,\n]/)
      .map(email => email.trim())
      .filter(email => email.length > 0);

    let addedCount = 0;
    const errors: string[] = [];
    const newEmails = [...participantEmails];

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
      setParticipantEmails(newEmails);
      
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

  const handleInvite = async () => {
    if (participantEmails.length === 0) {
      toast({
        title: "No Participants",
        description: "Please add at least one participant to invite.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const inviteData = {
        emails: participantEmails,
        message: customMessage.trim() || undefined
      };

      const response = await meetingService.inviteParticipants(meetingId, inviteData);
      
      toast({
        title: "Invitations Sent",
        description: `Successfully sent invitations to ${participantEmails.length} participant(s).`,
      });
      
      onSuccess?.(participantEmails.length);
      onClose();
      
      // Reset form
      setParticipantEmails([]);
      setCustomMessage('');
      setNewEmail('');
      setBulkEmailInput('');
      setShowBulkAdd(false);
      
    } catch (error) {
      console.error('Failed to invite participants:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send invitations';
      
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite Participants</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Information */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-medium text-blue-800 dark:text-blue-200">
                  Invite Additional Participants
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Add email addresses of participants you'd like to invite to this meeting. They will receive email invitations with access to the meeting minutes.
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
                    disabled={isLoading}
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
                          disabled={isLoading}
                          className="pl-9"
                        />
                      </div>
                      <Button 
                        onClick={addParticipant} 
                        disabled={!newEmail.trim() || participantEmails.length >= MAX_PARTICIPANTS || isLoading}
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
                    <Textarea
                      id="bulk-emails"
                      placeholder="Enter email addresses separated by commas or new lines:&#10;john@university.edu, jane@university.edu&#10;bob@university.edu"
                      value={bulkEmailInput}
                      onChange={(e) => setBulkEmailInput(e.target.value)}
                      disabled={isLoading}
                      className="w-full h-32 resize-y"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter one email per line or separate with commas
                    </p>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button onClick={addBulkParticipants} disabled={!bulkEmailInput.trim() || isLoading}>
                      Add All
                    </Button>
                    <Button variant="outline" onClick={() => setShowBulkAdd(false)} disabled={isLoading}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Custom Message */}
          <div className="space-y-2">
            <Label htmlFor="custom-message" className="text-sm font-medium">
              Custom Message (Optional)
            </Label>
            <Textarea
              id="custom-message"
              placeholder="Add a personal message to include in the invitation email..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              disabled={isLoading}
              className="min-h-[80px] resize-y"
            />
            <p className="text-xs text-muted-foreground">
              This message will be included in the invitation email sent to all participants.
            </p>
          </div>

          {/* Participants List */}
          {participantEmails.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <h3 className="text-lg font-semibold">
                  Invitation List ({participantEmails.length}/{MAX_PARTICIPANTS})
                </h3>
              </div>

              <div className="space-y-2">
                {participantEmails.map((email, index) => (
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
                          disabled={isLoading}
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

          {participantEmails.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No participants added yet</p>
              <p className="text-sm">
                Add participant email addresses above to send invitations.
              </p>
            </div>
          )}
        </div>

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
            onClick={handleInvite}
            disabled={participantEmails.length === 0 || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending Invitations...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Send Invitations ({participantEmails.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
