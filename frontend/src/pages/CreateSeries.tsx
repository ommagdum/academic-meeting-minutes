import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { meetingService } from '@/services/meetingService';

export default function CreateSeries() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('Series title is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const series = await meetingService.createMeetingSeries({
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
      });
      
      // Navigate to the new series page
      navigate(`/series/${series.id}`);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError?.response?.data?.message || 'Failed to create series');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    if (error) setError(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Back Button */}
        <Button variant="ghost" asChild className="mb-6">
          <button onClick={() => navigate('/series')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Series
          </button>
        </Button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Create New Series</h1>
          <p className="text-muted-foreground">Create a new meeting series to organize recurring meetings</p>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Series Details</CardTitle>
            <CardDescription>
              Provide the basic information for your meeting series. You can add meetings to this series later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="title">Series Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Weekly Team Sync, Project Alpha Meetings"
                  value={formData.title}
                  onChange={handleInputChange('title')}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the purpose and frequency of this meeting series..."
                  value={formData.description}
                  onChange={handleInputChange('description')}
                  disabled={isLoading}
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/series')}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? (
                    'Creating...'
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Series
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">What happens next?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              After creating the series, you can:
            </p>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li>Add individual meetings to the series</li>
              <li>View all meetings in one place</li>
              <li>Access previous context from past meetings</li>
              <li>Track action items and decisions across the series</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
