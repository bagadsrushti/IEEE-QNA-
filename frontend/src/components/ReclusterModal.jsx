import React, { useState } from 'react';
import { X, RefreshCw, Sliders, Info, CheckCircle2 } from 'lucide-react';

const ReclusterModal = ({ isOpen, onClose, onRecluster }) => {
  const [threshold, setThreshold] = useState(0.65);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleRun = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await onRecluster(threshold);
      setResult(res.result);
    } catch (err) {
      setError(err.response?.data?.message || 'Reclustering process failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-100 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-slate-900 text-lg">AI Batch Reclustering</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
              {error}
            </div>
          )}

          {result && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-emerald-900">Reclustering Complete!</p>
                <p className="mt-0.5">
                  Re-grouped <strong>{result.questionsCount}</strong> questions into <strong>{result.clustersCount}</strong> topic clusters using threshold {result.threshold}.
                </p>
              </div>
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center">
                <Sliders className="w-3.5 h-3.5 mr-1 text-teal-600" />
                Cosine Similarity Threshold:
              </label>
              <span className="text-sm font-bold font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                {Number(threshold).toFixed(2)}
              </span>
            </div>

            <input
              type="range"
              min="0.50"
              max="0.85"
              step="0.01"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>0.50 (Broader clusters)</span>
              <span className="font-medium text-teal-700">0.65 (Recommended)</span>
              <span>0.85 (Strict / Narrow)</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start space-x-2">
            <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <p>
              Uses <strong>Agglomerative Hierarchical Clustering</strong> with cosine metric on normalized 384-d MiniLM vectors. A threshold of <strong>0.62–0.68</strong> reliably merges Hindi, Marathi, Hinglish, and English phrasing while separating unrelated topics.
            </p>
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
            >
              {result ? 'Done' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleRun}
              disabled={loading}
              className="flex items-center px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Clustering...' : 'Execute Reclustering'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReclusterModal;
