import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, FileText, Calendar, Users, X, Clock } from 'lucide-react';
import { searchService, MeetingSearchResult, TranscriptSearchResult } from '@/services/searchService';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'meetings' | 'transcripts'>('meetings');
  const [results, setResults] = useState<(MeetingSearchResult | TranscriptSearchResult)[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Perform search with debounce
  useEffect(() => {
    if (!isOpen) return;
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        if (mode === 'meetings') {
          const res = await searchService.advancedSearch({ query, size: 5 });
          setResults(res.results);
        } else {
          const res = await searchService.searchTranscripts(query, 0, 5);
          setResults(res.results as unknown as TranscriptSearchResult[]);
        }
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, mode, isOpen]);

  // Handle result click
  const handleResultClick = (id: string) => {
    onClose();
    navigate(`/meetings/${id}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4 sm:pt-[15vh]">
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      <div 
        className="relative w-full max-w-2xl bg-[#0a0a0a] rounded-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        style={{ border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="flex items-center px-4 py-3 border-b border-white/10">
          <SearchIcon className="w-5 h-5 text-white/50 mr-3" />
          <input
            autoFocus
            type="text"
            placeholder={`Search ${mode}...`}
            className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/30 text-lg font-body"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button onClick={onClose} className="p-1 rounded-md hover:bg-white/10 text-white/50 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-4 px-4 py-2 border-b border-white/5 bg-white/[0.02]">
          <button
            onClick={() => setMode('meetings')}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${mode === 'meetings' ? 'bg-[#0071E3] text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
          >
            Meetings
          </button>
          <button
            onClick={() => setMode('transcripts')}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${mode === 'transcripts' ? 'bg-[#0071E3] text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
          >
            Transcripts
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2 scrollbar-none">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-t-[#0071E3] border-white/10 rounded-full animate-spin" />
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-1">
              {results.map((result: any) => {
                const id = result.id || result.meetingId;
                return (
                  <button
                    key={id + (result.highlight ? '-t' : '')}
                    onClick={() => handleResultClick(id)}
                    className="w-full text-left p-3 rounded-lg hover:bg-white/5 transition-colors group flex items-start gap-4"
                  >
                    <div className="mt-1 p-2 rounded-md bg-white/5 text-white/50 group-hover:text-[#0071E3] group-hover:bg-[#0071E3]/10 transition-colors">
                      {mode === 'meetings' ? <FileText className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-white truncate">{result.title}</h4>
                      {mode === 'transcripts' && result.highlight ? (
                        <p className="text-xs text-white/50 mt-1 italic line-clamp-2">"{result.highlight}"</p>
                      ) : (
                        <div className="flex gap-3 mt-1.5 text-[0.65rem] text-white/40 font-body">
                          {result.scheduledTime && (
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(result.scheduledTime).toLocaleDateString()}</span>
                          )}
                          {(result.attendeeCount > 0) && (
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {result.attendeeCount}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : query ? (
            <div className="text-center py-12 text-sm text-white/50">
              No results found for "{query}"
            </div>
          ) : (
            <div className="text-center py-12 text-sm text-white/30">
              Type to start searching...
            </div>
          )}
        </div>
        
        <div className="px-4 py-2 border-t border-white/5 bg-white/[0.02] flex items-center justify-end text-[0.65rem] text-white/30">
          <span><kbd className="px-1 py-0.5 rounded bg-white/10 font-sans">esc</kbd> to close</span>
        </div>
      </div>
    </div>
  );
}
