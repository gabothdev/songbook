import React from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { InstrumentProvider } from './context/InstrumentContext';
import NotebookSpread from './components/notebook/NotebookSpread';
import UpgradeModal from './components/monetization/UpgradeModal';

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <InstrumentProvider>
          <NotebookSpread />
          <UpgradeModal />
        </InstrumentProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
