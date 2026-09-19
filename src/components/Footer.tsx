import React from 'react';
import { ShieldCheck, Info, CheckCircle2, Lock } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-16">
      {/* Responsible AI Banner */}
      <div className="bg-slate-950 border-b border-slate-800/80 py-4 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-400 font-medium">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Digital Public Good Commitment • Privacy & Non-Discrimination Safeguard</span>
          </div>
          <div className="text-slate-400">
            JanSetu AI analyses development needs to support public infrastructure planning. AI-generated classifications can be reviewed and corrected.
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="font-bold text-base text-white">JanSetu AI</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-900/60 text-blue-200 border border-blue-700/50">
                v1.0 DPI
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              A Digital Public Good architected to bridge citizen voices in native languages with evidence-based infrastructure planning by government administrators.
            </p>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> No Political Profiling
              </span>
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> No Social Scoring
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">
              Core Architectural Pillars
            </h4>
            <ul className="text-xs text-slate-400 space-y-2">
              <li className="flex items-start gap-1.5">
                <span className="text-blue-400 font-bold">•</span>
                <span><strong>Multilingual Voice & Text:</strong> Native language expression with zero barrier.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-blue-400 font-bold">•</span>
                <span><strong>Citizen In-the-Loop:</strong> Explicit confirmation before demand ingestion.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-blue-400 font-bold">•</span>
                <span><strong>Democratized Intelligence:</strong> Fair geographic & categorical demand aggregation.</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">
              Ethical AI Boundary
            </h4>
            <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 space-y-2">
              <div className="flex items-center gap-1.5 text-amber-300 font-medium">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>Zero Political Profiling</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                The platform strictly processes only physical and social infrastructure demands (water, electricity, roads, schools, clinics). Religion, caste, political opinion, and voting intent are strictly excluded.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            © 2026 JanSetu AI — Citizen Development Demand Intelligence. Released under Digital Public Good specifications.
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-slate-400" /> Prototype Mode (Sample & Live Submissions)
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
