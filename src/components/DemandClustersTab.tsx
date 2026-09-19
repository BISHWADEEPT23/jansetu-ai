import React, { useState, useMemo } from 'react';
import {
  Layers,
  Search,
  Filter,
  TrendingUp,
  Flame,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Languages,
  Eye,
  RefreshCw,
  GitMerge,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';
import type {
  DemandCluster,
  ClusterFilterOptions,
  ClusterStatus,
} from '../types/citizenRequest.ts';
import { INDIAN_STATES_DISTRICTS } from '../data/indiaLocations.ts';
import { ClusterDetailModal } from './ClusterDetailModal.tsx';

interface DemandClustersTabProps {
  clusters: DemandCluster[];
  loading: boolean;
  onRefresh: () => void;
  onClusterSelected?: (cluster: DemandCluster) => void;
}

export const DemandClustersTab: React.FC<DemandClustersTabProps> = ({
  clusters,
  loading,
  onRefresh,
}) => {
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [filters, setFilters] = useState<ClusterFilterOptions>({
    state: 'All',
    district: 'All',
    category: 'All',
    status: 'All' as any,
    trend: 'All' as any,
    searchQuery: '',
  });

  const availableDistricts =
    filters.state && filters.state !== 'All' && INDIAN_STATES_DISTRICTS[filters.state]
      ? INDIAN_STATES_DISTRICTS[filters.state]
      : [];

  // Filtered clusters
  const filteredClusters = useMemo(() => {
    return clusters.filter((c) => {
      const cStatus = c.clusterStatus || c.status;
      if (filters.state && filters.state !== 'All' && c.state !== filters.state) return false;
      if (filters.district && filters.district !== 'All' && c.district !== filters.district) return false;
      if (filters.category && filters.category !== 'All' && c.category !== filters.category) return false;
      if (filters.status && (filters.status as string) !== 'All' && cStatus !== filters.status) return false;
      if (filters.trend && (filters.trend as string) !== 'All' && c.trendSignal !== filters.trend) return false;
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesDemand = c.canonicalDemand.toLowerCase().includes(query);
        const matchesProblem = c.canonicalProblem.toLowerCase().includes(query);
        const matchesId = c.clusterId.toLowerCase().includes(query);
        const matchesLocality = c.locality?.toLowerCase().includes(query) || false;
        const matchesEntity = c.infrastructureEntity?.toLowerCase().includes(query) || false;
        if (!matchesDemand && !matchesProblem && !matchesId && !matchesLocality && !matchesEntity) {
          return false;
        }
      }
      return true;
    });
  }, [clusters, filters]);

  // Emerging demands (spikes)
  const emergingClusters = useMemo(() => {
    return clusters
      .filter((c) => c.trendSignal === 'RISING' || (c.growthPercentage && c.growthPercentage >= 50))
      .sort((a, b) => (b.growthPercentage || 0) - (a.growthPercentage || 0));
  }, [clusters]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Demand Clusters & Deduplication
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 font-bold text-xs">
              {clusters.length} Analytical Clusters
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Multilingual semantic unification grouping diverse citizen phrasings into actionable public infrastructure demands. Original citizen submissions remain unaltered.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Clusters</span>
          </button>
        </div>
      </div>

      {/* Multilingual Benchmark Highlight: Wardha Primary Health Centre */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/30 text-purple-200 border border-purple-400/30">
                Multilingual AI Clustering In Action
              </span>
              <span className="text-[11px] text-purple-200 font-mono">
                Wardha District, Maharashtra
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              Primary Health Centre (PHC) Construction Demand
            </h3>
            <p className="text-xs text-purple-100/90 leading-relaxed">
              428 citizen submissions across Marathi, Hindi, English, and Hinglish with wildly differing phrasings are automatically synthesized into 1 canonical infrastructure gap without erasing individual records:
            </p>

            {/* Phrasings showcase */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
              <div className="bg-white/10 rounded-lg p-2 border border-white/10">
                <span className="text-[9px] font-bold text-amber-300 uppercase block">Marathi:</span>
                "आमच्या गावात रुग्णालय नाही, उपचारासाठी खूप लांब जावे लागते."
              </div>
              <div className="bg-white/10 rounded-lg p-2 border border-white/10">
                <span className="text-[9px] font-bold text-sky-300 uppercase block">Hindi:</span>
                "हमारे गांव में अस्पताल नहीं है, इलाज के लिए 30 किमी जाना पड़ता है।"
              </div>
              <div className="bg-white/10 rounded-lg p-2 border border-white/10">
                <span className="text-[9px] font-bold text-emerald-300 uppercase block">English:</span>
                "We travel 30 kilometres for medical treatment. Urgent PHC needed."
              </div>
              <div className="bg-white/10 rounded-lg p-2 border border-white/10">
                <span className="text-[9px] font-bold text-pink-300 uppercase block">Hinglish:</span>
                "Hamare area mein PHC chahiye, emergency mein koi suvidha nahi hai."
              </div>
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-start md:items-end gap-2">
            <div className="text-right hidden md:block">
              <div className="text-2xl font-black text-white">428</div>
              <div className="text-[10px] text-purple-200 uppercase font-semibold">Reports Unified</div>
            </div>
            <button
              type="button"
              onClick={() => {
                const wardhaCluster = clusters.find((c) => c.district === 'Wardha') || clusters[0];
                if (wardhaCluster) setSelectedClusterId(wardhaCluster.clusterId);
              }}
              className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>Inspect Wardha Cluster</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Emerging Demand Spikes (Section 2: Emerging Demands) */}
      {emergingClusters.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-rose-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Emerging Demand Spikes (High Velocity)
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Significant surge in citizen submissions over 30 days
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {emergingClusters.slice(0, 3).map((cl) => (
              <div
                key={cl.clusterId}
                onClick={() => setSelectedClusterId(cl.clusterId)}
                className="bg-white border-2 border-rose-200/80 hover:border-rose-400 rounded-2xl p-4 shadow-2xs cursor-pointer transition-all hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-900 flex items-center gap-1">
                      🔥 +{cl.growthPercentage || 85}% in 30d
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-500">
                      {cl.requestCount} reports
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 line-clamp-1 mb-1">
                    {cl.canonicalDemand}
                  </h4>
                  <p className="text-xs text-slate-600 line-clamp-2 mb-3">
                    "{cl.canonicalProblem}"
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>📍 {cl.locality || cl.district}, {cl.state}</span>
                  <span className="font-semibold text-purple-900 flex items-center gap-0.5">
                    Inspect <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Search Input */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={filters.searchQuery || ''}
              onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
              placeholder="Search demand, problem, facility, locality..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white"
            />
          </div>

          {/* Sector Category */}
          <select
            value={filters.category || 'All'}
            onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
          >
            <option value="All">All Sectors</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Water">Water</option>
            <option value="Sanitation">Sanitation</option>
            <option value="Transport">Transport</option>
            <option value="Education">Education</option>
            <option value="Electricity">Electricity</option>
            <option value="Digital Connectivity">Digital Connectivity</option>
            <option value="Housing">Housing</option>
            <option value="Agriculture">Agriculture</option>
          </select>

          {/* Status Filter */}
          <select
            value={(filters.status as string) || 'All'}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value as any }))}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
          >
            <option value="All">All Review Statuses</option>
            <option value="ACTIVE">ACTIVE (Automated)</option>
            <option value="CONFIRMED">CONFIRMED (Human Reviewed)</option>
            <option value="NEEDS_REVIEW">NEEDS_REVIEW (Queue)</option>
          </select>

          {/* Trend Filter */}
          <select
            value={(filters.trend as string) || 'All'}
            onChange={(e) => setFilters((prev) => ({ ...prev, trend: e.target.value as any }))}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
          >
            <option value="All">All Trends</option>
            <option value="RISING">Rising (Spikes)</option>
            <option value="STABLE">Stable</option>
            <option value="FALLING">Falling</option>
          </select>
        </div>

        {/* State / District selector row */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-slate-400 font-semibold">Geography:</span>
          <select
            value={filters.state || 'All'}
            onChange={(e) => setFilters((prev) => ({ ...prev, state: e.target.value, district: 'All' }))}
            className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-700"
          >
            <option value="All">All States</option>
            {Object.keys(INDIAN_STATES_DISTRICTS).map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>

          {availableDistricts.length > 0 && (
            <select
              value={filters.district || 'All'}
              onChange={(e) => setFilters((prev) => ({ ...prev, district: e.target.value }))}
              className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-700"
            >
              <option value="All">All Districts</option>
              {availableDistricts.map((dist) => (
                <option key={dist} value={dist}>{dist}</option>
              ))}
            </select>
          )}

          {(filters.state !== 'All' || filters.category !== 'All' || filters.status !== 'All' || filters.searchQuery) && (
            <button
              type="button"
              onClick={() =>
                setFilters({
                  state: 'All',
                  district: 'All',
                  category: 'All',
                  status: 'All' as any,
                  trend: 'All' as any,
                  searchQuery: '',
                })
              }
              className="text-[11px] text-purple-700 hover:underline font-semibold ml-auto cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Clusters List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-900">
            Showing {filteredClusters.length} of {clusters.length} Demand Clusters
          </div>
          <span className="text-[11px] text-slate-400">
            Click any row to view member requests, languages, and human-in-the-loop actions.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <th className="py-3 px-4">Cluster ID & Demand</th>
                <th className="py-3 px-4">Sector / Entity</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Volume & Trend</th>
                <th className="py-3 px-4">Languages</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClusters.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No demand clusters match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredClusters.map((cl) => (
                  <tr
                    key={cl.clusterId}
                    onClick={() => setSelectedClusterId(cl.clusterId)}
                    className="hover:bg-purple-50/40 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-mono text-[10px] font-bold text-purple-900 mb-0.5">
                        {cl.clusterId}
                      </div>
                      <div className="font-bold text-slate-900 line-clamp-1">
                        {cl.canonicalDemand}
                      </div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">
                        {cl.canonicalProblem}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px] block w-fit mb-1">
                        {cl.category}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {cl.infrastructureEntity || 'Public Facility'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">
                        {cl.locality || cl.district}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {cl.district}, {cl.state}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <span>{cl.requestCount} reports</span>
                        {cl.trendSignal === 'RISING' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800">
                            +{cl.growthPercentage || 50}%
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Confidence: {cl.clusteringConfidence ? `${Math.round(cl.clusteringConfidence * 100)}%` : cl.averageSimilarityScore ? `${Math.round(cl.averageSimilarityScore * 100)}%` : '90%'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 flex-wrap max-w-[140px]">
                        {cl.languagesRepresented?.slice(0, 3).map((lang) => (
                          <span
                            key={lang}
                            className="text-[9px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-800 border border-blue-100 font-medium"
                          >
                            {lang}
                          </span>
                        ))}
                        {cl.languagesRepresented && cl.languagesRepresented.length > 3 && (
                          <span className="text-[9px] text-slate-400">
                            +{cl.languagesRepresented.length - 3}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          (cl.status || cl.clusterStatus) === 'CONFIRMED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : (cl.status || cl.clusterStatus) === 'NEEDS_REVIEW'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {cl.status || cl.clusterStatus}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClusterId(cl.clusterId);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-[11px] transition-colors cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cluster Details Modal */}
      {selectedClusterId && (
        <ClusterDetailModal
          clusterId={selectedClusterId}
          onClose={() => setSelectedClusterId(null)}
          onClusterUpdated={onRefresh}
          availableClusters={clusters}
        />
      )}
    </div>
  );
};
