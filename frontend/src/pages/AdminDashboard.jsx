import React, { useState, useEffect } from 'react';
import {
  Layers,
  MessageSquare,
  TrendingUp,
  Clock,
  Search,
  Filter,
  Eye,
  Edit,
  Combine,
  Download,
  QrCode,
  RefreshCw,
  Calendar,
  Globe,
  Sliders,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';
import { statsAPI, clusterAPI, questionAPI } from '../services/api';
import ClusterDetailsModal from '../components/ClusterDetailsModal';
import EditClusterModal from '../components/EditClusterModal';
import MergeClusterModal from '../components/MergeClusterModal';
import MoveQuestionModal from '../components/MoveQuestionModal';
import ReclusterModal from '../components/ReclusterModal';

const LANG_COLORS = {
  English: '#3b82f6',
  Hindi: '#f59e0b',
  Marathi: '#10b981',
  Hinglish: '#8b5cf6',
  'Mixed / Marathi-Eng': '#f43f5e'
};

const langBadgeMap = {
  en: { label: 'EN', full: 'English', cls: 'badge-en' },
  hi: { label: 'HI', full: 'Hindi', cls: 'badge-hi' },
  mr: { label: 'MR', full: 'Marathi', cls: 'badge-mr' },
  hinglish: { label: 'Hinglish', full: 'Hinglish', cls: 'badge-hinglish' },
  mixed: { label: 'Mixed', full: 'Mixed', cls: 'badge-mixed' }
};

const AdminDashboard = ({ onOpenQR, onOpenReclusterTrigger }) => {
  const [stats, setStats] = useState(null);
  const [clusters, setClusters] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [activeTab, setActiveTab] = useState('clusters'); // 'clusters' | 'questions'
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [langFilter, setLangFilter] = useState('all');
  const [sortBy, setSortBy] = useState('count'); // 'count' | 'recent' | 'demand'

  // Modals state
  const [selectedClusterDetails, setSelectedClusterDetails] = useState(null);
  const [clusterToEdit, setClusterToEdit] = useState(null);
  const [clusterToMerge, setClusterToMerge] = useState(null);
  const [questionToMove, setQuestionToMove] = useState(null);
  const [isReclusterOpen, setIsReclusterOpen] = useState(false);

  useEffect(() => {
    loadAllData();
  }, [sortBy, langFilter]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [statsRes, clustersRes] = await Promise.all([
        statsAPI.getOverview(),
        clusterAPI.getRanked({ sortBy, limit: 50 })
      ]);

      if (statsRes.data.success) {
        setStats(statsRes.data.stats);
      }

      if (clustersRes.data.success) {
        setClusters(clustersRes.data.clusters);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadQuestionsStream = async () => {
    try {
      const res = await questionAPI.getAll({
        limit: 50,
        language: langFilter !== 'all' ? langFilter : undefined,
        search: searchQuery || undefined
      });
      if (res.data.success) {
        setQuestions(res.data.questions);
      }
    } catch (err) {
      console.error('Failed to load questions stream:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'questions') {
      loadQuestionsStream();
    }
  }, [activeTab, langFilter, searchQuery]);

  const handleViewCluster = async (cluster) => {
    try {
      const res = await clusterAPI.getDetails(cluster._id);
      if (res.data.success) {
        setSelectedClusterDetails(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch cluster details:', err);
    }
  };

  const handleSaveClusterTitle = async (id, data) => {
    await clusterAPI.updateTitle(id, data);
    loadAllData();
  };

  const handleMergeClusters = async (sourceId, targetId) => {
    await clusterAPI.merge({ sourceClusterId: sourceId, targetClusterId: targetId });
    loadAllData();
  };

  const handleMoveQuestion = async (questionId, newClusterId) => {
    await clusterAPI.moveQuestion({ questionId, newClusterId });
    // Refresh modal and dashboard
    if (selectedClusterDetails) {
      const res = await clusterAPI.getDetails(selectedClusterDetails.cluster._id);
      if (res.data.success) {
        setSelectedClusterDetails(res.data);
      }
    }
    loadAllData();
  };

  const handleExecuteReclustering = async (threshold) => {
    const res = await clusterAPI.recluster(threshold);
    loadAllData();
    return res.data;
  };

  const handleExportCSV = () => {
    window.open(clusterAPI.getExportUrl(), '_blank');
  };

  // Filter clusters in-memory for fast search
  const filteredClusters = clusters.filter(c => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.summary && c.summary.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.representativeQuestion && c.representativeQuestion.toLowerCase().includes(searchQuery.toLowerCase()));

    if (langFilter === 'all') return matchesSearch;
    const hasLang = (c.languageDistribution?.[langFilter] || 0) > 0;
    return matchesSearch && hasLang;
  });

  // Prepare chart data for Language Distribution
  const pieData = stats?.languageDistribution ? [
    { name: 'English', value: stats.languageDistribution.en || 0 },
    { name: 'Hindi', value: stats.languageDistribution.hi || 0 },
    { name: 'Marathi', value: stats.languageDistribution.mr || 0 },
    { name: 'Hinglish', value: stats.languageDistribution.hinglish || 0 },
    { name: 'Mixed / Marathi-Eng', value: stats.languageDistribution.mixed || 0 }
  ].filter(d => d.value > 0) : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Overview Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Question Analytics & Topics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pretrained Sentence-Transformer clustering for ~500 user inquiries across EN, Hindi, Marathi, & Hinglish
          </p>
        </div>

        {/* AI Model Status Badge */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse mr-2"></span>
            <span>AI Model: paraphrase-multilingual-MiniLM</span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Questions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Submissions</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">{stats?.totalQuestions || 0}</p>
            <p className="text-[11px] text-slate-400 mt-1">Expected: 500 – 1,500 questions</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <MessageSquare className="w-6 h-6" />
          </div>
        </div>

        {/* Total Clusters */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Semantic Clusters</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">{stats?.totalClusters || 0}</p>
            <p className="text-[11px] text-slate-400 mt-1">Topics identified by AI</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Top Requested Topic */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="max-w-[70%]">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Top Topic Demand</p>
            <p className="text-base font-bold text-slate-900 mt-1 truncate" title={stats?.topCluster?.title}>
              {stats?.topCluster?.title || 'None yet'}
            </p>
            <p className="text-[11px] text-teal-700 font-semibold mt-1">
              {stats?.topCluster ? `${stats.topCluster.questionCount} inquiries` : '0 inquiries'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Questions Today */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Questions Today</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">{stats?.questionsToday || 0}</p>
            <p className="text-[11px] text-slate-400 mt-1">Submissions since midnight</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Language Distribution Donut */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Language Distribution</h3>
            <p className="text-xs text-slate-500 mt-0.5">Multilingual breakdown across submissions</p>
          </div>

          <div className="h-56 mt-4 flex items-center justify-center">
            {pieData.length === 0 ? (
              <p className="text-xs text-slate-400">No language data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={LANG_COLORS[entry.name] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', fontSize: '12px', borderColor: '#e2e8f0' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100 text-[11px]">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: LANG_COLORS[d.name] }}></span>
                <span className="text-slate-600 truncate">{d.name}:</span>
                <span className="font-bold text-slate-900">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top 5 Topics by Popularity Bar Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between lg:col-span-2">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Topic Demand Ranking</h3>
              <p className="text-xs text-slate-500 mt-0.5">Top frequently requested topics by volume</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
              Ranked by Volume
            </span>
          </div>

          <div className="h-56 mt-4">
            {(!stats?.topTopics || stats.topTopics.length === 0) ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No topic data yet. Submit questions to generate clusters.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topTopics} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" fontSize={11} tickLine={false} />
                  <YAxis type="category" dataKey="name" fontSize={11} tickLine={false} width={130} />
                  <Tooltip
                    formatter={(val, name, props) => [`${val} Questions`, props.payload.fullTitle]}
                    contentStyle={{ borderRadius: '12px', fontSize: '12px', borderColor: '#e2e8f0' }}
                  />
                  <Bar dataKey="count" fill="#0d9488" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
            Note: Ranking reflects relative topic demand and student popularity, not objective difficulty.
          </p>
        </div>
      </div>

      {/* Main Table Section */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-6 border-b border-slate-200/80 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          {/* Tabs */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('clusters')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'clusters'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ranked Topic Clusters ({clusters.length})
            </button>
            <button
              onClick={() => setActiveTab('questions')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'questions'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Inquiries Stream
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search topics or text..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Language filter */}
            <select
              value={langFilter}
              onChange={(e) => setLangFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Languages</option>
              <option value="en">English</option>
              <option value="hi">हिंदी (Hindi)</option>
              <option value="mr">मराठी (Marathi)</option>
              <option value="hinglish">Hinglish</option>
              <option value="mixed">Mixed Languages</option>
            </select>

            {/* Sort by */}
            {activeTab === 'clusters' && (
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="count">Sort: Most Inquiries</option>
                <option value="recent">Sort: Most Recent</option>
                <option value="demand">Sort: Demand Score</option>
              </select>
            )}

            {/* Action buttons */}
            <button
              onClick={() => setIsReclusterOpen(true)}
              className="p-2 text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-xl transition-colors"
              title="Configure and trigger re-clustering"
            >
              <Sliders className="w-4 h-4" />
            </button>

            <button
              onClick={handleExportCSV}
              className="p-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              title="Export CSV"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Table */}
        {activeTab === 'clusters' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4 w-16 text-center">Rank</th>
                  <th className="py-3 px-4">Topic Title & Summary</th>
                  <th className="py-3 px-4 text-center">Question Count</th>
                  <th className="py-3 px-4">Language Distribution</th>
                  <th className="py-3 px-4">Recent Activity</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredClusters.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                      No clusters found matching your filter.
                    </td>
                  </tr>
                ) : (
                  filteredClusters.map((cluster) => {
                    const lastActive = cluster.lastSubmissionAt
                      ? new Date(cluster.lastSubmissionAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'N/A';

                    return (
                      <tr key={cluster._id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Rank */}
                        <td className="py-4 px-4 text-center">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                            cluster.rank === 1
                              ? 'bg-amber-100 text-amber-800'
                              : cluster.rank === 2
                              ? 'bg-slate-200 text-slate-800'
                              : cluster.rank === 3
                              ? 'bg-amber-50 text-amber-900 border border-amber-300'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {cluster.rank}
                          </span>
                        </td>

                        {/* Title and summary */}
                        <td className="py-4 px-4 max-w-md">
                          <div className="font-bold text-slate-900 leading-snug">
                            {cluster.title}
                          </div>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {cluster.representativeQuestion ? `"${cluster.representativeQuestion}"` : cluster.summary}
                          </p>
                        </td>

                        {/* Question Count */}
                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                            {cluster.questionCount} {cluster.questionCount === 1 ? 'question' : 'questions'}
                          </span>
                        </td>

                        {/* Languages */}
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap items-center gap-1">
                            {Object.entries(cluster.languageDistribution || {}).map(([lang, count]) => {
                              if (count <= 0) return null;
                              const badge = langBadgeMap[lang] || { label: lang, cls: 'bg-slate-100 text-slate-600' };
                              return (
                                <span
                                  key={lang}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${badge.cls}`}
                                  title={`${badge.full}: ${count}`}
                                >
                                  {badge.label}: {count}
                                </span>
                              );
                            })}
                          </div>
                        </td>

                        {/* Recent Activity */}
                        <td className="py-4 px-4 text-xs text-slate-500 whitespace-nowrap">
                          {lastActive}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-right">
                          <div className="inline-flex items-center space-x-1.5">
                            <button
                              onClick={() => handleViewCluster(cluster)}
                              className="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                              title="View all questions in this topic"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setClusterToEdit(cluster)}
                              className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit topic title"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setClusterToMerge(cluster)}
                              className="p-1.5 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Merge into another cluster"
                            >
                              <Combine className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* All Inquiries Stream */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Original Question Text</th>
                  <th className="py-3 px-4">Detected Language</th>
                  <th className="py-3 px-4">Assigned Topic</th>
                  <th className="py-3 px-4">Submitted At</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {questions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                      No inquiries found matching query.
                    </td>
                  </tr>
                ) : (
                  questions.map((q) => {
                    const badge = langBadgeMap[q.detectedLanguage] || { label: q.detectedLanguage, cls: 'bg-slate-100 text-slate-600' };
                    const timeFormatted = q.createdAt
                      ? new Date(q.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'N/A';

                    return (
                      <tr key={q._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-slate-900 max-w-md">
                          "{q.originalText}"
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${badge.cls}`}>
                            {badge.full || badge.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold text-slate-700">
                          {q.clusterId?.title || 'Unassigned'}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                          {timeFormatted}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setQuestionToMove(q)}
                            className="text-xs text-teal-700 hover:text-teal-800 font-medium underline"
                          >
                            Reassign Topic
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cluster Details Modal */}
      <ClusterDetailsModal
        isOpen={!!selectedClusterDetails}
        clusterData={selectedClusterDetails}
        onClose={() => setSelectedClusterDetails(null)}
        onEditTitle={(c) => setClusterToEdit(c)}
        onMoveQuestion={(q) => setQuestionToMove(q)}
      />

      {/* Edit Title Modal */}
      <EditClusterModal
        isOpen={!!clusterToEdit}
        cluster={clusterToEdit}
        onClose={() => setClusterToEdit(null)}
        onSave={handleSaveClusterTitle}
      />

      {/* Merge Modal */}
      <MergeClusterModal
        isOpen={!!clusterToMerge}
        sourceCluster={clusterToMerge}
        allClusters={clusters}
        onClose={() => setClusterToMerge(null)}
        onMerge={handleMergeClusters}
      />

      {/* Move Question Modal */}
      <MoveQuestionModal
        isOpen={!!questionToMove}
        question={questionToMove}
        allClusters={clusters}
        onClose={() => setQuestionToMove(null)}
        onMove={handleMoveQuestion}
      />

      {/* Recluster Modal */}
      <ReclusterModal
        isOpen={isReclusterOpen}
        onClose={() => setIsReclusterOpen(false)}
        onRecluster={handleExecuteReclustering}
      />
    </div>
  );
};

export default AdminDashboard;
