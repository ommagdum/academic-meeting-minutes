import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Filter, Calendar, Users, CheckCircle, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

import { searchService, MeetingSearchResult, SearchResponse } from '@/services/searchService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';

// Categories for quick filtering
const CATEGORIES = [
  { value: 'recent', label: 'Recent' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'thisWeek', label: 'This Week' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'processed', label: 'Processed' },
  { value: 'withActions', label: 'With Action Items' },
];

// Status options for filtering
const STATUS_OPTIONS = [
  { value: 'PROCESSED', label: 'Processed' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'FAILED', label: 'Failed' },
];

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State for search inputs
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
    searchParams.get('status')?.split(',') || []
  );
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'title'>(
    (searchParams.get('sort') as 'relevance' | 'date' | 'title') || 'relevance'
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // State for search results
  const [results, setResults] = useState<MeetingSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '0'));
  const [totalPages, setTotalPages] = useState(0);
  const pageSize = 10;

  // Get status badge variant based on status
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'PROCESSED':
        return 'default';
      case 'PROCESSING':
        return 'secondary';
      case 'DRAFT':
        return 'outline';
      case 'FAILED':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Format date to a readable format
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not scheduled';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Memoized search function
  const performSearch = useCallback(async (searchQuery: string = query, page: number = 0) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Update URL params
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (category) params.set('category', category);
      if (selectedStatuses.length) params.set('status', selectedStatuses.join(','));
      if (sortBy !== 'relevance') params.set('sort', sortBy);
      if (page > 0) params.set('page', page.toString());
      
      setSearchParams(params, { replace: true });
      
      // If category is set and no query, use category search
      if (category && !searchQuery) {
        const response = await searchService.searchByCategory(category, page, pageSize);
        setResults(response.results || []);
        setTotalResults(response.totalResults || 0);
        setTotalPages(response.totalPages || 0);
        setCurrentPage(page);
        return response;
      }
      
      // Otherwise use advanced search
      const response = await searchService.advancedSearch({
        query: searchQuery || undefined,
        statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
        category: category || undefined,
        sortBy: sortBy === 'date' ? 'date' : sortBy === 'title' ? 'title' : 'relevance',
        sortDirection: 'desc',
        page,
        size: pageSize,
      });
      
      setResults(response.results || []);
      setTotalResults(response.totalResults || 0);
      setTotalPages(response.totalPages || 0);
      setCurrentPage(page);
      return response;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Search failed:', error);
      setError(errorMessage);
      
      toast({
        title: 'Search failed',
        description: errorMessage,
        variant: 'destructive',
      });
      
      // Reset results on error
      setResults([]);
      setTotalResults(0);
      setTotalPages(0);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [query, category, selectedStatuses, sortBy, pageSize, setSearchParams, toast]);

  // Handle category button click
  const handleCategoryClick = async (categoryValue: string) => {
    // Toggle category if clicking the same one, otherwise set new category
    const newCategory = categoryValue === category ? '' : categoryValue;
    
    setCategory(newCategory);
    setQuery('');
    setSelectedStatuses([]);
    setCurrentPage(0);
    
    // Update URL params
    const params = new URLSearchParams();
    if (newCategory) {
      params.set('category', newCategory);
    }
    params.set('page', '0');
    setSearchParams(params, { replace: true });
    
    // Perform category search
    if (newCategory) {
      try {
        setIsLoading(true);
        setError(null);
        const response = await searchService.searchByCategory(newCategory, 0, pageSize);
        setResults(response.results || []);
        setTotalResults(response.totalResults || 0);
        setTotalPages(response.totalPages || 0);
        setCurrentPage(0);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to search by category';
        console.error('Category search failed:', err);
        setError(errorMessage);
        toast({
          title: 'Search failed',
          description: errorMessage,
          variant: 'destructive',
        });
        setResults([]);
        setTotalResults(0);
        setTotalPages(0);
      } finally {
        setIsLoading(false);
      }
    } else {
      // If category cleared, perform empty search
      performSearch('', 0);
    }
  };

  // Update URL parameters based on current search state
  const updateUrlParams = () => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (category) params.set('category', category);
    if (selectedStatuses.length > 0) params.set('status', selectedStatuses.join(','));
    if (sortBy !== 'relevance') params.set('sort', sortBy);
    if (currentPage > 0) params.set('page', (currentPage + 1).toString());
    
    setSearchParams(params);
  };

  // Toggle status filter
  const toggleStatus = (status: string) => {
    const newStatuses = selectedStatuses.includes(status)
      ? selectedStatuses.filter(s => s !== status)
      : [...selectedStatuses, status];
    setSelectedStatuses(newStatuses);
    setCurrentPage(0);
    performSearch(query, 0);
  };

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(0);
    updateUrlParams();
    performSearch(query, 0);
  };

  // Handle status filter change
  const handleStatusChange = (status: string, checked: boolean) => {
    const newStatuses = checked 
      ? [...selectedStatuses, status]
      : selectedStatuses.filter(s => s !== status);
    setSelectedStatuses(newStatuses);
    setCurrentPage(0);
    // Trigger search with new status filters
    setTimeout(() => {
      performSearch(query, 0);
    }, 0);
  };

  // Handle pagination
  const goToPage = (page: number) => {
    if (page >= 0 && page < totalPages) {
      setCurrentPage(page);
      performSearch(query, page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Initialize search from URL params on component mount
  useEffect(() => {
    const urlQuery = searchParams.get('q') || '';
    const urlCategory = searchParams.get('category') || '';
    const urlStatus = searchParams.get('status') || '';
    const urlSort = (searchParams.get('sort') as 'relevance' | 'date' | 'title') || 'relevance';
    const urlPage = parseInt(searchParams.get('page') || '0', 10);

    // Only update if values actually changed to avoid loops
    if (urlQuery !== query) setQuery(urlQuery);
    if (urlCategory !== category) setCategory(urlCategory);
    const statusArray = urlStatus ? urlStatus.split(',') : [];
    if (JSON.stringify(statusArray) !== JSON.stringify(selectedStatuses)) {
      setSelectedStatuses(statusArray);
    }
    if (urlSort !== sortBy) setSortBy(urlSort);
    if (urlPage !== currentPage) setCurrentPage(Math.max(0, urlPage));

    // Perform initial search if we have params or on first mount
    const hasParams = urlQuery || urlCategory || urlStatus;
    if (hasParams) {
      const timer = setTimeout(() => {
        if (urlCategory && !urlQuery) {
          // Category search
          searchService.searchByCategory(urlCategory, Math.max(0, urlPage), pageSize)
            .then(response => {
              setResults(response.results || []);
              setTotalResults(response.totalResults || 0);
              setTotalPages(response.totalPages || 0);
              setCurrentPage(Math.max(0, urlPage));
            })
            .catch(err => {
              console.error('Initial search failed:', err);
              setError(err instanceof Error ? err.message : 'Search failed');
            })
            .finally(() => setIsLoading(false));
        } else {
          // Advanced search
          performSearch(urlQuery, Math.max(0, urlPage));
        }
      }, 100);

      return () => clearTimeout(timer);
    } else {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount


  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-6">Search Meetings</h1>
          
          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search meetings, transcripts, or action items..."
                  className="pl-10 w-full"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2 shrink-0">
                <Button type="submit" disabled={isLoading} className="flex-1 sm:flex-initial">
                  <Search className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Search</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex-1 sm:flex-initial"
                >
                  <Filter className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">{showAdvanced ? 'Hide Filters' : 'Filters'}</span>
                </Button>
              </div>
            </div>

            {/* Advanced Filters */}
            {showAdvanced && (
              <div className="mt-4 p-4 border rounded-lg bg-card">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="status-filter" className="block mb-2 text-sm font-medium">
                      Status
                    </Label>
                    <div className="space-y-2">
                      {STATUS_OPTIONS.map((status) => (
                        <div key={status.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`status-${status.value}`}
                            checked={selectedStatuses.includes(status.value)}
                            onCheckedChange={(checked) => handleStatusChange(status.value, checked as boolean)}
                          />
                          <Label htmlFor={`status-${status.value}`} className="text-sm font-normal">
                            {status.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="sort-by" className="block mb-2 text-sm font-medium">
                      Sort By
                    </Label>
                    <Select
                      value={sortBy}
                      onValueChange={(value: 'relevance' | 'date' | 'title') => {
                        setSortBy(value);
                        // Trigger search when sort changes
                        performSearch(query, currentPage);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="relevance">Relevance</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="title">Title</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </form>

          {/* Quick Category Filters */}
          <div className="flex flex-wrap gap-2 mb-6">
            {CATEGORIES.map((cat) => (
              <Button
                key={cat.value}
                variant={category === cat.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleCategoryClick(cat.value)}
              >
                {cat.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Search Results */}
        <div className="mb-8">
          {isLoading && currentPage === 0 ? (
            // Loading state
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : results.length > 0 ? (
            // Results list
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                {totalResults} {totalResults === 1 ? 'result' : 'results'} found
              </div>
              
              {results.map((meeting) => {
                // Debug: log meeting object to see what fields are available
                if (!meeting.id) {
                  console.warn('[Search] Meeting missing ID:', meeting);
                }
                
                const handleMeetingClick = () => {
                  if (!meeting.id) {
                    console.error('[Search] Cannot navigate: meeting ID is missing', meeting);
                    toast({
                      title: 'Error',
                      description: 'Meeting ID is missing. Please try again.',
                      variant: 'destructive',
                    });
                    return;
                  }
                  navigate(`/meetings/${meeting.id}`);
                };
                
                return (
                <Card key={meeting.id || `meeting-${meeting.title}`} className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleMeetingClick}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{meeting.title}</CardTitle>
                      <Badge variant={getStatusVariant(meeting.status)}>
                        {meeting.status.toLowerCase()}
                      </Badge>
                    </div>
                    {meeting.seriesTitle && (
                      <div className="text-sm text-muted-foreground">
                        Series: {meeting.seriesTitle}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {meeting.description || 'No description available'}
                    </p>
                    <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(meeting.scheduledTime || meeting.createdAt)}
                      </div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {meeting.attendeeCount} {meeting.attendeeCount === 1 ? 'attendee' : 'attendees'}
                      </div>
                      {meeting.actionItemCount > 0 && (
                        <div className="flex items-center">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          {meeting.actionItemCount} {meeting.actionItemCount === 1 ? 'action item' : 'action items'}
                        </div>
                      )}
                      {meeting.hasTranscript && (
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          Transcript available
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                );
              })}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6">
                  <Button
                    variant="outline"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 0 || isLoading}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                  </Button>
                  
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage + 1} of {totalPages}
                  </div>
                  
                  <Button
                    variant="outline"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage >= totalPages - 1 || isLoading}
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            // No results state
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-1">No results found</h3>
              <p className="text-muted-foreground text-sm">
                Try adjusting your search or filter to find what you're looking for.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
