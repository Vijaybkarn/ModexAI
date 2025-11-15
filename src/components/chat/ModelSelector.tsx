import { useEffect, useState } from 'react';
import type { Model } from '../../types';
import { useApi } from '../../hooks/useApi';
import { ChevronDown } from 'lucide-react';

interface ModelSelectorProps {
  selectedModelId?: string;
  onModelSelect: (modelId: string) => void;
  disabled?: boolean;
}

export function ModelSelector({ selectedModelId, onModelSelect, disabled }: ModelSelectorProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const { apiRequest } = useApi();

  useEffect(() => {
    let cancelled = false;

    const fetchModels = async () => {
      try {
        setLoading(true);
        const data = await apiRequest<Model[]>('/api/models');

        if (cancelled) return;

        setModels(data);

        // Only auto-select if no model is selected AND we haven't set models yet
        if (data.length > 0 && !selectedModelId) {
          onModelSelect(data[0].id);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load models');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchModels();

    return () => {
      cancelled = true;
    };
  }, []); // Empty dependency array - only run once on mount

  const selectedModel = models.find(m => m.id === selectedModelId);

  return (
    <div className="relative w-full sm:max-w-xs">
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled || loading || models.length === 0}
        className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
          {loading ? 'Loading models...' : error ? 'Failed to fetch' : selectedModel?.name || 'Select model'}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
      </button>

      {open && !loading && models.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {models.map(model => (
            <button
              key={model.id}
              onClick={() => {
                onModelSelect(model.id);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors border-b border-slate-100 dark:border-slate-600 last:border-b-0 ${
                selectedModelId === model.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500' : ''
              }`}
            >
              <div className="text-sm font-medium text-slate-900 dark:text-white">
                {model.name}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {model.ollama_endpoints?.name} • {model.size ? `${(model.size / 1_000_000_000).toFixed(1)}GB` : 'N/A'}
              </div>
              {model.digest && (
                <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-mono">
                  {model.digest.substring(0, 16)}...
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500 dark:text-red-400 mt-2">{error}</p>
      )}
    </div>
  );
}
