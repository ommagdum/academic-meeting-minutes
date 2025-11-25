import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, FileText, Plus, Settings, Trash2, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// Mock data - replace with actual API call
const mockSeriesData = {
  id: '1',
  title: 'Weekly Team Sync',
  description: 'Regular team synchronization meetings to discuss progress, blockers, and upcoming tasks',
  meetingCount: 12,
  createdAt: '2023-10-01',
  meetings: [
    {
      id: 'm1',
      title: 'Team Sync - Week 3',
      scheduledTime: '2024-01-15T10:00:00',
      status: 'PROCESSED',
      attendeeCount: 8,
      actionItemCount: 5,
    },
    {
      id: 'm2',
      title: 'Team Sync - Week 2',
      scheduledTime: '2024-01-08T10:00:00',
      status: 'PROCESSED',
      attendeeCount: 7,
      actionItemCount: 3,
    },
    {
      id: 'm3',
      title: 'Team Sync - Week 1',
      scheduledTime: '2024-01-01T10:00:00',
      status: 'PROCESSED',
      attendeeCount: 9,
      actionItemCount: 6,
    },
  ],
};

const statusColors = {
  DRAFT: 'bg-gray-500',
  PROCESSING: 'bg-blue-500',
  PROCESSED: 'bg-green-500',
  FAILED: 'bg-red-500',
};

const statusLabels = {
  DRAFT: 'Draft',
  PROCESSING: 'Processing',
  PROCESSED: 'Completed',
  FAILED: 'Failed',
};

export default function SeriesDetail() {
  const { seriesId } = useParams();
  const navigate = useNavigate();
  const [isLoading] = useState(false);
  const [series] = useState(mockSeriesData);

  const handleDelete = () => {
    // API call would go here
    console.log('Delete series:', seriesId);
    navigate('/series');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <Skeleton className="h-10 w-32 mb-8" />
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-1/3 mb-4" />
              <Skeleton className="h-4 w-2/3" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Back Button */}
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/series">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Series
          </Link>
        </Button>

        {/* Header */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle className="text-3xl">{series.title}</CardTitle>
                    <Badge variant="secondary" className="text-sm">
                      {series.meetingCount} meetings
                    </Badge>
                  </div>
                  <CardDescription className="text-base">
                    {series.description}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon">
                    <Settings className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Series?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this series and all associated meetings.
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{series.meetingCount}</p>
                    <p className="text-sm text-muted-foreground">Total Meetings</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {new Date(series.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </p>
                    <p className="text-sm text-muted-foreground">Started</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">Active</p>
                    <p className="text-sm text-muted-foreground">Status</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Meetings Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Meetings</CardTitle>
                <CardDescription>All meetings in this series</CardDescription>
              </div>
              <Button asChild>
                <Link to="/create-meeting">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Meeting
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Attendees</TableHead>
                  <TableHead className="text-center">Action Items</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {series.meetings.map((meeting) => (
                  <TableRow key={meeting.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">{meeting.title}</TableCell>
                    <TableCell>
                      {new Date(meeting.scheduledTime).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`${statusColors[meeting.status]} text-white`}
                      >
                        {statusLabels[meeting.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{meeting.attendeeCount}</TableCell>
                    <TableCell className="text-center">{meeting.actionItemCount}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/meetings/${meeting.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
