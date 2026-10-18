import React, { useState } from 'react';
import { X, Combine, AlertTriangle } from 'lucide-react';

const MergeClusterModal = ({ isOpen, sourceCluster, allClusters, onClose, onMerge }) => {
  const [targetId, setTargetId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !sourceCluster) return null;

  // Filter out the source cluster itself
  const candidateTargets = (allClusters || []).filter(c => c._id !== sourceCluster._id);

  const handleMerge = async (e) => {
    e.preventDefault();
    if (!targetId) {
      setError('Please select a target topic to merge into.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onMerge(sourceCluster._id, targetId);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to merge clusters');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
          <div className="flex items-center space-x-2">
            <Combine className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-lg">Merge Topic Clusters</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleMerge} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
              {error}
            </div>
          )}

          <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs text-indigo-900">
            <p className="font-semibold">Source Topic:</p>
            <p className="mt-0.5 text-indigo-700 font-medium">"{sourceCluster.title}" ({sourceCluster.questionCount} questions)</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Destination Topic:
            </label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              required
            >
              <option value="">-- Choose target topic --</option>
              {candidateTargets.map(c => (
                <option key={c._id} value={c._id}>
                  #{c.clusterNumber}: {c.title} ({c.questionCount} questions)
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-2 text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p>
              All questions from <strong>"{sourceCluster.title}"</strong> will be moved to the chosen destination topic. The source cluster will be safely deleted.
            </p>
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm disabled:opacity-50"
            >
              <Combine className="w-4 h-4 mr-1.5" />
              {loading ? 'Merging...' : 'Confirm Merge'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MergeClusterModal;
