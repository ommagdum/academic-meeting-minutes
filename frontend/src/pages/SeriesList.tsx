import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, FileText, Plus, Search, FolderOpen } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { meetingService } from '@/services/meetingService';
import type { MeetingSeries } from '@/types/meeting';

export default function SeriesList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [series, setSeries] = useState<MeetingSeries[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSeries = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await meetingService.getMeetingSeries();
        setSeries(data || []);
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Failed to load series');
      } finally {
        setIsLoading(false);
      }
    };
    loadSeries();
  }, []);

  const filteredSeries = series.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">Meeting Series</h1>
              <p className="text-muted-foreground">Manage your recurring meeting series</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" asChild size="lg">
                <Link to="/dashboard">Back to Dashboard</Link>
              </Button>
              <Button asChild size="lg">
                <Link to="/create-meeting">
                  <Plus className="mr-2 h-5 w-5" />
                  New Series
                </Link>
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search series..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Series Grid */}
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-sm text-destructive mb-2">{error}</p>
              <p className="text-muted-foreground">Please try again later.</p>
            </CardContent>
          </Card>
        ) : filteredSeries.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FolderOpen className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Series Found</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                {searchQuery
                  ? "No series match your search. Try different keywords."
                  : "Create your first meeting series to organize recurring meetings."}
              </p>
              <Button asChild>
                <Link to="/create-meeting">
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Series
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredSeries.map((s) => (
              <Link key={s.id} to={`/series/${s.id}`}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="group-hover:text-primary transition-colors line-clamp-2">
                        {s.title}
                      </CardTitle>
                      <Badge variant="secondary">{s.meetingCount}</Badge>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {s.description || 'No description'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <FileText className="mr-2 h-4 w-4" />
                        <span>{s.meetingCount} meetings</span>
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Calendar className="mr-2 h-4 w-4" />
                        <span>Created: {new Date(s.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full" asChild>
                      <span>
                        <Users className="mr-2 h-4 w-4" />
                        View Details
                      </span>
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
