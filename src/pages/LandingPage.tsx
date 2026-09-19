import React from 'react';
import {
  Users,
  Building2,
  ArrowRight,
  ShieldCheck,
  Languages,
  Layers,
  Sparkles,
  Scale,
  CheckCircle2,
  Compass,
} from 'lucide-react';

interface LandingPageProps {
  onNavigateToCitizen: () => void;
  onNavigateToPolicymaker: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigateToCitizen,
  onNavigateToPolicymaker,
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
        {/* National DPI Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold mb-6 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
          <span>Digital Public Good for Public Infrastructure Intelligence</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
          JanSetu AI
        </h1>

        <p className="text-xl sm:text-2xl font-semibold text-blue-950 mb-4 tracking-tight">
          "From Citizen Voice to Development Action"
        </p>

        <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
          Share what your community needs. JanSetu AI helps transform citizen development requests into actionable public infrastructure intelligence.
        </p>
      </div>

      {/* Two Large Portal Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto mb-16">
        {/* Card 1: Citizen Portal */}
        <div
          id="card-citizen-portal"
          className="bg-white rounded-2xl border-2 border-slate-200 hover:border-blue-900 p-6 sm:p-8 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between group"
        >
          <div>
            <div className="w-14 h-14 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-900 mb-6 group-hover:bg-blue-900 group-hover:text-white transition-colors">
              <Users className="w-7 h-7" />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-2xl font-bold text-slate-900">
                Citizen Portal
              </h2>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-900">
                Voice & Text
              </span>
            </div>
            <p className="text-slate-600 text-base mb-6 leading-relaxed">
              Report a development need in your community.
            </p>
            <div className="space-y-2 mb-8 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Express in Hindi, Tamil, Bengali, Marathi, English, or any native tongue</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Voice microphone input ready for rural and urban accessibility</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Review AI interpretation and retain final control before submitting</span>
              </div>
            </div>
          </div>

          <button
            id="btn-share-need"
            onClick={onNavigateToCitizen}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-blue-900 text-white font-semibold hover:bg-blue-800 transition-colors shadow-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer text-base"
          >
            <span>Share a Need</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Card 2: Policymaker Dashboard */}
        <div
          id="card-policymaker-dashboard"
          className="bg-white rounded-2xl border-2 border-slate-200 hover:border-slate-900 p-6 sm:p-8 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between group"
        >
          <div>
            <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 mb-6 group-hover:bg-slate-900 group-hover:text-white transition-colors">
              <Building2 className="w-7 h-7" />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-2xl font-bold text-slate-900">
                Policymaker Dashboard
              </h2>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                Administration
              </span>
            </div>
            <p className="text-slate-600 text-base mb-6 leading-relaxed">
              Understand development demand across communities.
            </p>
            <div className="space-y-2 mb-8 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Aggregate infrastructure needs by district, category, and urgency</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Filter and review citizen demands with multi-language transcripts</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Evidence-based resource allocation without political bias</span>
              </div>
            </div>
          </div>

          <button
            id="btn-view-dashboard"
            onClick={onNavigateToPolicymaker}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors shadow-sm focus:outline-hidden focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 cursor-pointer text-base"
          >
            <span>View Dashboard</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Trust & Transparency Banner */}
      <div className="bg-slate-100 rounded-xl p-5 border border-slate-200 max-w-4xl mx-auto mb-16">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-900 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-700 leading-relaxed">
            <p className="font-semibold text-slate-900 mb-1">
              Public Service Integrity Guarantee
            </p>
            <p className="mb-1">
              JanSetu AI analyses development needs to support public infrastructure planning. AI-generated classifications can be reviewed and corrected.
            </p>
            <p className="text-slate-500">
              This is <strong>NOT</strong> a political opinion platform and <strong>NOT</strong> a social scoring system. It deals strictly with physical and public infrastructure needs (roads, water, healthcare, sanitation, schools, electricity).
            </p>
          </div>
        </div>
      </div>

      {/* How JanSetu AI Works (4 Steps) */}
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h3 className="text-lg font-bold text-slate-900">
            How Demand Intelligence Works
          </h3>
          <p className="text-xs text-slate-500">
            Transparent 4-step pipeline from local voice to public policy
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-sm mb-3">
              1
            </div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">Citizen Expresses</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Describes local infrastructure breakdown or need in their native language or speech.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-900 flex items-center justify-center font-bold text-sm mb-3">
              2
            </div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">Gemini AI Analysis</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Detects language, translates to English, identifies sector, subcategory, urgency, and confidence.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-sm mb-3">
              3
            </div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">Citizen Confirmation</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Citizen reviews the AI interpretation, makes adjustments if needed, and explicitly authorizes submission.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold text-sm mb-3">
              4
            </div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">Demand Aggregation</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Policymakers view clustered demands across districts for equitable budget and infrastructure planning.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
