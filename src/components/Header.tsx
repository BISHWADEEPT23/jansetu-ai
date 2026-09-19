import React from 'react';
import { Building2, Landmark, Users, Home, Activity } from 'lucide-react';

interface HeaderProps {
  currentView: 'LANDING' | 'CITIZEN' | 'POLICYMAKER';
  onNavigate: (view: 'LANDING' | 'CITIZEN' | 'POLICYMAKER') => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onNavigate }) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      {/* DPI Official Top Bar */}
      <div className="bg-slate-900 text-slate-300 text-xs px-4 py-1.5 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-medium text-slate-200">
            जनसेतु AI | Digital Public Good — Citizen Demand Intelligence Platform
          </span>
          <span className="hidden md:inline-block text-slate-500">|</span>
          <span className="hidden md:inline-block text-slate-400">
            For Public Infrastructure & Development Needs
          </span>
        </div>
      </div>

      {/* Main Header Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Platform Name */}
          <div
            id="header-brand"
            onClick={() => onNavigate('LANDING')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-950 flex items-center justify-center text-white shadow-sm border border-slate-700/30 group-hover:scale-105 transition-transform">
              <Landmark className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  JanSetu AI
                </span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  DPG Verified
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                From Citizen Voice to Development Action
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              id="nav-home-btn"
              onClick={() => onNavigate('LANDING')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentView === 'LANDING'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Home className="w-4 h-4" />
              <span className="hidden md:inline">Home</span>
            </button>

            <button
              id="nav-citizen-btn"
              onClick={() => onNavigate('CITIZEN')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                currentView === 'CITIZEN'
                  ? 'bg-blue-900 text-white shadow-xs font-semibold'
                  : 'text-slate-700 hover:bg-blue-50 hover:text-blue-900 border border-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Citizen Portal</span>
            </button>

            <button
              id="nav-policymaker-btn"
              onClick={() => onNavigate('POLICYMAKER')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                currentView === 'POLICYMAKER'
                  ? 'bg-slate-900 text-white shadow-xs font-semibold'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Policymaker Dashboard</span>
              <span className="sm:hidden">Dashboard</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
