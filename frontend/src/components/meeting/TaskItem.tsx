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
import { User as UserIcon, ArrowUpDown, Loader2 } from 'lucide-react';

interface TaskItemProps {
  task: ActionItem;
  meetingId: string;
  isOrganizer: boolean;
  currentUser: User | null;
  attendees: Attendee[];
  onTaskUpdate: (updatedTask: ActionItem) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  meetingId,
  isOrganizer,
  currentUser,
  attendees,
  onTaskUpdate
}) => {
  const { toast } = useToast();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isReassigning, setIsReassigning] = useState(false);
  const [showReassignDropdown, setShowReassignDropdown] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const reassignDropdownRef = useRef<HTMLDivElement>(null);

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

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="font-medium text-sm mb-2">{task.description}</div>
            
            <div className="flex items-center gap-2 mb-2">
              <UserIcon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Assigned to: <span className="font-medium">{getAssigneeDisplay()}</span>
              </span>
            </div>

            {task.deadline && (
              <div className="text-xs text-muted-foreground mb-2">
                Due: {format(new Date(task.deadline), 'MMM dd, yyyy')}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TaskItem;
