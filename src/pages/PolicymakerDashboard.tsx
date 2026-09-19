import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Map,
  Table as TableIcon,
  AlertTriangle,
  FileCheck2,
  TrendingUp,
  Filter,
  Search,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  Layers,
  MapPin,
  Clock,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  X,
  ExternalLink,
  Mic,
  Edit3,
  GitMerge,
  Flame,
  Database,
  ShieldAlert,
} from 'lucide-react';
import type {
  CitizenRequest,
  DashboardKPIData,
  RequestFilterOptions,
  RequestStatus,
  DemandCluster,
} from '../types/citizenRequest.ts';
import type { EvidenceCoverageKPI } from '../types/evidence.ts';
import { requestService } from '../services/requestService.ts';
import { clusterService } from '../services/clusterService.ts';
import { infrastructureGapService } from '../services/infrastructureGapService.ts';
import { INDIAN_STATES_DISTRICTS } from '../data/indiaLocations.ts';
import { DemandMap } from '../components/DemandMap.tsx';
import { GeographicDemandSummaryPanel } from '../components/GeographicDemandSummaryPanel.tsx';
import { DemandClustersTab } from '../components/DemandClustersTab.tsx';
import { ClusterDetailModal } from '../components/ClusterDetailModal.tsx';
import { InfrastructureGapsTab } from '../components/InfrastructureGapsTab.tsx';

type DashboardTab =
  | 'OVERVIEW'
  | 'DEMAND_CLUSTERS'
  | 'DEMAND_MAP'
  | 'CITIZEN_REQUESTS'
  | 'INFRASTRUCTURE_GAPS'
  | 'RECOMMENDED_PROJECTS'
  | 'IMPACT_TRACKING';

interface PolicymakerDashboardProps {
  onNavigateToCitizen: () => void;
}

export const PolicymakerDashboard: React.FC<PolicymakerDashboardProps> = ({
  onNavigateToCitizen,
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('OVERVIEW');
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState<DashboardKPIData | null>(null);
  const [requests, setRequests] = useState<CitizenRequest[]>([]);
  const [clusters, setClusters] = useState<DemandCluster[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<CitizenRequest | null>(null);
  const [selectedClusterIdForModal, setSelectedClusterIdForModal] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Filters for Citizen Requests table & Demand Map
  const [filters, setFilters] = useState<RequestFilterOptions>({
    state: 'All',
    district: 'All',
    category: 'All',
    urgency: 'All',
    status: 'All',
    dataOrigin: 'All',
    geoStatus: 'All',
    searchQuery: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [kpis, reqs, cls] = await Promise.all([
        requestService.getKPIs(),
        requestService.getRequests(filters),
        clusterService.getClusters(),
      ]);
      setKpiData(kpis);
      setRequests(reqs);
      setClusters(cls);
    } catch (e) {
      console.error('Failed to load dashboard data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters.state, filters.district, filters.category, filters.urgency, filters.status, filters.dataOrigin, filters.geoStatus]);

  // Handle search query with slight debounce or enter
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleStatusChange = async (newStatus: RequestStatus) => {
    if (!selectedRequest) return;
    setStatusUpdating(true);
    try {
      const updated = await requestService.updateStatus(selectedRequest.requestId, newStatus);
      setSelectedRequest(updated);
      // Reload list
      await loadData();
    } catch (e) {
      console.error('Status update failed', e);
    } finally {
      setStatusUpdating(false);
    }
  };

  const availableDistricts =
    filters.state && filters.state !== 'All' && INDIAN_STATES_DISTRICTS[filters.state]
      ? INDIAN_STATES_DISTRICTS[filters.state]
      : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Sample Data Notice Banner */}
      <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
          <span className="font-bold uppercase tracking-wider">Sample Data Simulation Notice:</span>
          <span>
            Displays sample data combined with live prototype submissions. Never represent sample data as actual government statistics.
          </span>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-amber-300 text-amber-900 font-semibold hover:bg-amber-100 transition-colors shrink-0 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Main Dashboard Layout with Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar (Desktop 3 cols, mobile horizontal scroll) */}
        <aside className="lg:col-span-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs lg:sticky lg:top-24">
            <div className="px-3 py-2 mb-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Administration Console
              </span>
              <h3 className="text-base font-bold text-slate-900">
                Demand Intelligence
              </h3>
            </div>

            <nav className="space-y-1">
              <button
                id="tab-overview"
                onClick={() => setActiveTab('OVERVIEW')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                  activeTab === 'OVERVIEW'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <BarChart3 className="w-4 h-4" />
                  <span>Overview</span>
                </div>
                <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-blue-800 text-white font-mono">
                  Live
                </span>
              </button>

              <button
                id="tab-demand-clusters"
                onClick={() => setActiveTab('DEMAND_CLUSTERS')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                  activeTab === 'DEMAND_CLUSTERS'
                    ? 'bg-purple-900 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <GitMerge className="w-4 h-4 text-purple-600" />
                  <span>Demand Clusters</span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 font-mono font-bold">
                  {kpiData?.activeClustersCount || clusters.length}
                </span>
              </button>

              <button
                id="tab-demand-map"
                onClick={() => setActiveTab('DEMAND_MAP')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                  activeTab === 'DEMAND_MAP'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Map className="w-4 h-4" />
                  <span>Demand Map</span>
                </div>
                <span className="text-[10px] text-slate-400">Geo</span>
              </button>

              <button
                id="tab-citizen-requests"
                onClick={() => setActiveTab('CITIZEN_REQUESTS')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                  activeTab === 'CITIZEN_REQUESTS'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <TableIcon className="w-4 h-4" />
                  <span>Citizen Requests</span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-mono">
                  {kpiData?.totalRequests || requests.length}
                </span>
              </button>

              <button
                id="tab-infra-gaps"
                onClick={() => setActiveTab('INFRASTRUCTURE_GAPS')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === 'INFRASTRUCTURE_GAPS'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Infrastructure Gaps</span>
                </div>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-200">
                  Evidence Fusion
                </span>
              </button>

              <button
                id="tab-rec-projects"
                onClick={() => setActiveTab('RECOMMENDED_PROJECTS')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === 'RECOMMENDED_PROJECTS'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4" />
                  <span>Recommended Projects</span>
                </div>
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                  Prototype
                </span>
              </button>

              <button
                id="tab-impact-tracking"
                onClick={() => setActiveTab('IMPACT_TRACKING')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === 'IMPACT_TRACKING'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <TrendingUp className="w-4 h-4" />
                  <span>Impact Tracking</span>
                </div>
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                  Prototype
                </span>
              </button>
            </nav>

            {/* Quick Action: Citizen Ingestion */}
            <div className="mt-8 pt-4 border-t border-slate-100">
              <button
                onClick={onNavigateToCitizen}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 text-blue-950 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>+ Log Citizen Need</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area (9 cols) */}
        <main className="lg:col-span-9 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-6">
              {/* Header Title */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                    Executive Demand Intelligence
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Aggregated citizen demands categorized across infrastructure sectors
                  </p>
                </div>
                <div className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 self-start sm:self-auto">
                  National Aggregation (India)
                </div>
              </div>

              {/* KPI Cards (Total Requests, Demand Clusters, Emerging Spikes, Jurisdictions) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Citizen Demands */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-xs text-slate-500 font-semibold block mb-1">
                    Citizen Requests Ingested
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                      {kpiData?.totalRequests ?? requests.length}
                    </span>
                    <span className="text-[11px] text-emerald-600 font-bold">
                      100% Ingested
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-2 block">
                    Unaltered citizen records
                  </span>
                </div>

                {/* Analytical Demand Clusters */}
                <div
                  onClick={() => setActiveTab('DEMAND_CLUSTERS')}
                  className="p-4 sm:p-5 rounded-2xl bg-white border border-purple-200 hover:border-purple-400 transition-all cursor-pointer shadow-2xs group"
                >
                  <span className="text-xs text-purple-900 font-semibold block mb-1 flex items-center justify-between">
                    <span>Demand Clusters</span>
                    <GitMerge className="w-3.5 h-3.5 text-purple-600" />
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-extrabold text-purple-950">
                      {kpiData?.activeClustersCount ?? clusters.length}
                    </span>
                    <span className="text-[11px] text-purple-700 font-semibold">
                      Deduplicated Gaps
                    </span>
                  </div>
                  <span className="text-[11px] text-purple-600/80 group-hover:underline mt-2 block">
                    Multilingual unification →
                  </span>
                </div>

                {/* Emerging Demand Spikes */}
                <div
                  onClick={() => setActiveTab('DEMAND_CLUSTERS')}
                  className="p-4 sm:p-5 rounded-2xl bg-white border border-rose-200 hover:border-rose-400 transition-all cursor-pointer shadow-2xs group"
                >
                  <span className="text-xs text-rose-800 font-semibold block mb-1 flex items-center justify-between">
                    <span>Emerging Spikes</span>
                    <Flame className="w-3.5 h-3.5 text-rose-600" />
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-extrabold text-rose-700">
                      {kpiData?.emergingDemandsCount ?? clusters.filter((c) => c.trendSignal === 'RISING').length}
                    </span>
                    <span className="text-[11px] text-rose-600 font-bold animate-pulse">
                      High Velocity
                    </span>
                  </div>
                  <span className="text-[11px] text-rose-600/80 group-hover:underline mt-2 block">
                    +50% 30-day surges →
                  </span>
                </div>

                {/* Districts Represented */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-xs text-blue-900 font-semibold block mb-1">
                    Districts Represented
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-extrabold text-blue-950">
                      {kpiData?.districtsRepresented ?? 0}
                    </span>
                    <span className="text-[11px] text-slate-500 font-semibold">
                      Jurisdictions
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-2 block">
                    Active geographic footprint
                  </span>
                </div>
              </div>

              {/* Charts Section: Requests by Category & Requests by Urgency */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Chart 1: Requests by Category */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Requests by Category
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Distribution across infrastructure sectors
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                      SAMPLE DATA
                    </span>
                  </div>

                  {/* Horizontal Bar visualization */}
                  <div className="space-y-3 pt-2">
                    {kpiData?.categoryDistribution && kpiData.categoryDistribution.length > 0 ? (
                      kpiData.categoryDistribution.slice(0, 6).map((item) => {
                        const total = kpiData.totalRequests || 1;
                        const percentage = Math.round((item.count / total) * 100);
                        return (
                          <div key={item.name} className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-slate-800">{item.name}</span>
                              <span className="text-slate-500">
                                {item.count} ({percentage}%)
                              </span>
                            </div>
                            <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-blue-900 transition-all duration-500"
                                style={{ width: `${Math.max(5, percentage)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-xs text-slate-400 py-6 text-center">
                        No requests recorded yet.
                      </div>
                    )}
                  </div>
                </div>

                {/* Chart 2: Requests by Urgency */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Requests by Urgency
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Severity classification from citizen inputs
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                      SAMPLE DATA
                    </span>
                  </div>

                  <div className="space-y-3 pt-2">
                    {kpiData?.urgencyDistribution?.map((item) => {
                      const total = kpiData.totalRequests || 1;
                      const percentage = Math.round((item.count / total) * 100);
                      const barColor =
                        item.name === 'Critical'
                          ? 'bg-rose-600'
                          : item.name === 'High'
                          ? 'bg-amber-500'
                          : item.name === 'Medium'
                          ? 'bg-blue-600'
                          : 'bg-emerald-600';

                      return (
                        <div key={item.name} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-slate-800">{item.name} Urgency</span>
                            <span className="text-slate-500">
                              {item.count} requests ({percentage}%)
                            </span>
                          </div>
                          <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${barColor} transition-all duration-500`}
                              style={{ width: `${Math.max(4, percentage)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Section 3: Top Development Needs (Subcategories) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Top Development Needs (Clustered)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      High-frequency infrastructure demands requiring capital expenditure
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                    SAMPLE DATA
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {kpiData?.topNeeds && kpiData.topNeeds.length > 0 ? (
                    kpiData.topNeeds.map((need, idx) => (
                      <div
                        key={idx}
                        className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">
                              {need.subcategory}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Sector: {need.category}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-auto">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              need.topUrgency === 'Critical'
                                ? 'bg-rose-100 text-rose-800'
                                : need.topUrgency === 'High'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {need.topUrgency} Urgency
                          </span>
                          <span className="text-xs font-bold text-slate-800 font-mono">
                            {need.count} {need.count === 1 ? 'cluster' : 'clusters'}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400 py-4 text-center">
                      No demand clusters aggregated yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: DEMAND CLUSTERS (Build 06: Semantic Demand Clustering & Deduplication) */}
          {activeTab === 'DEMAND_CLUSTERS' && (
            <DemandClustersTab
              clusters={clusters}
              loading={loading}
              onRefresh={loadData}
              onClusterSelected={(cl) => setSelectedClusterIdForModal(cl.clusterId)}
            />
          )}

          {/* TAB 2: DEMAND MAP (Build 05: Geographic Intelligence & Demand Hotspots) */}
          {activeTab === 'DEMAND_MAP' && (
            <div className="space-y-6">
              {/* Geographic Aggregation Summary Panel */}
              <GeographicDemandSummaryPanel
                requests={requests}
                selectedState={filters.state}
                selectedDistrict={filters.district}
                onFilterCategory={(cat: string) => {
                  setFilters((prev) => ({ ...prev, category: cat }));
                }}
                onViewInRequestsTab={() => {
                  setActiveTab('CITIZEN_REQUESTS');
                }}
              />

              {/* Interactive Google Map & Hotspot Clustered Layer */}
              <DemandMap
                requests={requests}
                clusters={clusters}
                selectedState={filters.state}
                selectedDistrict={filters.district}
                selectedCategory={filters.category}
                selectedUrgency={filters.urgency}
                onSelectState={(state: string) => {
                  setFilters((prev) => ({ ...prev, state, district: 'All' }));
                }}
                onSelectDistrict={(district: string) => {
                  setFilters((prev) => ({ ...prev, district }));
                }}
                onSelectCategory={(category: string) => {
                  setFilters((prev) => ({ ...prev, category }));
                }}
                onSelectUrgency={(urgency: string) => {
                  setFilters((prev) => ({ ...prev, urgency }));
                }}
                onInspectRequest={(req: CitizenRequest) => {
                  setSelectedRequest(req);
                }}
                onInspectCluster={(cl: DemandCluster) => {
                  setSelectedClusterIdForModal(cl.clusterId);
                }}
                isDemoDataEnabled={filters.dataOrigin !== 'PROTOTYPE_USER'}
              />
            </div>
          )}

          {/* TAB 3: CITIZEN REQUESTS (Table with Multi-filtering) */}
          {activeTab === 'CITIZEN_REQUESTS' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              {/* Header Title & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Citizen Requests Registry
                  </h2>
                  <p className="text-xs text-slate-500">
                    Verified citizen demands with status workflow management
                  </p>
                </div>

                <button
                  onClick={loadData}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold self-start sm:self-auto cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh List</span>
                </button>
              </div>

              {/* Filtering Controls: State, District, Category, Urgency, Search */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wide">
                  <Filter className="w-3.5 h-3.5 text-blue-900" />
                  <span>Filter Registry Demand</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                  {/* State Filter */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      State
                    </label>
                    <select
                      value={filters.state}
                      onChange={(e) =>
                        setFilters({ ...filters, state: e.target.value, district: 'All' })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-medium text-slate-900 focus:outline-hidden"
                    >
                      <option value="All">All States</option>
                      {Object.keys(INDIAN_STATES_DISTRICTS).map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* District Filter */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      District
                    </label>
                    <select
                      value={filters.district}
                      onChange={(e) => setFilters({ ...filters, district: e.target.value })}
                      disabled={filters.state === 'All'}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-medium text-slate-900 focus:outline-hidden disabled:bg-slate-100 disabled:cursor-not-allowed"
                    >
                      <option value="All">All Districts</option>
                      {availableDistricts.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Category Filter */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Category
                    </label>
                    <select
                      value={filters.category}
                      onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-medium text-slate-900 focus:outline-hidden"
                    >
                      <option value="All">All Categories</option>
                      {[
                        'Water',
                        'Sanitation',
                        'Healthcare',
                        'Education',
                        'Transport',
                        'Electricity',
                        'Digital Connectivity',
                        'Housing',
                        'Agriculture',
                        'Environment',
                        'Public Safety',
                        'Social Infrastructure',
                        'Other',
                      ].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Urgency Filter */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Urgency
                    </label>
                    <select
                      value={filters.urgency}
                      onChange={(e) => setFilters({ ...filters, urgency: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-medium text-slate-900 focus:outline-hidden"
                    >
                      <option value="All">All Urgencies</option>
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>

                  {/* Geo Status Filter (Build 05) */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Geo Resolution
                    </label>
                    <select
                      value={filters.geoStatus || 'All'}
                      onChange={(e) => setFilters({ ...filters, geoStatus: e.target.value as any })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-medium text-slate-900 focus:outline-hidden"
                    >
                      <option value="All">All Locations</option>
                      <option value="VERIFIED">Verified Pin / Geocoded</option>
                      <option value="APPROXIMATE">District Centroid</option>
                      <option value="UNRESOLVED">Unresolved Coordinates</option>
                    </select>
                  </div>

                  {/* Data Origin Filter */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Data Origin
                    </label>
                    <select
                      value={filters.dataOrigin || 'All'}
                      onChange={(e) => setFilters({ ...filters, dataOrigin: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-medium text-slate-900 focus:outline-hidden"
                    >
                      <option value="All">All Origins</option>
                      <option value="PROTOTYPE_USER">Live Prototype Submissions</option>
                      <option value="DEMO_SYNTHETIC">Pre-Seeded Sample Data</option>
                    </select>
                  </div>
                </div>

                {/* Search Bar */}
                <form onSubmit={handleSearchSubmit} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={filters.searchQuery}
                      onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                      placeholder="Search by ID, keyword, or village (e.g. Wardha, bridge, drinking water)..."
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Filter
                  </button>
                  {(filters.state !== 'All' ||
                    filters.district !== 'All' ||
                    filters.category !== 'All' ||
                    filters.urgency !== 'All' ||
                    filters.dataOrigin !== 'All' ||
                    filters.searchQuery) && (
                    <button
                      type="button"
                      onClick={() =>
                        setFilters({
                          state: 'All',
                          district: 'All',
                          category: 'All',
                          urgency: 'All',
                          status: 'All',
                          dataOrigin: 'All',
                          searchQuery: '',
                        })
                      }
                      className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                    >
                      Reset
                    </button>
                  )}
                </form>
              </div>

              {/* Table of Citizen Requests */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-3.5">Request ID</th>
                      <th className="py-3 px-3.5">Location</th>
                      <th className="py-3 px-3.5">Category</th>
                      <th className="py-3 px-3.5">Subcategory</th>
                      <th className="py-3 px-3.5">Urgency</th>
                      <th className="py-3 px-3.5">Date</th>
                      <th className="py-3 px-3.5">Status</th>
                      <th className="py-3 px-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400">
                          <div className="flex items-center justify-center gap-2">
                            <span className="w-4 h-4 border-2 border-blue-900 border-t-transparent rounded-full animate-spin" />
                            <span>Loading verified requests...</span>
                          </div>
                        </td>
                      </tr>
                    ) : requests.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400">
                          No requests found matching current filter criteria.
                        </td>
                      </tr>
                    ) : (
                      requests.map((r) => (
                        <tr
                          key={r.requestId}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="py-3 px-3.5 font-mono font-bold text-blue-900 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                {r.inputMethod === 'VOICE' ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 text-[10px] font-sans font-semibold border border-orange-200" title="Submitted via Voice Intake">
                                    <Mic className="w-3 h-3 text-orange-600" />
                                    Voice
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-sans font-semibold border border-blue-200" title="Submitted via Text Intake">
                                    <Edit3 className="w-3 h-3 text-blue-600" />
                                    Text
                                  </span>
                                )}
                                <span>{r.requestId}</span>
                              </div>
                              {r.dataOrigin === 'PROTOTYPE_USER' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-sans font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 w-fit">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                  Live Submission (Firestore)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 font-sans font-medium bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 w-fit">
                                  Sample Demo
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <div className="font-semibold text-slate-900">
                              {r.district}, {r.state}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {r.locality}
                            </div>
                            <div className="mt-1">
                              {r.geoStatus === 'VERIFIED' && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  <MapPin className="w-2.5 h-2.5 text-emerald-600" />
                                  Verified ({r.latitude?.toFixed(2)}, {r.longitude?.toFixed(2)})
                                </span>
                              )}
                              {r.geoStatus === 'APPROXIMATE' && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                  <MapPin className="w-2.5 h-2.5 text-amber-600" />
                                  Centroid ({r.latitude?.toFixed(2)}, {r.longitude?.toFixed(2)})
                                </span>
                              )}
                              {r.geoStatus === 'UNRESOLVED' && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                  <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                                  Unresolved Geo
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <span className="font-semibold text-slate-800">
                              {r.category}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 max-w-[180px] truncate" title={r.subcategory}>
                            {r.subcategory}
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                r.urgency === 'Critical'
                                  ? 'bg-rose-100 text-rose-800'
                                  : r.urgency === 'High'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {r.urgency}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                            {new Date(r.timestamp).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                                r.status === 'Submitted'
                                  ? 'bg-blue-100 text-blue-800'
                                  : r.status === 'Under Analysis'
                                  ? 'bg-purple-100 text-purple-800'
                                  : r.status === 'Clustered'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-right whitespace-nowrap">
                            <button
                              onClick={() => setSelectedRequest(r)}
                              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-900 font-semibold text-[11px] transition-colors cursor-pointer"
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
          )}

          {/* TAB 4: INFRASTRUCTURE GAPS (Verified Public Baseline Fusion) */}
          {activeTab === 'INFRASTRUCTURE_GAPS' && (
            <InfrastructureGapsTab
              onInspectCluster={(clusterId) => setSelectedClusterIdForModal(clusterId)}
              clusters={clusters}
              initialState={filters.state}
              initialDistrict={filters.district}
            />
          )}

          {/* TAB 5: RECOMMENDED PROJECTS (Prototype View) */}
          {activeTab === 'RECOMMENDED_PROJECTS' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Recommended Public Infrastructure Projects
                  </h2>
                  <p className="text-xs text-slate-500">
                    Automated capital project bundling derived from clustered community demands
                  </p>
                </div>
                <span className="text-[10px] uppercase font-bold px-2.5 py-1 rounded bg-slate-100 text-slate-600">
                  Extension Point (Phase 2)
                </span>
              </div>

              <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs space-y-3">
                <p className="font-semibold text-slate-900">
                  Evidence-Based Project Synthesis:
                </p>
                <p>
                  When multiple citizen requests in a contiguous block report broken bridges or contaminated tap lines, JanSetu AI synthesizes a consolidated Detailed Project Report (DPR) draft for district engineering tenders.
                </p>
                <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200 text-blue-900">
                  <span className="font-bold block">Draft Project #PRJ-MH-2026-088</span>
                  <span>Rural Culvert Bridge Replacement Package — Wardha District (Clusters 3 demands, impacting 8,400 residents)</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: IMPACT TRACKING (Prototype View) */}
          {activeTab === 'IMPACT_TRACKING' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Impact & Accountability Tracking
                  </h2>
                  <p className="text-xs text-slate-500">
                    Post-implementation citizen feedback loop and completed public asset monitoring
                  </p>
                </div>
                <span className="text-[10px] uppercase font-bold px-2.5 py-1 rounded bg-slate-100 text-slate-600">
                  Extension Point (Phase 3)
                </span>
              </div>

              <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs space-y-3">
                <p className="font-semibold text-slate-900">
                  Closed-Loop Citizen Validation:
                </p>
                <p>
                  Once administrative work orders are completed, original citizen contributors receive notifications via SMS/IVR to verify if water flow has resumed or if the paved road meets community standards.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* DETAIL INSPECTION MODAL */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-bold text-blue-900">
                    {selectedRequest.requestId}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      selectedRequest.urgency === 'Critical'
                        ? 'bg-rose-100 text-rose-800'
                        : selectedRequest.urgency === 'High'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {selectedRequest.urgency} Urgency
                  </span>
                  {selectedRequest.dataOrigin === 'PROTOTYPE_USER' ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Live Firestore Document
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-300">
                      Sample Demo Data
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Logged on {new Date(selectedRequest.timestamp).toLocaleString()}
                </p>
              </div>

              <button
                onClick={() => setSelectedRequest(null)}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto text-xs">
              {/* Location & Ingestion Channel */}
              <div className="p-3.5 rounded-lg bg-slate-100 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-slate-500 block text-[11px]">Administrative Location</span>
                  <span className="font-semibold text-slate-900 block">
                    {selectedRequest.locality ? `${selectedRequest.locality}, ` : ''}
                    {selectedRequest.district}, {selectedRequest.state} ({selectedRequest.country})
                  </span>
                  <div className="flex items-center gap-2 pt-0.5">
                    {selectedRequest.latitude && selectedRequest.longitude ? (
                      <span className="font-mono text-[10px] text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {selectedRequest.latitude.toFixed(4)}, {selectedRequest.longitude.toFixed(4)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-rose-600 font-medium">No Coordinates</span>
                    )}

                    {selectedRequest.geoStatus === 'VERIFIED' && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                        Verified Location ({selectedRequest.geoSource || 'GEOCODED'})
                      </span>
                    )}
                    {selectedRequest.geoStatus === 'APPROXIMATE' && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                        Approximate Centroid ({selectedRequest.geoSource || 'CENTROID'})
                      </span>
                    )}
                    {selectedRequest.geoStatus === 'UNRESOLVED' && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300">
                        Unresolved Geography
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 self-end sm:self-center">
                  <div className="text-right">
                    <span className="text-slate-500 block text-[11px]">Intake Channel</span>
                    <span className={`inline-flex items-center gap-1 font-bold ${selectedRequest.inputMethod === 'VOICE' ? 'text-orange-700' : 'text-blue-900'}`}>
                      {selectedRequest.inputMethod === 'VOICE' ? (
                        <>
                          <Mic className="w-3.5 h-3.5" />
                          <span>Voice ({selectedRequest.selectedLanguage || selectedRequest.originalLanguage})</span>
                        </>
                      ) : (
                        <>
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Written Text</span>
                        </>
                      )}
                    </span>
                  </div>
                  <div className="text-right pl-3 border-l border-slate-300">
                    <span className="text-slate-500 block text-[11px]">AI Confidence</span>
                    <span className="font-bold text-blue-900">
                      {Math.round(selectedRequest.confidenceScore * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Extracted Numerical Data Points */}
              <div className="p-3.5 rounded-xl bg-slate-900 text-white">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                    Extracted Quantitative Indicators (Anti-Fabrication Guardrail)
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Demographic precision
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-2 rounded bg-slate-800 border border-slate-700">
                    <span className="text-[10px] text-slate-400 block">Affected Citizens</span>
                    <span className="text-sm font-bold text-amber-300">
                      {selectedRequest.affectedPopulationMentioned !== null && selectedRequest.affectedPopulationMentioned !== undefined
                        ? `${selectedRequest.affectedPopulationMentioned.toLocaleString()}`
                        : 'None stated'}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-800 border border-slate-700">
                    <span className="text-[10px] text-slate-400 block">Settlement Population</span>
                    <span className="text-sm font-bold text-emerald-400">
                      {selectedRequest.populationMentioned !== null && selectedRequest.populationMentioned !== undefined
                        ? `${selectedRequest.populationMentioned.toLocaleString()}`
                        : 'None stated'}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-800 border border-slate-700">
                    <span className="text-[10px] text-slate-400 block">Distance Barrier</span>
                    <span className="text-sm font-bold text-cyan-300">
                      {selectedRequest.distanceMentionedKm !== null && selectedRequest.distanceMentionedKm !== undefined
                        ? `${selectedRequest.distanceMentionedKm} km`
                        : 'None stated'}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-800 border border-slate-700">
                    <span className="text-[10px] text-slate-400 block">Households</span>
                    <span className="text-sm font-bold text-purple-300">
                      {selectedRequest.householdsMentioned !== null && selectedRequest.householdsMentioned !== undefined
                        ? `${selectedRequest.householdsMentioned.toLocaleString()}`
                        : 'None stated'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Original Expression & English Translation */}
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex justify-between mb-1.5">
                    <span className="font-bold text-slate-700">
                      {selectedRequest.inputMethod === 'VOICE' ? 'Citizen Voice (Transcribed)' : 'Citizen Original Expression'}
                    </span>
                    <span className="text-slate-500">Language: {selectedRequest.originalLanguage}</span>
                  </div>
                  <p className="text-slate-800 italic leading-relaxed text-sm">
                    "{selectedRequest.originalRequest}"
                  </p>
                  {selectedRequest.originalTranscript && selectedRequest.originalTranscript !== selectedRequest.originalRequest && (
                    <p className="text-[11px] text-slate-500 mt-1 pt-1 border-t border-slate-200">
                      <span className="font-semibold">Original Audio Transcript:</span> "{selectedRequest.originalTranscript}"
                    </p>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200">
                  <div className="flex justify-between mb-1.5">
                    <span className="font-bold text-blue-900">Standardized English Translation</span>
                    <span className="text-blue-800">For Policy Analysis</span>
                  </div>
                  <p className="text-slate-900 font-medium leading-relaxed text-sm">
                    "{selectedRequest.translatedRequest}"
                  </p>
                </div>
              </div>

              {/* Classifications */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">Infrastructure Sector</span>
                  <span className="font-bold text-slate-900 text-xs">
                    {selectedRequest.category} ({selectedRequest.subcategory})
                  </span>
                </div>

                <div className="p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">Request Type</span>
                  <span className="font-bold text-slate-900 text-xs">
                    {selectedRequest.requestType}
                  </span>
                </div>
              </div>

              {/* Summary */}
              <div className="p-3 rounded-lg bg-amber-50/50 border border-amber-200">
                <span className="font-bold text-amber-900 block mb-1">Demand Summary</span>
                <p className="text-amber-950 font-medium">{selectedRequest.summary}</p>
              </div>

              {/* Status Workflow Update */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="font-bold text-slate-900 block">
                  Update Administrative Review Status:
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['Submitted', 'Under Analysis', 'Clustered', 'Reviewed'] as RequestStatus[]).map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        disabled={statusUpdating || selectedRequest.status === st}
                        onClick={() => handleStatusChange(st)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          selectedRequest.status === st
                            ? 'bg-blue-900 text-white shadow-xs'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {st}
                      </button>
                    )
                  )}
                </div>
                <span className="text-[11px] text-slate-500 block mt-1">
                  Transitions update registry and policymaker dashboard in real-time.
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-colors"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cluster Details Modal (Build 06: Semantic Demand Clustering & Deduplication) */}
      {selectedClusterIdForModal && (
        <ClusterDetailModal
          clusterId={selectedClusterIdForModal}
          onClose={() => setSelectedClusterIdForModal(null)}
          onClusterUpdated={loadData}
          availableClusters={clusters}
        />
      )}
    </div>
  );
};
