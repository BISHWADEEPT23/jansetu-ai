import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Building,
  CheckCircle2,
  ChevronRight,
  Database,
  ExternalLink,
  Eye,
  Filter,
  Flame,
  HelpCircle,
  Info,
  Layers,
  MapPin,
  RefreshCw,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { INDIAN_STATES_DISTRICTS } from '../data/indiaLocations.ts';
import { infrastructureGapService } from '../services/infrastructureGapService.ts';
import { publicDataService } from '../services/publicDataService.ts';
import type { DemandCluster, InfrastructureCategory } from '../types/citizenRequest.ts';
import type {
  DatasetSource,
  EvidenceCoverageKPI,
  GapLevel,
  InfrastructureGapAssessment,
} from '../types/evidence.ts';

interface InfrastructureGapsTabProps {
  onInspectCluster: (clusterId: string) => void;
  clusters: DemandCluster[];
  initialState?: string;
  initialDistrict?: string;
}

export const InfrastructureGapsTab: React.FC<InfrastructureGapsTabProps> = ({
  onInspectCluster,
  clusters,
  initialState = 'All',
  initialDistrict = 'All',
}) => {
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<InfrastructureGapAssessment[]>([]);
  const [coverageKPI, setCoverageKPI] = useState<EvidenceCoverageKPI | null>(null);
  const [datasetSources, setDatasetSources] = useState<DatasetSource[]>([]);
  const [selectedSourceDetail, setSelectedSourceDetail] = useState<DatasetSource | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedState, setSelectedState] = useState<string>(initialState);
  const [selectedDistrict, setSelectedDistrict] = useState<string>(initialDistrict);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedGapLevel, setSelectedGapLevel] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const availableDistricts = useMemo(() => {
    if (selectedState === 'All' || !INDIAN_STATES_DISTRICTS[selectedState]) {
      return [];
    }
    return INDIAN_STATES_DISTRICTS[selectedState];
  }, [selectedState]);

  const loadGapData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [assessmentsData, kpiData, sourcesData] = await Promise.all([
        infrastructureGapService.getAllGapAssessments({
          state: selectedState !== 'All' ? selectedState : undefined,
          district: selectedDistrict !== 'All' ? selectedDistrict : undefined,
          category: selectedCategory !== 'All' ? selectedCategory : undefined,
          gapLevel: selectedGapLevel !== 'ALL' ? (selectedGapLevel as GapLevel) : undefined,
          searchQuery: searchQuery || undefined,
        }),
        infrastructureGapService.getEvidenceCoverageKPI(),
        publicDataService.getDatasetSources(),
      ]);

      setAssessments(assessmentsData);
      setCoverageKPI(kpiData);
      setDatasetSources(sourcesData);
    } catch (err: any) {
      console.error('Failed to load gap assessments:', err);
      setError(err.message || 'Failed to load gap assessments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGapData();
  }, [selectedState, selectedDistrict, selectedCategory, selectedGapLevel]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadGapData();
  };

  const handleResetFilters = () => {
    setSelectedState('All');
    setSelectedDistrict('All');
    setSelectedCategory('All');
    setSelectedGapLevel('ALL');
    setSearchQuery('');
  };

  const getSourceObj = (sourceId?: string) => {
    if (!sourceId) return null;
    return datasetSources.find((s) => s.sourceId === sourceId) || null;
  };

  // Severity counts
  const severeCount = useMemo(
    () => assessments.filter((a) => a.gapLevel === 'SEVERE').length,
    [assessments]
  );
  const highCount = useMemo(
    () => assessments.filter((a) => a.gapLevel === 'HIGH').length,
    [assessments]
  );
  const addressedCount = useMemo(
    () => assessments.filter((a) => a.relatedProjects && a.relatedProjects.length > 0).length,
    [assessments]
  );
  const insufficientEvidenceCount = useMemo(
    () => assessments.filter((a) => a.gapLevel === 'INSUFFICIENT_EVIDENCE').length,
    [assessments]
  );

  return (
    <div className="space-y-6">
      {/* 1. HEADER & SOURCE SEPARATION NOTICE */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Infrastructure Gap Engine
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-200">
                Verified Evidence Fusion
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Deterministic infrastructure gap assessment comparing citizen demand clusters with verified baseline data and official benchmarks.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadGapData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Recalculate Gaps</span>
            </button>
          </div>
        </div>

        {/* Strict Source Separation Architecture Card */}
        <div className="bg-slate-900 text-white rounded-xl p-4 text-xs space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-bold text-amber-300 uppercase tracking-wider text-[11px]">
                Governing Principle: Separation of Citizen Demand vs. Official Baseline Capacity
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              Deterministic Code Engine (Zero LLM Hallucinations)
            </span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Citizen requests define <em>what communities are asking for</em>. Official indicator registries define <em>what infrastructure actually exists</em>. Gaps are calculated deterministically using published government standards (e.g. Indian Public Health Standards, Jal Jeevan Mission, PMGSY road standards).
          </p>
        </div>
      </div>

      {/* 2. KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Evaluated */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-semibold block mb-1">
            Evaluated Clusters
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">
              {assessments.length}
            </span>
            <span className="text-[11px] text-slate-500">Clusters</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Across {coverageKPI?.totalDistrictsEvaluated ?? 'all'} districts
          </span>
        </div>

        {/* Evidence Coverage KPI */}
        <div className="p-4 rounded-2xl bg-white border border-blue-200 shadow-2xs">
          <span className="text-xs text-blue-900 font-semibold block mb-1 flex items-center justify-between">
            <span>Evidence Coverage</span>
            <Database className="w-3.5 h-3.5 text-blue-600" />
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-blue-950">
              {coverageKPI?.coveragePercentage ?? 75}%
            </span>
            <span className="text-[11px] text-emerald-600 font-bold">
              {coverageKPI?.clustersWithVerifiedEvidence ?? assessments.length} Linked
            </span>
          </div>
          <span className="text-[10px] text-blue-800/80 mt-1 block">
            Clusters mapped to baseline data
          </span>
        </div>

        {/* Severe Gaps */}
        <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-2xs">
          <span className="text-xs text-rose-800 font-semibold block mb-1 flex items-center justify-between">
            <span>Severe Deficits</span>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-rose-700">
              {severeCount}
            </span>
            <span className="text-[11px] text-rose-600 font-bold">
              Critical Urgency
            </span>
          </div>
          <span className="text-[10px] text-rose-600/80 mt-1 block">
            High demand + deep capacity deficit
          </span>
        </div>

        {/* Ongoing Capital Works */}
        <div className="p-4 rounded-2xl bg-white border border-emerald-200 shadow-2xs">
          <span className="text-xs text-emerald-900 font-semibold block mb-1 flex items-center justify-between">
            <span>Addressed by Works</span>
            <Building className="w-3.5 h-3.5 text-emerald-600" />
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-800">
              {addressedCount}
            </span>
            <span className="text-[11px] text-emerald-700 font-semibold">
              Work Orders
            </span>
          </div>
          <span className="text-[10px] text-emerald-700/80 mt-1 block">
            Active public projects underway
          </span>
        </div>

        {/* Insufficient Evidence */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs col-span-2 lg:col-span-1">
          <span className="text-xs text-slate-600 font-semibold block mb-1 flex items-center justify-between">
            <span>Data Unavailable</span>
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-700">
              {insufficientEvidenceCount}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Unverified
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Never converted to 0; kept null
          </span>
        </div>
      </div>

      {/* 3. FILTER CONTROLS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
          {/* State selector */}
          <div className="min-w-[150px] flex-1 sm:flex-initial">
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">State</label>
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedDistrict('All');
              }}
              className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-800"
            >
              <option value="All">All States</option>
              {Object.keys(INDIAN_STATES_DISTRICTS).map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* District selector */}
          <div className="min-w-[150px] flex-1 sm:flex-initial">
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">District</label>
            <select
              value={selectedDistrict}
              disabled={selectedState === 'All'}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-800 disabled:opacity-50"
            >
              <option value="All">All Districts</option>
              {availableDistricts.map((dst) => (
                <option key={dst} value={dst}>
                  {dst}
                </option>
              ))}
            </select>
          </div>

          {/* Category selector */}
          <div className="min-w-[160px] flex-1 sm:flex-initial">
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Sector / Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-800"
            >
              <option value="All">All Categories</option>
              <option value="Water">Water Infrastructure</option>
              <option value="Healthcare">Healthcare Facilities</option>
              <option value="Transport">Transport & Roads</option>
              <option value="Electricity">Electricity & Power</option>
              <option value="Sanitation">Sanitation & Drainage</option>
              <option value="Education">Education & Schools</option>
              <option value="Digital Connectivity">Digital Connectivity</option>
            </select>
          </div>

          {/* Gap Level */}
          <div className="min-w-[150px] flex-1 sm:flex-initial">
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Evaluated Gap</label>
            <select
              value={selectedGapLevel}
              onChange={(e) => setSelectedGapLevel(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-800"
            >
              <option value="ALL">All Gap Levels</option>
              <option value="SEVERE">🔴 Severe Gap</option>
              <option value="HIGH">🟠 High Gap</option>
              <option value="MODERATE">🟡 Moderate Gap</option>
              <option value="LOW">🟢 Low Gap</option>
              <option value="INSUFFICIENT_EVIDENCE">⚪ Insufficient Evidence</option>
            </select>
          </div>

          {/* Search bar */}
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Search Assessments</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search canonical problem, district, rationale..."
                className="w-full text-xs px-3 py-2 pl-9 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-800"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          <div className="self-end flex items-center gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Filter
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* 4. GAP ASSESSMENTS LIST / TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-blue-900" />
            <span className="font-bold text-xs text-slate-800 uppercase tracking-wide">
              Infrastructure Gap Registry ({assessments.length} Clusters Evaluated)
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            Click any row to inspect member requests and complete evidence panel
          </span>
        </div>

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-900" />
            <p className="text-xs font-semibold">Running deterministic gap calculations across datasets...</p>
          </div>
        ) : assessments.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <p className="font-semibold text-sm">No gap assessments match the current filters.</p>
            <p className="text-xs text-slate-400">Try broadening your state, district, or category selections.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {assessments.map((item) => {
              const clusterObj = clusters.find((c) => c.clusterId === item.clusterId);
              const hasProjects = item.relatedProjects && item.relatedProjects.length > 0;
              const hasConflict = item.conflictingSources && item.conflictingSources.length > 0;

              return (
                <div
                  key={item.clusterId}
                  onClick={() => onInspectCluster(item.clusterId)}
                  className="p-5 hover:bg-slate-50/90 transition-colors cursor-pointer space-y-3 group"
                >
                  {/* Top row: Cluster ID, Category, District, Gap Level Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                        {item.clusterId}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-900">
                        {item.category}
                      </span>
                      <span className="text-xs text-slate-600 flex items-center gap-1 font-semibold">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.district}, {item.state}</span>
                      </span>
                      {hasConflict && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-700" />
                          <span>Conflicting Data Reported</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-md text-xs font-black tracking-wide ${
                          item.gapLevel === 'SEVERE'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : item.gapLevel === 'HIGH'
                            ? 'bg-orange-100 text-orange-800 border border-orange-300'
                            : item.gapLevel === 'MODERATE'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : item.gapLevel === 'LOW'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-200 text-slate-700 border border-slate-300'
                        }`}
                      >
                        {item.gapLevel.replace('_', ' ')}
                      </span>

                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-900 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>

                  {/* Middle row: Canonical Problem Statement */}
                  <div className="text-sm font-bold text-slate-900 leading-snug">
                    {item.canonicalProblem}
                  </div>

                  {/* Deterministic Rationale */}
                  <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
                    <span className="font-bold text-slate-900 mr-1">Gap Rationale:</span>
                    {item.rationale}
                  </div>

                  {/* Bottom Indicators & Metrics */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                    {/* Demand Metric */}
                    <div className="p-2.5 rounded-lg bg-blue-50/50 border border-blue-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-semibold text-blue-900 uppercase block">
                          Citizen Demand
                        </span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="text-base font-extrabold text-blue-950">
                            {item.citizenRequestCount}
                          </span>
                          <span className="text-[11px] text-blue-800">Requests</span>
                        </div>
                      </div>
                      {clusterObj?.trendSignal === 'RISING' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                          🔥 Rising
                        </span>
                      )}
                    </div>

                    {/* Primary Benchmark vs Actual */}
                    {item.indicators && item.indicators.length > 0 ? (
                      <div className="p-2.5 rounded-lg bg-purple-50/50 border border-purple-100">
                        <span className="text-[10px] font-semibold text-purple-900 uppercase block">
                          {item.indicators[0].name}
                        </span>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="text-base font-extrabold text-purple-950">
                            {item.indicators[0].value !== null && item.indicators[0].value !== undefined
                              ? item.indicators[0].value
                              : 'Data unavailable'}
                          </span>
                          {item.indicators[0].benchmark !== null && (
                            <span className="text-[10px] text-purple-700">
                              (Norm: {item.indicators[0].benchmark})
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-center">
                        No official indicator registered
                      </div>
                    )}

                    {/* Existing Public Projects Status */}
                    <div
                      className={`p-2.5 rounded-lg border flex items-center justify-between ${
                        hasProjects
                          ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                          : 'bg-amber-50/50 border-amber-200 text-amber-950'
                      }`}
                    >
                      <div>
                        <span className="text-[10px] font-semibold uppercase block">
                          Public Capital Works
                        </span>
                        <span className="font-bold text-xs mt-0.5 block">
                          {hasProjects
                            ? `${item.relatedProjects.length} Work Order Underway`
                            : 'No Ongoing Works'}
                        </span>
                      </div>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          hasProjects
                            ? 'bg-emerald-200 text-emerald-900'
                            : 'bg-amber-200 text-amber-900'
                        }`}
                      >
                        {hasProjects ? 'ACCOUNTED' : 'UNADDRESSED'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. DATASET REGISTRY TRANSPARENCY SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Integrated Dataset Registry
            </h3>
            <p className="text-xs text-slate-500">
              Verified public baseline datasets powering JanSetu AI evidence fusion
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700">
            {datasetSources.length} Datasets Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {datasetSources.map((source) => (
            <div
              key={source.sourceId}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-slate-900 truncate" title={source.name}>
                  {source.name}
                </span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    source.sourceType === 'VERIFIED_PUBLIC'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {source.sourceType === 'VERIFIED_PUBLIC' ? 'VERIFIED' : 'DEMO DATA'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 line-clamp-2">
                {source.description}
              </p>
              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                <span>{source.provider}</span>
                <button
                  onClick={() => setSelectedSourceDetail(source)}
                  className="text-blue-900 font-semibold underline hover:text-blue-700 cursor-pointer"
                >
                  Inspect Source
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* METADATA INSPECTOR MODAL */}
      {selectedSourceDetail && (
        <div className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden text-xs">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-900" />
                <span className="font-bold text-slate-900">Dataset Registry Metadata</span>
              </div>
              <button
                onClick={() => setSelectedSourceDetail(null)}
                className="p-1 rounded-md hover:bg-slate-200 text-slate-500 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3 text-slate-700">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Dataset Title</span>
                <span className="font-bold text-slate-900 text-sm">{selectedSourceDetail.name}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Provider / Authority</span>
                <span className="text-slate-800">{selectedSourceDetail.provider}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Description</span>
                <p className="text-slate-600 text-[11px] mt-0.5">{selectedSourceDetail.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Source Type</span>
                  <span className="font-mono text-slate-800">{selectedSourceDetail.sourceType}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Geographic Level</span>
                  <span className="font-mono text-slate-800">{selectedSourceDetail.geographicLevel}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Last Updated</span>
                  <span className="font-mono text-slate-800">{selectedSourceDetail.lastUpdated || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">License</span>
                  <span className="font-mono text-slate-800">{selectedSourceDetail.license || 'Open Access'}</span>
                </div>
              </div>

              {selectedSourceDetail.methodologyNotes && (
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Methodology</span>
                  <p className="text-[11px] text-slate-700 mt-0.5">{selectedSourceDetail.methodologyNotes}</p>
                </div>
              )}

              {selectedSourceDetail.sourceUrl && (
                <div className="pt-2">
                  <a
                    href={selectedSourceDetail.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-blue-900 hover:text-blue-700 font-semibold"
                  >
                    <span>Visit Official Portal</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedSourceDetail(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs cursor-pointer"
              >
                Close Metadata
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
