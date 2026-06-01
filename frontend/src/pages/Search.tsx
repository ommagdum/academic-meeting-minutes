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
          const res = await searchService.quickSearch(query, 0, 5);
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
        className="relative w-full max-w-2xl rounded-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)' }}
      >
        <div className="flex items-center px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <SearchIcon className="w-5 h-5 mr-3" style={{ color: 'var(--text-tertiary)' }} />
          <input
            autoFocus
            type="text"
            placeholder={`Search ${mode}...`}
            className="flex-1 bg-transparent border-none outline-none text-lg font-body"
            style={{ color: 'var(--text-primary)' }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button onClick={onClose} className="p-1 rounded-md transition-colors hover:bg-black/5 dark:hover:bg-white/10" style={{ color: 'var(--text-secondary)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-4 px-4 py-2 border-b" style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-raised)' }}>
          <button
            onClick={() => setMode('meetings')}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${mode === 'meetings' ? 'bg-[#0071E3] text-white' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
            style={mode !== 'meetings' ? { color: 'var(--text-secondary)' } : {}}
          >
            Meetings
          </button>
          <button
            onClick={() => setMode('transcripts')}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${mode === 'transcripts' ? 'bg-[#0071E3] text-white' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
            style={mode !== 'transcripts' ? { color: 'var(--text-secondary)' } : {}}
          >
            Transcripts
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2 scrollbar-none">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border-strong)', borderTopColor: '#0071E3' }} />
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-1">
              {results.map((result: any) => {
                const id = result.id || result.meetingId;
                return (
                  <button
                    key={id + (result.highlight ? '-t' : '')}
                    onClick={() => handleResultClick(id)}
                    className="w-full text-left p-3 rounded-lg transition-colors group flex items-start gap-4 hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    <div className="mt-1 p-2 rounded-md group-hover:text-[#0071E3] group-hover:bg-[#0071E3]/10 transition-colors" style={{ background: 'var(--surface-raised)', color: 'var(--text-tertiary)' }}>
                      {mode === 'meetings' ? <FileText className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{result.title}</h4>
                      {mode === 'transcripts' && result.highlight ? (
                        <p className="text-xs mt-1 italic line-clamp-2" style={{ color: 'var(--text-secondary)' }}>"{result.highlight}"</p>
                      ) : (
                        <div className="flex gap-3 mt-1.5 text-[0.65rem] font-body" style={{ color: 'var(--text-tertiary)' }}>
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
            <div className="text-center py-12 text-sm" style={{ color: 'var(--text-secondary)' }}>
              No results found for "{query}"
            </div>
          ) : (
            <div className="text-center py-12 text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Type to start searching...
            </div>
          )}
        </div>
        
        <div className="px-4 py-2 border-t flex items-center justify-end text-[0.65rem]" style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-raised)', color: 'var(--text-tertiary)' }}>
          <span><kbd className="px-1 py-0.5 rounded font-sans" style={{ background: 'var(--border-strong)' }}>esc</kbd> to close</span>
        </div>
      </div>
    </div>
  );
}
