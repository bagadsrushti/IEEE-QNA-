import React, { useState } from 'react';
import { X, ArrowRightLeft } from 'lucide-react';

const MoveQuestionModal = ({ isOpen, question, allClusters, onClose, onMove }) => {
  const [targetClusterId, setTargetClusterId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !question) return null;

  // Filter out current cluster
  const currentClusterId = question.clusterId?._id || question.clusterId;
  const candidateClusters = (allClusters || []).filter(c => c._id !== currentClusterId);

  const handleMove = async (e) => {
    e.preventDefault();
    if (!targetClusterId) {
      setError('Please select a target topic.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onMove(question._id, targetClusterId);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to move question');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
          <div className="flex items-center space-x-2">
            <ArrowRightLeft className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-slate-900 text-lg">Reassign Question Topic</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleMove} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
              {error}
            </div>
          )}

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Question:</span>
            <p className="text-sm font-medium text-slate-900 mt-1">"{question.originalText}"</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select New Topic Cluster:
            </label>
            <select
              value={targetClusterId}
              onChange={(e) => setTargetClusterId(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
              required
            >
              <option value="">-- Choose destination topic --</option>
              {candidateClusters.map(c => (
                <option key={c._id} value={c._id}>
                  #{c.clusterNumber}: {c.title} ({c.questionCount} questions)
                </option>
              ))}
            </select>
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
              className="flex items-center px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm disabled:opacity-50"
            >
              <ArrowRightLeft className="w-4 h-4 mr-1.5" />
              {loading ? 'Moving...' : 'Move Question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MoveQuestionModal;
