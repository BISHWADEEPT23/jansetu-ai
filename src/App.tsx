/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Header } from './components/Header.tsx';
import { Footer } from './components/Footer.tsx';
import { LandingPage } from './pages/LandingPage.tsx';
import { CitizenPortal } from './pages/CitizenPortal.tsx';
import { PolicymakerDashboard } from './pages/PolicymakerDashboard.tsx';

export default function App() {
  const [currentView, setCurrentView] = useState<'LANDING' | 'CITIZEN' | 'POLICYMAKER'>('LANDING');

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {/* DPI Official Header */}
      <Header
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Main Content View Switcher */}
      <main className="flex-1">
        {currentView === 'LANDING' && (
          <LandingPage
            onNavigateToCitizen={() => {
              setCurrentView('CITIZEN');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigateToPolicymaker={() => {
              setCurrentView('POLICYMAKER');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {currentView === 'CITIZEN' && (
          <CitizenPortal
            onReturnHome={() => {
              setCurrentView('LANDING');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onViewDashboard={() => {
              setCurrentView('POLICYMAKER');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {currentView === 'POLICYMAKER' && (
          <PolicymakerDashboard
            onNavigateToCitizen={() => {
              setCurrentView('CITIZEN');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
      </main>

      {/* Responsible DPI Footer */}
      <Footer />
    </div>
  );
}
