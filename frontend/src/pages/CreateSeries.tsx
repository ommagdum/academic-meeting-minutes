import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
      navigate(`/series/${series.id}`);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError?.response?.data?.message || 'Failed to create series');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (error) setError(null);
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 animate-fade-in">
      <button 
        onClick={() => navigate('/series')}
        className="flex items-center gap-2 mb-8 text-sm font-medium hover:text-[#0071E3] transition-colors"
        style={{ color: "var(--text-secondary)" }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Series
      </button>

      <div className="mb-8">
        <h1 className="display-sm mb-2" style={{ color: "var(--text-primary)" }}>Create New Series</h1>
        <p className="body-base">Create a new meeting series to organize recurring meetings.</p>
      </div>

      <div className="card-surface p-8 mb-8">
        <h2 className="text-lg font-semibold font-display mb-1" style={{ color: "var(--text-primary)" }}>Series Details</h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>Provide the basic information for your meeting series.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 rounded-md text-sm font-medium mb-6" style={{ background: "rgba(255,69,58,0.1)", color: "#FF453A", border: "1px solid rgba(255,69,58,0.2)" }}>
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium font-body" style={{ color: "var(--text-secondary)" }}>Series Title <span className="text-red-500">*</span></label>
            <Input
              placeholder="e.g., Weekly Team Sync, Project Alpha Meetings"
              value={formData.title}
              onChange={handleInputChange('title')}
              disabled={isLoading}
              className="input-dark w-full"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium font-body" style={{ color: "var(--text-secondary)" }}>Description (Optional)</label>
            <Textarea
              placeholder="Describe the purpose and frequency of this meeting series..."
              value={formData.description}
              onChange={handleInputChange('description')}
              disabled={isLoading}
              rows={4}
              className="input-dark w-full resize-none"
            />
          </div>

          <div className="flex gap-4 pt-4 border-t" style={{ borderColor: "var(--border-subtle)" }}>
            <button
              type="button"
              onClick={() => navigate('/series')}
              disabled={isLoading}
              className="px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{ background: "var(--surface-raised)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)" }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isLoading} 
              className="flex-1 btn-accent px-6 py-2.5 rounded-lg flex items-center justify-center gap-2"
            >
              {isLoading ? 'Creating...' : <><Plus className="w-4 h-4" /> Create Series</>}
            </button>
          </div>
        </form>
      </div>

      <div className="p-6 rounded-xl border" style={{ background: "var(--surface-raised)", borderColor: "var(--border-subtle)" }}>
        <h3 className="font-semibold text-sm mb-2" style={{ color: "var(--text-primary)" }}>What happens next?</h3>
        <ul className="text-sm space-y-2 list-disc list-inside font-body" style={{ color: "var(--text-secondary)" }}>
          <li>Add individual meetings to the series</li>
          <li>View all meetings in one place</li>
          <li>Access previous context from past meetings</li>
          <li>Track action items and decisions across the series</li>
        </ul>
      </div>
    </div>
  );
}
