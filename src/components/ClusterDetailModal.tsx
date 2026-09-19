import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  GitMerge,
  Split,
  Clock,
  MapPin,
  Globe,
  Languages,
  FileText,
  User,
  ShieldCheck,
  TrendingUp,
  History,
  Sparkles,
  Info,
  ChevronRight,
  Send,
  RefreshCw,
  Layers,
} from 'lucide-react';
import type {
  DemandCluster,
  CitizenRequest,
  ClusterAuditEvent,
} from '../types/citizenRequest.ts';
import { clusterService } from '../services/clusterService.ts';
import { EvidencePanel } from './EvidencePanel.tsx';

interface ClusterDetailModalProps {
  clusterId: string | null;
  onClose: () => void;
  onClusterUpdated?: () => void;
  availableClusters?: DemandCluster[];
}

export const ClusterDetailModal: React.FC<ClusterDetailModalProps> = ({
  clusterId,
  onClose,
  onClusterUpdated,
  availableClusters = [],
}) => {
  const [loading, setLoading] = useState(true);
  const [cluster, setCluster] = useState<DemandCluster | null>(null);
  const [memberRequests, setMemberRequests] = useState<CitizenRequest[]>([]);
  const [auditTrail, setAuditTrail] = useState<ClusterAuditEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'MEMBERS' | 'EVIDENCE' | 'DETAILS' | 'AUDIT'>('MEMBERS');

  // Human-in-the-loop action states
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [reviewerNotes, setReviewerNotes] = useState('Verified by district planning officer as unified demand.');
  const [separatingRequestId, setSeparatingRequestId] = useState<string | null>(null);
  const [separationReason, setSeparationReason] = useState('Citizen demand refers to distinct infrastructure requirement.');
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [selectedMergeTargetId, setSelectedMergeTargetId] = useState('');
  const [mergeReason, setMergeReason] = useState('Semantically identical infrastructure gap across nearby localities.');

  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchClusterData = async () => {
    if (!clusterId) return;
    setLoading(true);
    setStatusMessage(null);
    try {
      const [clusterRes, auditRes] = await Promise.all([
        clusterService.getClusterById(clusterId),
        clusterService.getClusterAuditTrail(clusterId),
      ]);
      setCluster(clusterRes.cluster);
      setMemberRequests(clusterRes.memberRequests);
      setAuditTrail(auditRes);
    } catch (err: any) {
      console.error('Failed to load cluster details:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to load cluster data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClusterData();
  }, [clusterId]);

  if (!clusterId) return null;

  const handleConfirmCluster = async () => {
    setActionLoading(true);
    setStatusMessage(null);
    try {
      const updated = await clusterService.confirmCluster(clusterId, reviewerNotes);
      setCluster(updated);
      setShowConfirmDialog(false);
      setStatusMessage({ type: 'success', text: 'Demand cluster confirmed by policymaker review.' });
      const newAudit = await clusterService.getClusterAuditTrail(clusterId);
      setAuditTrail(newAudit);
      onClusterUpdated?.();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to confirm cluster.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSeparateRequest = async (requestId: string) => {
    setActionLoading(true);
    setStatusMessage(null);
    try {
      const result = await clusterService.separateRequest(clusterId, requestId, separationReason);
      setCluster(result.originalCluster);
      setMemberRequests((prev) => prev.filter((r) => r.requestId !== requestId && r.publicRequestId !== requestId));
      setSeparatingRequestId(null);
      setStatusMessage({
        type: 'success',
        text: `Request ${requestId} successfully separated into dedicated demand cluster ${result.newCluster.clusterId}.`,
      });
      const newAudit = await clusterService.getClusterAuditTrail(clusterId);
      setAuditTrail(newAudit);
      onClusterUpdated?.();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to separate request.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleMergeClusters = async () => {
    if (!selectedMergeTargetId || selectedMergeTargetId === clusterId) return;
    setActionLoading(true);
    setStatusMessage(null);
    try {
      const merged = await clusterService.mergeClusters(clusterId, selectedMergeTargetId, mergeReason);
      setCluster(merged);
      setShowMergeDialog(false);
      setStatusMessage({ type: 'success', text: 'Clusters merged successfully.' });
      await fetchClusterData();
      onClusterUpdated?.();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to merge clusters.' });
    } finally {
      setActionLoading(false);
    }
  };

  const mergeCandidates = availableClusters.filter(
    (c) => c.clusterId !== clusterId && c.category === cluster?.category
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-900 font-mono text-xs font-bold">
                {cluster?.clusterId || clusterId}
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-900 text-xs font-semibold">
                {cluster?.category}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${
                  (cluster?.status || cluster?.clusterStatus) === 'CONFIRMED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : (cluster?.status || cluster?.clusterStatus) === 'NEEDS_REVIEW'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-200 text-slate-800'
                }`}
              >
                {cluster?.status || cluster?.clusterStatus}
              </span>
              {cluster?.trendSignal === 'RISING' && (
                <span className="px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-800 text-xs font-bold flex items-center gap-1">
                  🔥 Rising Demand {cluster.growthPercentage ? `(+${cluster.growthPercentage}%)` : ''}
                </span>
              )}
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
              {cluster?.canonicalDemand || 'Semantic Demand Cluster'}
            </h3>
            <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
              <span>📍 {cluster?.locality || 'District Hub'}, {cluster?.district}, {cluster?.state}</span>
              <span>•</span>
              <span>{cluster?.requestCount || memberRequests.length} Citizen Reports Represented</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div
            className={`px-6 py-2.5 text-xs font-semibold flex items-center justify-between border-b ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            <span>{statusMessage.text}</span>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-slate-600 text-xs underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Modal Navigation Tabs */}
        <div className="px-6 border-b border-slate-200 bg-white flex items-center gap-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('MEMBERS')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'MEMBERS'
                ? 'border-purple-800 text-purple-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Citizen Member Demands ({memberRequests.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('EVIDENCE')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'EVIDENCE'
                ? 'border-purple-800 text-purple-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Evidence & Gap Assessment</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('DETAILS')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'DETAILS'
                ? 'border-purple-800 text-purple-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Semantic Analytics & Synthesis</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('AUDIT')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'AUDIT'
                ? 'border-purple-800 text-purple-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Audit Trail ({auditTrail.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
              <RefreshCw className="w-8 h-8 animate-spin text-purple-600" />
              <p className="text-xs font-semibold">Resolving cluster telemetry & citizen records...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: MEMBER CITIZEN REQUESTS */}
              {activeTab === 'MEMBERS' && (
                <div className="space-y-4">
                  <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3.5 text-xs text-purple-950 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <span className="font-bold">Multilingual Synthesis:</span> These citizen requests were written in different languages and phrasing, but describe the exact same underlying public need. The original records are preserved intact and never merged.
                    </div>
                  </div>

                  <div className="space-y-3">
                    {memberRequests.map((req) => (
                      <div
                        key={req.requestId}
                        className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-purple-300 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-slate-900">
                              {req.publicRequestId || req.requestId}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                              {req.originalLanguage || 'English'}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                req.urgency === 'Critical'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {req.urgency}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              📍 {req.locality || 'Locality'}, {req.district}
                            </span>
                          </div>

                          {/* Separate Request Action */}
                          {memberRequests.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setSeparatingRequestId(req.requestId)}
                              className="text-[11px] font-semibold text-rose-700 hover:text-rose-900 hover:bg-rose-50 px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer"
                              title="Separate this request into a new individual cluster"
                            >
                              <Split className="w-3 h-3" />
                              <span>Separate</span>
                            </button>
                          )}
                        </div>

                        {/* Phrasing in original language */}
                        <div className="text-xs text-slate-800 font-medium mb-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Original:</span>
                          "{req.originalRequest}"
                        </div>

                        {/* English translation if different */}
                        {req.translatedRequest && req.translatedRequest !== req.originalRequest && (
                          <div className="text-xs text-slate-600 italic mb-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Translation:</span>
                            "{req.translatedRequest}"
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                          <span>Subcategory: {req.subcategory}</span>
                          <span>Reported: {new Date(req.timestamp).toLocaleDateString()}</span>
                        </div>

                        {/* Inline Separate Form Dialog */}
                        {separatingRequestId === req.requestId && (
                          <div className="mt-3 p-3 bg-rose-50/70 border border-rose-200 rounded-lg space-y-2 animate-fadeIn">
                            <div className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                              <Split className="w-3.5 h-3.5" />
                              <span>Separate Request into New Cluster</span>
                            </div>
                            <p className="text-[11px] text-rose-700">
                              Remove this citizen submission from "{cluster?.canonicalDemand}" and create a new standalone demand cluster.
                            </p>
                            <input
                              type="text"
                              value={separationReason}
                              onChange={(e) => setSeparationReason(e.target.value)}
                              placeholder="Reason for separation (recorded in audit trail)..."
                              className="w-full text-xs px-3 py-1.5 bg-white border border-rose-300 rounded focus:outline-hidden"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setSeparatingRequestId(null)}
                                className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-800 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => handleSeparateRequest(req.requestId)}
                                className="px-3 py-1 text-xs font-bold bg-rose-700 hover:bg-rose-800 text-white rounded transition-colors cursor-pointer"
                              >
                                {actionLoading ? 'Separating...' : 'Confirm Separation'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 2: VERIFIED EVIDENCE & INFRASTRUCTURE GAP ASSESSMENT */}
              {activeTab === 'EVIDENCE' && cluster && (
                <EvidencePanel cluster={cluster} onRefresh={fetchClusterData} />
              )}

              {/* TAB 3: SEMANTIC DETAILS & AI SYNTHESIS */}
              {activeTab === 'DETAILS' && (
                <div className="space-y-6">
                  {/* Canonical Problem & Demand */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Canonical Problem Statement
                      </span>
                      <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                        {cluster?.canonicalProblem}
                      </p>
                    </div>

                    <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-xl">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block mb-1">
                        Canonical Requested Demand
                      </span>
                      <p className="text-xs font-bold text-purple-950 leading-relaxed">
                        {cluster?.canonicalDemand}
                      </p>
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-white border border-slate-200 rounded-xl">
                      <span className="text-slate-400 font-medium block text-[10px]">Infrastructure Entity</span>
                      <span className="font-bold text-slate-800 mt-0.5 block">{cluster?.infrastructureEntity || 'Public Facility'}</span>
                    </div>

                    <div className="p-3 bg-white border border-slate-200 rounded-xl">
                      <span className="text-slate-400 font-medium block text-[10px]">AI Clustering Confidence</span>
                      <span className="font-bold text-purple-900 mt-0.5 block">
                        {cluster?.clusteringConfidence
                          ? `${Math.round(cluster.clusteringConfidence * 100)}%`
                          : cluster?.averageSimilarityScore
                          ? `${Math.round(cluster.averageSimilarityScore * 100)}%`
                          : '92%'}
                      </span>
                    </div>

                    <div className="p-3 bg-white border border-slate-200 rounded-xl">
                      <span className="text-slate-400 font-medium block text-[10px]">30-Day Growth</span>
                      <span className="font-bold text-rose-700 mt-0.5 block">
                        {cluster?.growthPercentage ? `+${cluster.growthPercentage}%` : 'Stable'}
                      </span>
                    </div>

                    <div className="p-3 bg-white border border-slate-200 rounded-xl">
                      <span className="text-slate-400 font-medium block text-[10px]">Urgency Distribution</span>
                      <span className="font-bold text-slate-800 mt-0.5 block">
                        {cluster?.urgencyDistribution
                          ? `${cluster.urgencyDistribution.CRITICAL || 0} Critical`
                          : cluster?.urgencyBreakdown
                          ? `${cluster.urgencyBreakdown.Critical || 0} Critical`
                          : 'Standard'}
                      </span>
                    </div>
                  </div>

                  {/* Languages Represented */}
                  <div className="p-4 bg-white border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-900">
                      <Languages className="w-4 h-4 text-blue-600" />
                      <span>Multilingual Cross-Section</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {cluster?.languagesRepresented?.map((lang) => (
                        <span key={lang} className="text-xs px-2.5 py-1 rounded-lg bg-blue-50 text-blue-900 border border-blue-200 font-semibold">
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Clustering Rationale */}
                  {(cluster?.clusteringRationale || cluster?.clusteringMethod) && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                      <span className="font-bold text-slate-700 block">Clustering Rationale</span>
                      <p className="text-slate-600 leading-relaxed">
                        {cluster.clusteringRationale || `Clustered using semantic analysis (${cluster.clusteringMethod}).`}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: AUDIT TRAIL */}
              {activeTab === 'AUDIT' && (
                <div className="space-y-4">
                  <div className="text-xs text-slate-500 mb-2">
                    Every clustering change, confirmation, separation, and merge is recorded with an immutable audit timestamp and reviewer ID.
                  </div>

                  <div className="relative border-l-2 border-slate-200 ml-4 space-y-6">
                    {auditTrail.map((ev, idx) => (
                      <div key={ev.eventId || idx} className="relative pl-6">
                        <div className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-purple-600 border-2 border-white" />
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900 uppercase tracking-wide">
                            {(ev.action || ev.actionType || '').replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(ev.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 mt-1">
                          Actor: <span className="font-semibold text-slate-800">{ev.actorType || ev.performedBy}</span>
                        </div>
                        {(ev.reason || ev.notes) && (
                          <div className="text-xs text-slate-500 mt-0.5 italic">
                            "{ev.reason || ev.notes}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Cluster Status: <strong className="text-slate-800">{cluster?.status || cluster?.clusterStatus}</strong></span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Merge Button */}
            {mergeCandidates.length > 0 && (
              <button
                type="button"
                onClick={() => setShowMergeDialog(true)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <GitMerge className="w-3.5 h-3.5" />
                <span>Merge Clusters</span>
              </button>
            )}

            {/* Confirm Cluster Button */}
            {(cluster?.status || cluster?.clusterStatus) !== 'CONFIRMED' && (
              <button
                type="button"
                onClick={() => setShowConfirmDialog(true)}
                className="px-4 py-1.5 text-xs font-bold rounded-xl bg-purple-900 hover:bg-purple-800 text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm Cluster</span>
              </button>
            )}
          </div>
        </div>

        {/* Confirm Cluster Dialog */}
        {showConfirmDialog && (
          <div className="absolute inset-0 z-20 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-5 max-w-md w-full border border-slate-200 shadow-xl space-y-3 animate-fadeIn">
              <div className="flex items-center gap-2 text-purple-900 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Confirm Demand Cluster</span>
              </div>
              <p className="text-xs text-slate-600">
                Confirming registers this cluster as an actionable, verified infrastructure demand in the official policymaker queue.
              </p>
              <textarea
                value={reviewerNotes}
                onChange={(e) => setReviewerNotes(e.target.value)}
                rows={2}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-hidden"
                placeholder="Reviewer notes..."
              />
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowConfirmDialog(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleConfirmCluster}
                  className="px-4 py-1.5 text-xs font-bold bg-purple-900 hover:bg-purple-800 text-white rounded-lg cursor-pointer"
                >
                  {actionLoading ? 'Confirming...' : 'Save Confirmation'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Merge Clusters Dialog */}
        {showMergeDialog && (
          <div className="absolute inset-0 z-20 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-5 max-w-md w-full border border-slate-200 shadow-xl space-y-3 animate-fadeIn">
              <div className="flex items-center gap-2 text-purple-900 font-bold text-sm">
                <GitMerge className="w-5 h-5 text-purple-600" />
                <span>Merge with Another Cluster</span>
              </div>
              <p className="text-xs text-slate-600">
                Combine another cluster into this primary demand. All underlying citizen requests will be grouped together.
              </p>
              <select
                value={selectedMergeTargetId}
                onChange={(e) => setSelectedMergeTargetId(e.target.value)}
                className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="">Select secondary cluster to merge...</option>
                {mergeCandidates.map((c) => (
                  <option key={c.clusterId} value={c.clusterId}>
                    {c.clusterId} — {c.canonicalDemand} ({c.requestCount} requests)
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={mergeReason}
                onChange={(e) => setMergeReason(e.target.value)}
                placeholder="Reason for merge..."
                className="w-full text-xs p-2 border border-slate-300 rounded-lg"
              />
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowMergeDialog(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading || !selectedMergeTargetId}
                  onClick={handleMergeClusters}
                  className="px-4 py-1.5 text-xs font-bold bg-purple-900 hover:bg-purple-800 text-white rounded-lg disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? 'Merging...' : 'Execute Merge'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
