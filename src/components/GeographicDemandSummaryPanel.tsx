import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Flame,
  Layers,
  MapPin,
  TrendingUp,
} from 'lucide-react';
import { computeGeographicSummary } from '../services/geoService.ts';
import type { CitizenRequest } from '../types/citizenRequest.ts';

interface GeographicDemandSummaryPanelProps {
  requests: CitizenRequest[];
  selectedState?: string;
  selectedDistrict?: string;
  onFilterCategory?: (cat: string) => void;
  onViewInRequestsTab?: () => void;
}

export const GeographicDemandSummaryPanel: React.FC<GeographicDemandSummaryPanelProps> = ({
  requests,
  selectedState = 'All',
  selectedDistrict = 'All',
  onFilterCategory,
  onViewInRequestsTab,
}) => {
  const summary = computeGeographicSummary(requests, selectedState, selectedDistrict);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
      {/* Header & Location Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-900" />
            <h3 className="text-lg font-bold text-slate-900">
              {summary.locationTitle}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Geographic demand concentration & infrastructure priority profile
          </p>
        </div>

        {onViewInRequestsTab && (
          <button
            type="button"
            onClick={onViewInRequestsTab}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto"
          >
            <span>View Filtered Requests</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 block">Total Requests</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">
            {summary.totalRequests}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Recorded demands</span>
        </div>

        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
          <span className="text-[11px] font-semibold text-emerald-800 block">Mapped Coordinates</span>
          <span className="text-2xl font-black text-emerald-900 mt-1 block">
            {summary.mappedRequests}
          </span>
          <span className="text-[10px] text-emerald-600 mt-0.5 block">Geographically anchored</span>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
          <span className="text-[11px] font-semibold text-amber-800 block">Unresolved Locations</span>
          <span className="text-2xl font-black text-amber-900 mt-1 block">
            {summary.unresolvedRequests}
          </span>
          <span className="text-[10px] text-amber-600 mt-0.5 block">Retained in records</span>
        </div>

        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200">
          <span className="text-[11px] font-semibold text-blue-800 block">30-Day Activity</span>
          <span className="text-2xl font-black text-blue-900 mt-1 block">
            {summary.recentTrend[1]?.count || 0}
          </span>
          <span className="text-[10px] text-blue-600 mt-0.5 block">Recent intake pace</span>
        </div>
      </div>

      {/* Top Categories Breakdown & Urgency Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
        {/* Top Demand Categories */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-blue-900" />
              <span>Top Infrastructure Demand Sectors</span>
            </h4>
          </div>

          <div className="space-y-2.5">
            {summary.topCategories.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">No category data for current filter.</p>
            ) : (
              summary.topCategories.slice(0, 5).map((cat) => (
                <div key={cat.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => onFilterCategory && onFilterCategory(cat.category)}
                      className="text-slate-800 hover:text-blue-900 font-semibold hover:underline cursor-pointer"
                    >
                      {cat.category}
                    </button>
                    <span className="text-slate-600 font-mono">
                      {cat.count} ({cat.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-900 transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(8, cat.percentage))}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Urgency Distribution & Top Specific Subcategories */}
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
              <Flame className="w-4 h-4 text-rose-600" />
              <span>Urgency Distribution</span>
            </h4>
            <div className="grid grid-cols-4 gap-2 text-center">
              {summary.urgencyDistribution.map((u) => (
                <div
                  key={u.urgency}
                  className={`p-2 rounded-lg border ${
                    u.urgency === 'Critical'
                      ? 'bg-rose-50 border-rose-200 text-rose-900'
                      : u.urgency === 'High'
                      ? 'bg-orange-50 border-orange-200 text-orange-900'
                      : u.urgency === 'Medium'
                      ? 'bg-blue-50 border-blue-200 text-blue-900'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase">{u.urgency}</div>
                  <div className="text-base font-black mt-0.5">{u.count}</div>
                  <div className="text-[10px] opacity-80">{u.percentage}%</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <TrendingUp className="w-4 h-4 text-slate-700" />
              <span>Recurring Local Needs</span>
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {summary.topSubcategories.map((sub, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-medium"
                >
                  {sub.subcategory} ({sub.count})
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
