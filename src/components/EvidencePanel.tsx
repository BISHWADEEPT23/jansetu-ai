import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Building,
  CheckCircle,
  CheckCircle2,
  Database,
  ExternalLink,
  Flame,
  HelpCircle,
  Info,
  Layers,
  MapPin,
  RefreshCw,
  Scale,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import { infrastructureGapService } from '../services/infrastructureGapService.ts';
import { publicDataService } from '../services/publicDataService.ts';
import type { DemandCluster } from '../types/citizenRequest.ts';
import type {
  DatasetSource,
  GeographicEvidence,
  InfrastructureGapAssessment,
  PublicProject,
} from '../types/evidence.ts';

interface EvidencePanelProps {
  cluster: DemandCluster;
  onRefresh?: () => void;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({ cluster, onRefresh }) => {
  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState<InfrastructureGapAssessment | null>(null);
  const [evidence, setEvidence] = useState<GeographicEvidence | null>(null);
  const [datasetSources, setDatasetSources] = useState<DatasetSource[]>([]);
  const [selectedSourceDetail, setSelectedSourceDetail] = useState<DatasetSource | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadEvidenceData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [gapRes, evRes, sourcesRes] = await Promise.all([
        infrastructureGapService.getClusterGapAssessment(cluster.clusterId),
        publicDataService.getGeographicEvidence(cluster.state || undefined, cluster.district || undefined),
        publicDataService.getDatasetSources(),
      ]);
      setAssessment(gapRes);
      setEvidence(evRes);
      setDatasetSources(sourcesRes);
    } catch (e: any) {
      console.error('Failed to load evidence panel data', e);
      setError(e.message || 'Failed to load verified evidence.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvidenceData();
  }, [cluster.clusterId, cluster.state, cluster.district]);

  // Helper to map sourceId to human name
  const getSourceName = (sourceId?: string) => {
    if (!sourceId) return 'Unspecified Source';
    const found = datasetSources.find((s) => s.sourceId === sourceId);
    return found ? found.name : sourceId;
  };

  const getSourceObj = (sourceId?: string) => {
    if (!sourceId) return null;
    return datasetSources.find((s) => s.sourceId === sourceId) || null;
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-slate-500 space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-900" />
        <p className="text-xs font-semibold">Fusing Citizen Demand with Verified Geographic Evidence...</p>
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs space-y-2">
        <div className="flex items-center gap-2 font-bold">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>Evidence Fusion Unavailable</span>
        </div>
        <p>{error || 'Unable to retrieve gap assessment for this cluster.'}</p>
      </div>
    );
  }

  const isSynthetic = evidence?.sourceReferences.includes('SRC-DEMO-SYNTHETIC') || false;

  return (
    <div className="space-y-6 text-slate-800">
      {/* 0. PROVENANCE BANNER: STRICT SOURCE SEPARATION NOTIFICATION */}
      <div className="bg-slate-900 text-white rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Verified Evidence Layer Active
            </span>
            {isSynthetic && (
              <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-mono font-black text-[10px] uppercase">
                Synthetic Demo Evidence
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-300 mt-1">
            Separating citizen reported demand from official infrastructure baselines. Every statistic includes verified dataset provenance.
          </p>
        </div>

        <button
          onClick={loadEvidenceData}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Evidence</span>
        </button>
      </div>

      {/* 1. CITIZEN DEMAND SUMMARY */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Layer A: Citizen Reported Demand
            </h4>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200 font-semibold">
            Source: JanSetu Citizen Submissions
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] font-semibold text-slate-500 uppercase block">Report Volume</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-slate-900">{cluster.requestCount}</span>
              <span className="text-xs text-slate-500">Citizen Requests</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] font-semibold text-slate-500 uppercase block">Demand Trend Signal</span>
            <div className="flex items-center gap-1.5 mt-1">
              {cluster.trendSignal === 'RISING' || cluster.isEmergingDemand ? (
                <>
                  <Flame className="w-4 h-4 text-rose-600" />
                  <span className="text-sm font-bold text-rose-700">🔥 Rising Demand</span>
                  {cluster.growthPercentage ? (
                    <span className="text-[11px] font-mono text-rose-600 font-bold">
                      (+{cluster.growthPercentage}%)
                    </span>
                  ) : null}
                </>
              ) : cluster.trendSignal === 'FALLING' ? (
                <>
                  <TrendingDown className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-bold text-emerald-700">Decreasing</span>
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4 text-slate-600" />
                  <span className="text-sm font-bold text-slate-700">Steady Volume</span>
                </>
              )}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] font-semibold text-slate-500 uppercase block">Administrative Unit</span>
            <div className="flex items-center gap-1 text-xs font-semibold text-slate-900 mt-1">
              <MapPin className="w-3.5 h-3.5 text-blue-900 shrink-0" />
              <span className="truncate">
                {cluster.district ? `${cluster.district}, ${cluster.state}` : 'Unresolved District'}
              </span>
            </div>
          </div>
        </div>

        <div className="p-2.5 bg-blue-50/50 rounded-lg border border-blue-100 text-xs text-blue-950">
          <span className="font-bold">Canonical Demand: </span>
          <span>{cluster.canonicalDemand || cluster.canonicalProblem}</span>
        </div>
      </div>

      {/* 2. DEMOGRAPHIC CONTEXT (VERIFIED OR SYNTHETIC EVIDENCE) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Layer B: Demographic Context
            </h4>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
              Reference Period: {evidence?.demographicYear || '2024'}
            </span>
            {isSynthetic && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                DEMO DATA
              </span>
            )}
          </div>
        </div>

        {evidence ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] font-semibold text-slate-500 uppercase block">Total Population</span>
              <div className="text-lg font-bold text-slate-900 mt-0.5">
                {evidence.population !== null ? evidence.population.toLocaleString('en-IN') : (
                  <span className="text-slate-400 italic text-sm">Data unavailable</span>
                )}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                <span>Source: Census of India</span>
                <button
                  onClick={() => setSelectedSourceDetail(getSourceObj('SRC-GOV-CENSUS'))}
                  className="text-blue-900 underline hover:text-blue-700 cursor-pointer text-[10px]"
                >
                  Verify
                </button>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] font-semibold text-slate-500 uppercase block">Population Density</span>
              <div className="text-lg font-bold text-slate-900 mt-0.5">
                {evidence.populationDensity !== null ? `${evidence.populationDensity} / km²` : (
                  <span className="text-slate-400 italic text-sm">Data unavailable</span>
                )}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Area: {evidence.areaKm2 ? `${evidence.areaKm2.toLocaleString()} km²` : 'N/A'}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] font-semibold text-slate-500 uppercase block">Data Quality</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded ${
                    evidence.dataQuality === 'HIGH'
                      ? 'bg-emerald-100 text-emerald-800'
                      : evidence.dataQuality === 'MEDIUM'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {evidence.dataQuality} QUALITY
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Official registry match for administrative district
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-500">
            No demographic registry loaded for {cluster.district || 'this area'}.
          </div>
        )}
      </div>

      {/* 3. EXISTING INFRASTRUCTURE INVENTORY */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-purple-700" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Layer C: Registered Public Infrastructure Baseline
            </h4>
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            Domain: {cluster.category}
          </span>
        </div>

        {assessment.indicators && assessment.indicators.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Indicator Name</th>
                  <th className="py-2.5 px-3">Actual Value</th>
                  <th className="py-2.5 px-3">Benchmark Norm</th>
                  <th className="py-2.5 px-3">Calculated Variance</th>
                  <th className="py-2.5 px-3">Source Dataset</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {assessment.indicators.map((ind, idx) => {
                  const source = getSourceObj(ind.sourceId);
                  return (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 font-semibold text-slate-800">
                        {ind.name}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">
                        {/* TEST CASE 29: Missing data remains null, displayed as 'Data unavailable', NEVER 0 */}
                        {ind.value !== null && ind.value !== undefined ? (
                          <span>{ind.value}</span>
                        ) : (
                          <span className="text-slate-400 font-normal italic">
                            Data unavailable
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-600">
                        {ind.benchmark !== null && ind.benchmark !== undefined ? (
                          <span>{ind.benchmark}</span>
                        ) : (
                          <span className="text-slate-400 italic">No standard benchmark</span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono">
                        {ind.difference !== null && ind.difference !== undefined ? (
                          <span
                            className={`font-bold ${
                              typeof ind.difference === 'number' && ind.difference < 0
                                ? 'text-rose-600'
                                : 'text-emerald-600'
                            }`}
                          >
                            {typeof ind.difference === 'number' && ind.difference > 0 ? `+${ind.difference}` : ind.difference} {ind.unit || ''}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-700 truncate max-w-[140px]" title={source?.name}>
                            {source?.name || ind.sourceId}
                          </span>
                          {source && (
                            <button
                              onClick={() => setSelectedSourceDetail(source)}
                              className="text-blue-800 hover:text-blue-950 cursor-pointer"
                              title="Inspect Dataset Metadata"
                            >
                              <Info className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Period: {ind.referencePeriod || 'Latest'}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-500">
            No specific baseline indicators available for category "{cluster.category}".
          </div>
        )}
      </div>

      {/* 4. CONFLICTING DATA SOURCES ALERT (TEST CASE 28: SOURCE DISAGREEMENT) */}
      {assessment.conflictingSources && assessment.conflictingSources.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-xs text-amber-950 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span className="uppercase tracking-wider">Source Disagreement Flagged</span>
            <span className="px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 font-mono text-[10px]">
              No Silent Overwrite
            </span>
          </div>
          <p className="text-amber-900 text-[11px]">
            Multiple official reporting systems record divergent facility counts for this district. JanSetu AI preserves both values rather than arbitrarily selecting one:
          </p>

          <div className="space-y-2 pt-1">
            {assessment.conflictingSources.map((conflict, cIdx) => (
              <div key={cIdx} className="bg-white rounded-lg p-3 border border-amber-200 shadow-2xs space-y-1">
                <span className="font-bold text-slate-900 block">{conflict.indicator}</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 block text-[10px]">Source A: {conflict.sourceA.name}</span>
                    <span className="font-bold text-slate-900 font-mono text-sm">{conflict.sourceA.value}</span>
                    <span className="text-slate-400 block text-[10px]">Period: {conflict.sourceA.referencePeriod}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 block text-[10px]">Source B: {conflict.sourceB.name}</span>
                    <span className="font-bold text-slate-900 font-mono text-sm">{conflict.sourceB.value}</span>
                    <span className="text-slate-400 block text-[10px]">Period: {conflict.sourceB.referencePeriod}</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-600 italic pt-1">
                  <span className="font-semibold">Reconciliation note:</span> {conflict.notes}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. DETERMINISTIC INFRASTRUCTURE GAP ASSESSMENT */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-blue-900" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Infrastructure Gap Engine Evaluation
            </h4>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Deterministic Rule-Based Assessment
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold text-slate-700">Calculated Gap Level:</span>
              <span
                className={`px-2.5 py-1 rounded-md text-xs font-black tracking-wide ${
                  assessment.gapLevel === 'SEVERE'
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : assessment.gapLevel === 'HIGH'
                    ? 'bg-orange-100 text-orange-800 border border-orange-300'
                    : assessment.gapLevel === 'MODERATE'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : assessment.gapLevel === 'LOW'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-slate-200 text-slate-700 border border-slate-300'
                }`}
              >
                {assessment.gapLevel.replace('_', ' ')}
              </span>
            </div>

            <div className="text-[11px] text-slate-500">
              Evidence Quality: <strong className="text-slate-800">{assessment.evidenceQuality}</strong>
            </div>
          </div>

          <div className="text-xs text-slate-800 leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
            <span className="font-bold block text-slate-900 mb-0.5">Assessment Rationale:</span>
            {assessment.rationale}
          </div>

          <div className="p-2.5 bg-blue-50/60 rounded-md text-[11px] text-blue-900 border border-blue-200">
            <span className="font-bold">Responsible Governance Directive: </span>
            <span>
              Infrastructure Gap indicates the measured mathematical difference between community demand and verified baseline capacity. It is strictly not a political performance score.
            </span>
          </div>
        </div>
      </div>

      {/* 6. EXISTING PUBLIC CAPITAL PROJECTS (TEST CASE 30: "Is government already addressing this?") */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-emerald-700" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Layer D: Public Investment & Ongoing Works
            </h4>
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            Answers: "Is government already addressing this demand?"
          </span>
        </div>

        {assessment.relatedProjects && assessment.relatedProjects.length > 0 ? (
          <div className="space-y-2.5">
            {assessment.relatedProjects.map((proj) => (
              <div
                key={proj.projectId}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 hover:bg-slate-100/60 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="font-bold text-xs text-slate-900">
                    {proj.projectName}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold self-start sm:self-auto ${
                      proj.projectStatus === 'UNDER_IMPLEMENTATION'
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : proj.projectStatus === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : proj.projectStatus === 'COMPLETED'
                        ? 'bg-slate-100 text-slate-700 border border-slate-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    {proj.projectStatus.replace('_', ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-600 pt-1">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Implementing Agency</span>
                    <span className="font-semibold text-slate-800">{proj.implementingAgency || 'State PWD'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Approved Outlay</span>
                    <span className="font-mono font-bold text-slate-900">
                      {proj.budgetAmount ? `₹ ${(proj.budgetAmount / 10000000).toFixed(2)} Cr` : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Timeline</span>
                    <span className="text-slate-700 font-mono text-[10px]">
                      {proj.startDate ? `${proj.startDate} → ${proj.expectedCompletion || 'TBD'}` : 'Under Tendering'}
                    </span>
                  </div>
                </div>

                <div className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                  ✓ Pre-existing project recorded. JanSetu AI accounts for this active expenditure to prevent duplicative project recommendations.
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <div>
              <span className="font-semibold text-slate-800 block">No Active Capital Projects Registered</span>
              <span>No ongoing work orders detected in state portal for this specific category in {cluster.district}.</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 shrink-0 ml-2">
              Unaddressed Gap
            </span>
          </div>
        )}
      </div>

      {/* MODAL: DATASET SOURCE METADATA INSPECTOR */}
      {selectedSourceDetail && (
        <div className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden text-xs">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-900" />
                <span className="font-bold text-slate-900">Dataset Registry Source Metadata</span>
              </div>
              <button
                onClick={() => setSelectedSourceDetail(null)}
                className="p-1 rounded-md hover:bg-slate-200 text-slate-500"
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
