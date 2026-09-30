import { useState } from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import { AppShell } from '@/components/AppShell';
import { LandingPage } from '@/pages/LandingPage';
import { SetupPage } from '@/pages/SetupPage';
import { MissionPage } from '@/pages/MissionPage';
import { SessionPage } from '@/pages/SessionPage';
import { ResultPage } from '@/pages/ResultPage';
import { DashboardPage } from '@/pages/DashboardPage';
import type { ConfidenceLevel, SessionResult, View } from '@/types';

function AppContent() {
  const { state, saveSession, fetchAdaptiveRecommendation } = useApp();
  const [view, setView] = useState<View>('landing');
  const [lastResult, setLastResult] = useState<SessionResult | null>(null);

  function navigate(v: View) {
    setView(v);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleSessionComplete(confidence: ConfidenceLevel) {
    const result = saveSession(confidence);
    if (result) {
      setLastResult(result);
      // Fetch new adaptive recommendation from Neural Pulse based on the new session evidence
      void fetchAdaptiveRecommendation();
      navigate('result');
    }
  }

  function handleSaveResult(confidence: ConfidenceLevel) {
    // Result is already saved via saveSession in handleSessionComplete,
    // but we pass confidence for the self-assessment record.
    // The state has already been updated — this just confirms.
    void confidence;
  }

  // Show session and result without the standard app shell nav
  if (view === 'session') {
    return <SessionPage onComplete={handleSessionComplete} />;
  }

  if (view === 'result' && lastResult) {
    return (
      <AppShell currentView={view} onNavigate={navigate} showNav={false}>
        <ResultPage
          result={lastResult}
          onSave={handleSaveResult}
          onGoToDashboard={() => navigate('dashboard')}
        />
      </AppShell>
    );
  }

  return (
    <AppShell currentView={view} onNavigate={navigate}>
      {view === 'landing' && <LandingPage onGetStarted={() => navigate('setup')} />}
      {view === 'setup' && <SetupPage onComplete={() => navigate('mission')} />}
      {view === 'mission' && (
        <MissionPage
          onBegin={() => navigate('session')}
          onGoToDashboard={() => navigate('dashboard')}
        />
      )}
      {view === 'dashboard' && <DashboardPage onGoToMission={() => navigate('mission')} />}
    </AppShell>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
