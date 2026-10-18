import React, { useState } from 'react';
import { X, Calendar, Globe, ArrowRightLeft, Search, Hash } from 'lucide-react';

const langLabelMap = {
  en: { label: 'English', cls: 'badge-en' },
  hi: { label: 'हिंदी (Hindi)', cls: 'badge-hi' },
  mr: { label: 'मराठी (Marathi)', cls: 'badge-mr' },
  hinglish: { label: 'Hinglish', cls: 'badge-hinglish' },
  mixed: { label: 'Marathi-English', cls: 'badge-mixed' }
};

const ClusterDetailsModal = ({ isOpen, clusterData, onClose, onMoveQuestion, onEditTitle }) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen || !clusterData) return null;

  const { cluster, questions } = clusterData;

  const filteredQuestions = (questions || []).filter(q =>
    q.originalText.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (q.detectedLanguage && q.detectedLanguage.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-100 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex justify-between items-start">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-200 text-slate-800">
                Topic #{cluster.clusterNumber || '1'}
              </span>
              <h3 className="font-bold text-slate-900 text-xl">{cluster.title}</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">{cluster.summary}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cluster Stats Bar */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-4">
            <span className="font-semibold text-slate-700">
              Total Inquiries: <span className="text-teal-700 text-sm font-bold">{questions?.length || 0}</span>
            </span>
            <div className="flex items-center space-x-1.5">
              {Object.entries(cluster.languageDistribution || {}).map(([lang, count]) => {
                if (count <= 0) return null;
                const info = langLabelMap[lang] || { label: lang, cls: 'bg-slate-100 text-slate-700' };
                return (
                  <span key={lang} className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${info.cls}`}>
                    {info.label}: {count}
                  </span>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => onEditTitle(cluster)}
            className="text-xs text-teal-700 hover:text-teal-800 font-medium underline"
          >
            Edit Topic Title
          </button>
        </div>

        {/* Search inside cluster */}
        <div className="px-6 py-3 bg-slate-50/40 border-b border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search questions inside this topic..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Questions List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {filteredQuestions.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No questions found matching your search.
            </div>
          ) : (
            filteredQuestions.map((q, idx) => {
              const langInfo = langLabelMap[q.detectedLanguage] || { label: q.detectedLanguage, cls: 'bg-slate-100 text-slate-700' };
              const timeFormatted = q.createdAt
                ? new Date(q.createdAt).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : 'Just now';

              return (
                <div
                  key={q._id || idx}
                  className="p-3.5 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 transition-all shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 leading-snug">
                        "{q.originalText}"
                      </p>
                      <div className="flex items-center space-x-3 mt-2 text-[11px] text-slate-500">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${langInfo.cls}`}>
                          {langInfo.label}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                          {timeFormatted}
                        </span>
                        {q.similarityToCentroid && (
                          <span className="text-slate-400 font-mono">
                            Sim: {(q.similarityToCentroid * 100).toFixed(0)}%
                          </span>
                        )}
                        <span className="text-slate-300">•</span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {q.questionId}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onMoveQuestion(q)}
                      className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors flex-shrink-0"
                      title="Move this question to another topic cluster"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5 mr-1 text-slate-500" />
                      Move
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClusterDetailsModal;
