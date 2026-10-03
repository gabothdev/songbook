import React, { useState, useEffect } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { InstrumentProvider } from './context/InstrumentContext';
import NotebookSpread from './components/notebook/NotebookSpread';
import UpgradeModal from './components/monetization/UpgradeModal';
import DevDatabaseStudio from './components/dev/DevDatabaseStudio';

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

  const isDevRoute = currentPath.startsWith('/dev') || window.location.hash === '#dev';

  return (
    <LanguageProvider>
      <AuthProvider>
        <InstrumentProvider>
          {isDevRoute ? (
            <DevDatabaseStudio onNavigateHome={() => navigate('/')} />
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
