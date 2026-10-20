import React, { useState, useEffect, Suspense, lazy } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { InstrumentProvider } from './context/InstrumentContext';
import NotebookSpread from './components/notebook/NotebookSpread';
import UpgradeModal from './components/monetization/UpgradeModal';

const DevDatabaseStudio = lazy(() => import('./components/dev/DevDatabaseStudio'));

function MinimalSpinner() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center desk-surface">
      <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-400 rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  const isChordifyTestRoute =
    currentPath.startsWith('/test-chordify') ||
    currentPath.startsWith('/dev/chordify') ||
    window.location.hash === '#test-chordify';

  const isDevRoute =
    isChordifyTestRoute ||
    currentPath.startsWith('/dev') ||
    window.location.hash === '#dev';

  return (
    <LanguageProvider>
      <AuthProvider>
        <InstrumentProvider>
          {isDevRoute ? (
            <Suspense fallback={<MinimalSpinner />}>
              <DevDatabaseStudio
                initialTab={isChordifyTestRoute ? 'chordifytest' : 'songs'}
                onNavigateHome={() => navigate('/')}
              />
            </Suspense>
          ) : (
            <>
              <NotebookSpread onNavigateDev={() => navigate('/dev')} />
              <UpgradeModal />
            </>
          )}
        </InstrumentProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
