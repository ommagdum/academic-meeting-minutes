import React, { useState, useEffect, useRef } from 'react';
import { ActionItem, Attendee } from '@/types/meeting';
import { User } from '@/types/user';
import { meetingService } from '@/services/meetingService';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { User as UserIcon, ArrowUpDown, Loader2, Edit2, Trash2, Check, X } from 'lucide-react';

interface TaskItemProps {
  task: ActionItem;
  meetingId: string;
  isOrganizer: boolean;
  currentUser: User | null;
  attendees: Attendee[];
  onTaskUpdate: (updatedTask: ActionItem) => void;
  onTaskDelete?: (taskId: string) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  meetingId,
  isOrganizer,
  currentUser,
  attendees,
  onTaskUpdate,
  onTaskDelete
}) => {
  const { toast } = useToast();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isReassigning, setIsReassigning] = useState(false);
  const [showReassignDropdown, setShowReassignDropdown] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const reassignDropdownRef = useRef<HTMLDivElement>(null);

  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(task.description);
  const [isSavingDescription, setIsSavingDescription] = useState(false);

  const [isEditingDeadline, setIsEditingDeadline] = useState(false);
  const [editedDeadline, setEditedDeadline] = useState(task.deadline ? format(new Date(task.deadline), 'yyyy-MM-dd') : '');
  const [isSavingDeadline, setIsSavingDeadline] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check if current user is the assignee
  const isAssignee = task.assignedToUser?.id === currentUser?.id || 
                    task.assignedToEmail === currentUser?.email;

  // Get available status options based on user role
  const getStatusOptions = () => {
    if (isOrganizer) {
      return ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'OVERDUE'];
    } else if (isAssignee) {
      return ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
    } else {
      return [];
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'OVERDUE':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle status change
  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === task.status) return;

    setIsUpdatingStatus(true);
    
    try {
      const updatedTask = await meetingService.updateTaskStatus(task.id, newStatus);
      onTaskUpdate(updatedTask);
      
      toast({
        title: "Status Updated",
        description: "Task status has been updated successfully.",
      });
    } catch (error) {
      console.error('Failed to update task status:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update task status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle task reassignment
  const handleReassign = async (assigneeEmail: string) => {
    if (assigneeEmail === (task.assignedToUser?.email || task.assignedToEmail)) {
      setShowReassignDropdown(false);
      return;
    }

    setIsReassigning(true);
    
    try {
      const updatedTask = await meetingService.reassignTask(task.id, assigneeEmail);
      onTaskUpdate(updatedTask);
      setShowReassignDropdown(false);
      
      toast({
        title: "Task Reassigned",
        description: `Task has been reassigned to ${assigneeEmail}.`,
      });
    } catch (error) {
      console.error('Failed to reassign task:', error);
      toast({
        title: "Reassignment Failed",
        description: "Failed to reassign task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsReassigning(false);
    }
  };

  // Get display name for assignee
  const getAssigneeDisplay = () => {
    if (task.assignedToUser) {
      return task.assignedToUser.name;
    }
    if (task.assignedToEmail) {
      return task.assignedToEmail;
    }
    return 'Unassigned';
  };

  // Prepare attendees list for reassignment
  const reassignOptions = attendees.map(attendee => ({
    email: attendee.user?.email || attendee.email,
    name: attendee.user?.name || attendee.email,
    isRegistered: !!attendee.user
  })).filter(option => option.email); // Filter out any entries without email

  const statusOptions = getStatusOptions();
  const canChangeStatus = statusOptions.length > 0;

  // Email validation function
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (reassignDropdownRef.current && !reassignDropdownRef.current.contains(event.target as Node)) {
        setShowReassignDropdown(false);
        setCustomEmail('');
        setEmailError('');
      }
    };

    if (showReassignDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showReassignDropdown]);

  // Handle custom email reassignment
  const handleCustomEmailReassign = () => {
    if (!customEmail.trim()) {
      setEmailError('Email is required');
      return;
    }

    if (!isValidEmail(customEmail)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    handleReassign(customEmail.trim());
  };

  const handleUpdateDescription = async () => {
    if (editedDescription.trim() === task.description) {
      setIsEditingDescription(false);
      return;
    }
    setIsSavingDescription(true);
    try {
      const updatedTask = await meetingService.updateActionItem(task.id, { description: editedDescription.trim() });
      onTaskUpdate(updatedTask);
      setIsEditingDescription(false);
      toast({ title: "Updated", description: "Task description updated" });
    } catch (e) {
      toast({ title: "Error", description: "Failed to update description", variant: "destructive" });
    } finally {
      setIsSavingDescription(false);
    }
  };

  const handleUpdateDeadline = async () => {
    setIsSavingDeadline(true);
    try {
      const updatedTask = await meetingService.updateActionItem(task.id, { 
        deadline: editedDeadline ? new Date(editedDeadline).toISOString() : null 
      });
      onTaskUpdate(updatedTask);
      setIsEditingDeadline(false);
      toast({ title: "Updated", description: "Task deadline updated" });
    } catch (e) {
      toast({ title: "Error", description: "Failed to update deadline", variant: "destructive" });
    } finally {
      setIsSavingDeadline(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await meetingService.deleteActionItem(task.id);
      if (onTaskDelete) {
        onTaskDelete(task.id);
      }
      toast({ title: "Deleted", description: "Task deleted successfully" });
    } catch (e) {
      toast({ title: "Error", description: "Failed to delete task", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex-1 w-full pr-4">
            {isOrganizer && task.isAiGenerated && task.status === 'DRAFT' && (
              <div className="mb-2">
                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-300">AI Draft — Pending Review</Badge>
              </div>
            )}
            {isOrganizer && task.isAiGenerated && task.status !== 'DRAFT' && (
              <div className="mb-2">
                <Badge variant="outline" className="text-[10px] text-muted-foreground leading-tight px-1.5 py-0">AI Generated</Badge>
              </div>
            )}

            {isEditingDescription && isOrganizer ? (
              <div className="mb-2">
                <textarea 
                  className="w-full text-sm border rounded p-2 focus:ring focus:ring-blue-200"
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  disabled={isSavingDescription}
                  rows={2}
                />
                <div className="flex gap-2 mt-1">
                  <Button size="sm" onClick={handleUpdateDescription} disabled={isSavingDescription || !editedDescription.trim()}>
                    {isSavingDescription ? <Loader2 className="w-3 h-3 animate-spin mr-1"/> : null} Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setIsEditingDescription(false); setEditedDescription(task.description); }} disabled={isSavingDescription}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="font-medium text-sm mb-2 flex items-start gap-2 group">
                <span className="flex-1" onClick={() => isOrganizer && setIsEditingDescription(true)}>{task.description}</span>
                {isOrganizer && (
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={() => setIsEditingDescription(true)}>
                    <Edit2 className="w-3 h-3 text-muted-foreground" />
                  </Button>
                )}
              </div>
            )}
            
            <div className="flex items-center gap-2 mb-2">
              <UserIcon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Assigned to: <span className="font-medium">{getAssigneeDisplay()}</span>
              </span>
            </div>

            {isEditingDeadline && isOrganizer ? (
              <div className="flex items-center gap-2 mb-2">
                <input type="date" className="text-sm border rounded p-1" value={editedDeadline} onChange={e => setEditedDeadline(e.target.value)} disabled={isSavingDeadline}/>
                <Button size="sm" variant="ghost" onClick={handleUpdateDeadline} disabled={isSavingDeadline}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => { setIsEditingDeadline(false); setEditedDeadline(task.deadline ? format(new Date(task.deadline), 'yyyy-MM-dd') : ''); }} disabled={isSavingDeadline}>Cancel</Button>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1 group">
                <span onClick={() => isOrganizer && setIsEditingDeadline(true)}>Due: {task.deadline ? format(new Date(task.deadline), 'MMM dd, yyyy') : 'No deadline'}</span>
                {isOrganizer && (
                  <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setIsEditingDeadline(true)}>
                    <Edit2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
            {/* Status Badge */}
            <Badge className={getStatusColor(task.status)}>
              {task.status}
            </Badge>

            {/* Status Dropdown */}
            {canChangeStatus && (
              <div className="relative">
                {isUpdatingStatus ? (
                  <div className="w-24 h-8 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                ) : (
                  <Select
                    value={task.status}
                    onValueChange={handleStatusChange}
                    disabled={isUpdatingStatus}
                  >
                    <SelectTrigger className="w-24 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(status => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Reassign Button (Organizer Only) */}
            {isOrganizer && (
              <div className="relative" ref={reassignDropdownRef}>
                {isReassigning ? (
                  <Button variant="outline" size="sm" disabled>
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowReassignDropdown(!showReassignDropdown)}
                  >
                    <ArrowUpDown className="w-4 h-4 mr-1" />
                    Reassign
                  </Button>
                )}

                {/* Reassign Dropdown */}
                {showReassignDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                    <div className="p-2">
                      <div className="text-xs font-medium text-gray-700 mb-2">
                        Reassign to:
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {reassignOptions.map((option, index) => (
                          <button
                            key={`${option.email}-${index}`}
                            onClick={() => handleReassign(option.email)}
                            className="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isReassigning}
                          >
                            <div className="font-medium">{option.name}</div>
                            <div className="text-xs text-gray-500">{option.email}</div>
                          </button>
                        ))}
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <input
                          type="email"
                          placeholder="Enter custom email..."
                          value={customEmail}
                          onChange={(e) => {
                            setCustomEmail(e.target.value);
                            setEmailError('');
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleCustomEmailReassign();
                            }
                          }}
                          className={`w-full px-2 py-1 text-sm border rounded ${
                            emailError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                          }`}
                          disabled={isReassigning}
                        />
                        {emailError && (
                          <div className="text-xs text-red-600 mt-1">{emailError}</div>
                        )}
                        <button
                          onClick={handleCustomEmailReassign}
                          disabled={isReassigning || !customEmail.trim()}
                          className="w-full mt-2 px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          {isReassigning ? (
                            <div className="flex items-center justify-center">
                              <Loader2 className="w-3 h-3 animate-spin mr-1" />
                              Assigning...
                            </div>
                          ) : (
                            'Assign'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Delete Button (Organizer Only) */}
            {isOrganizer && (
              showDeleteConfirm ? (
                <div className="flex items-center gap-1 bg-red-50 p-1 rounded border border-red-200">
                  <span className="text-xs text-red-600 font-medium px-1 hidden sm:inline">Delete?</span>
                  <Button size="sm" variant="destructive" className="h-8 px-2" onClick={handleDelete} disabled={isDeleting}>
                    {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 px-2 text-gray-500" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setShowDeleteConfirm(true)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TaskItem;
