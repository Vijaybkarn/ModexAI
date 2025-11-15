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
  }, []);

  const selectedModel = models.find(m => m.id === selectedModelId);

  return (
    <div className="relative w-full sm:max-w-sm">
      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
        AI Model
      </label>
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled || loading || models.length === 0}
        className="w-full px-4 py-3 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl flex items-center justify-between hover:border-blue-400 dark:hover:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-md"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
          <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
            {loading ? 'Loading models...' : error ? 'Failed to fetch' : selectedModel?.name || 'Select model'}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && !loading && models.length > 0 && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto animate-fade-in">
            {models.map(model => (
              <button
                key={model.id}
                onClick={() => {
                  onModelSelect(model.id);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-600 transition-all border-b border-slate-100 dark:border-slate-600 last:border-b-0 ${
                  selectedModelId === model.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {model.name}
                  </div>
                  {selectedModelId === model.id && (
                    <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">Active</span>
                  )}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {model.ollama_endpoints?.name} • {model.size ? `${(model.size / 1_000_000_000).toFixed(1)}GB` : 'N/A'}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {error && (
        <p className="text-sm text-red-500 dark:text-red-400 mt-2">{error}</p>
      )}
    </div>
  );
}
