import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, FileText, Plus, Settings, Trash2, TrendingUp, Clock, CheckCircle, AlertCircle, Edit3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { meetingService } from '@/services/meetingService';
import type { MeetingSeries, MeetingSummary, ActionItem } from '@/types/meeting';

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
  const { id: seriesId } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [series, setSeries] = useState<MeetingSeries | null>(null);
  const [meetings, setMeetings] = useState<MeetingSummary[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
  });

  const loadActionItems = useCallback(async () => {
    if (!seriesId) return;
    
    setIsLoadingContext(true);
    try {
      const allActionItems: ActionItem[] = [];
      
      // Fetch action items from each meeting in the series
      for (const meeting of meetings) {
        if (meeting.status === 'PROCESSED') {
          try {
            const items = await meetingService.getActionItems(meeting.id);
            allActionItems.push(...items);
          } catch (err) {
            // Continue even if one meeting fails
            console.warn(`Failed to load action items for meeting ${meeting.id}:`, err);
          }
        }
      }
      
      // Sort by creation date (newest first)
      setActionItems(allActionItems.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      console.error('Failed to load action items:', error?.response?.data?.message || 'Unknown error');
    } finally {
      setIsLoadingContext(false);
    }
  }, [seriesId, meetings]);

  useEffect(() => {
    const loadSeriesData = async () => {
      if (!seriesId) {
        setError('No series ID provided');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Load series details and meetings in parallel
        const [seriesData, meetingsData] = await Promise.all([
          meetingService.getMeetingSeries(0).then(series => 
            series.find(s => s.id === seriesId)
          ),
          meetingService.getSeriesMeetings(seriesId)
        ]);

        if (!seriesData) {
          setError('Series not found');
          return;
        }

        setSeries(seriesData);
        setMeetings(meetingsData || []);
        setEditForm({
          title: seriesData.title,
          description: seriesData.description || '',
        });
      } catch (err: unknown) {
        const error = err as { response?: { data?: { message?: string } } };
        setError(error?.response?.data?.message || 'Failed to load series data');
      } finally {
        setIsLoading(false);
      }
    };

    loadSeriesData();
  }, [seriesId]);

  // Load action items when meetings are loaded
  useEffect(() => {
    if (meetings.length > 0) {
      loadActionItems();
    }
  }, [meetings, loadActionItems]);

  const handleDelete = async () => {
    if (!seriesId) return;
    
    setIsDeleting(true);
    try {
      await meetingService.deleteMeetingSeries(seriesId);
      navigate('/series');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error?.response?.data?.message || 'Failed to delete series');
      setIsDeleting(false);
    }
  };

  const handleEdit = () => {
    if (!series) return;
    setEditForm({
      title: series.title,
      description: series.description || '',
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!seriesId || !series) return;

    try {
      const updatedSeries = await meetingService.updateMeetingSeries(seriesId, {
        title: editForm.title.trim(),
        description: editForm.description.trim() || undefined,
      });
      
      setSeries(updatedSeries);
      setIsEditing(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error?.response?.data?.message || 'Failed to update series');
    }
  };

  const handleEditInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEditForm(prev => ({
      ...prev,
      [field]: e.target.value
    }));
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

  if (error || !series) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <Button variant="ghost" asChild className="mb-6">
            <Link to="/series">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Series
            </Link>
          </Button>
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-sm text-destructive mb-2">{error || 'Series not found'}</p>
              <p className="text-muted-foreground">Please try again later.</p>
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
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm text-muted-foreground">
                      Created by {series.createdBy.name || series.createdBy.email}
                    </span>
                    <Badge variant={series.isActive ? "default" : "secondary"}>
                      {series.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Dialog open={isEditing} onOpenChange={setIsEditing}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon" onClick={handleEdit}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Series</DialogTitle>
                        <DialogDescription>
                          Update the series title and description.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="title">Series Title</Label>
                          <Input
                            id="title"
                            value={editForm.title}
                            onChange={handleEditInputChange('title')}
                            placeholder="Enter series title"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={editForm.description}
                            onChange={handleEditInputChange('description')}
                            placeholder="Enter series description"
                            rows={3}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditing(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveEdit}>
                          Save Changes
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="icon" disabled={series?.meetingCount > 0}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Series?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {series?.meetingCount > 0 
                            ? "This series cannot be deleted because it contains meetings. Remove all meetings first."
                            : "This will permanently delete this series. This action cannot be undone."
                          }
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        {series?.meetingCount === 0 && (
                          <AlertDialogAction 
                            onClick={handleDelete} 
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isDeleting}
                          >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                          </AlertDialogAction>
                        )}
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
                    <p className="text-2xl font-bold">
                      {series.isActive ? 'Active' : 'Inactive'}
                    </p>
                    <p className="text-sm text-muted-foreground">Status</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="meetings" className="space-y-6">
          <TabsList>
            <TabsTrigger value="meetings">Meetings</TabsTrigger>
            <TabsTrigger value="context">Previous Context</TabsTrigger>
          </TabsList>

          <TabsContent value="meetings">
            {/* Meetings Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Meetings</CardTitle>
                    <CardDescription>All meetings in this series</CardDescription>
                  </div>
                  <Button asChild>
                    <Link to={`/create-meeting?seriesId=${seriesId}`}>
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
                      <TableHead className="text-center">Transcript</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {meetings.map((meeting) => (
                      <TableRow key={meeting.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-medium">{meeting.title}</TableCell>
                        <TableCell>
                          {meeting.scheduledTime ? new Date(meeting.scheduledTime).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          }) : 'Not scheduled'}
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
                        <TableCell className="text-center">
                          <Badge variant={meeting.hasTranscript ? "default" : "secondary"}>
                            {meeting.hasTranscript ? 'Yes' : 'No'}
                          </Badge>
                        </TableCell>
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
          </TabsContent>

          <TabsContent value="context">
            {/* Previous Context */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <CardTitle>Previous Context</CardTitle>
                </div>
                <CardDescription>
                  Action items and decisions from previous meetings in this series
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingContext ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-4 border rounded-lg">
                        <Skeleton className="h-4 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2 mb-2" />
                        <Skeleton className="h-4 w-1/4" />
                      </div>
                    ))}
                  </div>
                ) : actionItems.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Previous Context</h3>
                    <p className="text-muted-foreground">
                      No action items found from previous meetings in this series.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {actionItems.map((item) => (
                      <div key={item.id} className="p-4 border rounded-lg hover:bg-muted/50">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={item.status === 'COMPLETED' ? 'default' : 'secondary'}
                              className={
                                item.status === 'COMPLETED'
                                  ? 'bg-green-500 text-white'
                                  : item.status === 'IN_PROGRESS'
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-gray-500 text-white'
                              }
                            >
                              {item.status === 'COMPLETED' && <CheckCircle className="mr-1 h-3 w-3" />}
                              {item.status === 'IN_PROGRESS' && <Clock className="mr-1 h-3 w-3" />}
                              {item.status.replace('_', ' ')}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              From: {item.meetingTitle}
                            </span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm font-medium mb-2">{item.description}</p>
                        {item.assignedToUser && (
                          <p className="text-xs text-muted-foreground">
                            Assigned to: {item.assignedToUser.name || item.assignedToUser.email}
                          </p>
                        )}
                        {item.deadline && (
                          <p className="text-xs text-muted-foreground">
                            Deadline: {new Date(item.deadline).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
