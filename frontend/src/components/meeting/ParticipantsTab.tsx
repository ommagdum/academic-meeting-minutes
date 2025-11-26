import React, { useState, useEffect, useCallback } from 'react';
import { meetingService } from '@/services/meetingService';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, UserCheck, UserX, Clock, Mail, Info } from 'lucide-react';
import { format } from 'date-fns';

interface ParticipantsTabProps {
  meetingId: string;
}

const statusVariant = {
  CONFIRMED: 'bg-green-100 text-green-800',
  ATTENDED: 'bg-blue-100 text-blue-800',
  INVITED: 'bg-yellow-100 text-yellow-800',
  DECLINED: 'bg-red-100 text-red-800',
  NO_SHOW: 'bg-gray-100 text-gray-800',
} as const;

export const ParticipantsTab: React.FC<ParticipantsTabProps> = ({ meetingId }) => {
  const [attendees, setAttendees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 0,
    size: 20,
    total: 0,
    totalPages: 0,
  });
  const { toast } = useToast();

  const loadAttendees = useCallback(async (page = 0, size = 20) => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await meetingService.getMeetingAttendees(meetingId, {
        page,
        size,
      });

      setAttendees(data.attendees);
      setPagination({
        page: data.page,
        size: data.size,
        total: data.total,
        totalPages: data.totalPages,
      });
    } catch (err) {
      console.error('Error loading attendees:', err);
      setError('Failed to load participants. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to load participants',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [meetingId, toast]);

  useEffect(() => {
    if (meetingId) {
      loadAttendees();
    }
  }, [meetingId, loadAttendees]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <UserCheck className="w-4 h-4 mr-1" />;
      case 'DECLINED':
        return <UserX className="w-4 h-4 mr-1" />;
      case 'INVITED':
        return <Clock className="w-4 h-4 mr-1" />;
      case 'ATTENDED':
        return <UserCheck className="w-4 h-4 mr-1" />;
      default:
        return <Info className="w-4 h-4 mr-1" />;
    }
  };

  if (loading && attendees.length === 0) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading participants...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <div className="text-yellow-600 mb-4">
          <Info className="w-12 h-12 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Unable to Load Participants</h3>
          <p className="text-sm">{error}</p>
        </div>
        <Button
          onClick={() => loadAttendees()}
          variant="outline"
          className="mt-4"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  if (attendees.length === 0) {
    return (
      <div className="text-center p-8">
        <Mail className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Participants</h3>
        <p className="text-gray-600">No participants have been added to this meeting yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Showing {attendees.length} of {pagination.total} participants
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadAttendees(pagination.page)}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invited</TableHead>
                <TableHead>Response</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendees.map((attendee) => (
                <TableRow key={attendee.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center">
                      {attendee.name}
                      {attendee.isOrganizer && (
                        <Badge variant="outline" className="ml-2">
                          Organizer
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{attendee.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`${statusVariant[attendee.status as keyof typeof statusVariant] || 'bg-gray-100'}`}
                    >
                      {getStatusIcon(attendee.status)}
                      {attendee.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(attendee.invitedAt)}</TableCell>
                  <TableCell>
                    {attendee.respondedAt ? formatDate(attendee.respondedAt) : 'No response'}
                  </TableCell>
                  <TableCell>
                    {attendee.isOrganizer ? 'Organizer' : 'Participant'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {pagination.totalPages > 1 && (
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAttendees(pagination.page - 1)}
            disabled={pagination.page === 0 || loading}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pagination.page + 1} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAttendees(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages - 1 || loading}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default ParticipantsTab;