import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SpiralRings from '../components/notebook/SpiralRings';
import NotebookCover from '../components/notebook/NotebookCover';
import LoginForm from '../components/notebook/LoginForm';
import RegisterForm from '../components/notebook/RegisterForm';
import GuestPrompt from '../components/notebook/GuestPrompt';
import NotebookTabs from '../components/notebook/NotebookTabs';
import { Moon, Sun, Music } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/notebook/LanguageSelector';

export default function AuthNotebookPage({ onAuthenticated }) {
  const { lang, setLang, t } = useLanguage();
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register' | 'guest'
  const [deskTheme, setDeskTheme] = useState('warm'); // 'warm' | 'dark'

  const handleLoginSubmit = (data) => {
    if (onAuthenticated) onAuthenticated(data);
  };

  const handleRegisterSubmit = (data) => {
    if (onAuthenticated) onAuthenticated(data);
  };

  const handleGuestLogin = () => {
    if (onAuthenticated) onAuthenticated({ guest: true, name: 'Guest' });
  };

  return (
    <div className={`min-h-screen w-full flex flex-col justify-between items-center p-3 sm:p-5 md:p-6 lg:p-8 transition-colors duration-500 desk-surface relative overflow-x-hidden`}>
      {/* Ambient background lighting */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[850px] h-[500px] bg-amber-500/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute -bottom-32 right-10 w-[700px] h-[500px] bg-amber-700/10 rounded-full blur-[170px] pointer-events-none" />

      {/* Top Header Bar */}
      <header className="w-full max-w-[1240px] flex items-center justify-between z-20 pb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="font-mono text-xs uppercase tracking-widest text-stone-300 font-semibold">
            {t.studioName}
          </span>
        </div>

        {/* Top Controls: Language Switcher + Desk Theme */}
        <div className="flex items-center gap-3">
          <LanguageSelector />

          {/* Theme Toggle */}
          <button
            onClick={() => setDeskTheme(deskTheme === 'warm' ? 'dark' : 'warm')}
            className="p-1.5 bg-stone-900/80 hover:bg-stone-800 text-amber-400 rounded-lg border border-stone-700/60 shadow-sm transition-colors cursor-pointer"
            title={t.deskLighting}
          >
            {deskTheme === 'warm' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Open Notebook Container (Expanded max-w-[1240px] on desktop) */}
      <main className="relative w-full max-w-[1240px] my-auto z-10 py-2 pr-0 sm:pr-8 md:pr-12">
        {/* Soft shadow underneath the notebook on the wooden desk */}
        <div className="absolute inset-2 sm:inset-4 bg-black/75 rounded-3xl blur-3xl -z-10 pointer-events-none" />

        {/* Outer Cover Trim (Hardcover Leather / Moleskine look) */}
        <div className="relative bg-[#291e17] p-2.5 sm:p-3.5 lg:p-4 rounded-2xl sm:rounded-3xl shadow-2xl border border-[#44332a] flex flex-col md:flex-row">
          
          {/* Index Tabs Attached Exactly to the Outer Right Edge of the Notebook */}
          <NotebookTabs activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Left Page (Desktop Spread) */}
          <div className="hidden md:block flex-1 bg-[#fcf9f2] rounded-l-xl shadow-[inset_-8px_0_12px_rgba(0,0,0,0.06)] border-y border-l border-stone-300/80 overflow-hidden paper-texture min-h-[600px] relative">
            {/* Center spine inner shadow */}
            <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-stone-900/10 to-transparent pointer-events-none z-10" />
            <NotebookCover />
          </div>

          {/* Compact Twin-Ring Spiral Spine (Desktop) */}
          <div className="hidden md:flex w-10 z-20 items-center justify-center -mx-2.5">
            <SpiralRings count={12} />
          </div>

          {/* Mobile Spiral Ring Bar */}
          <div className="md:hidden w-full flex justify-center py-1 -mt-1 -mb-1">
            <div className="flex gap-2">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div key={idx} className="w-2.5 h-4 rounded-full bg-slate-300 shadow-spiral border border-slate-400" />
              ))}
            </div>
          </div>

          {/* Right Page */}
          <div className="flex-1 bg-[#fcf9f2] rounded-xl md:rounded-l-none md:rounded-r-xl shadow-[inset_8px_0_12px_rgba(0,0,0,0.06)] border border-stone-300/80 overflow-hidden paper-texture min-h-[600px] relative">
            {/* Center spine inner shadow */}
            <div className="absolute top-0 left-0 bottom-0 w-8 bg-gradient-to-r from-stone-900/10 to-transparent pointer-events-none z-10" />

            <AnimatePresence mode="wait">
              {activeTab === 'login' && (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="h-full"
                >
                  <LoginForm
                    onSwitchToRegister={() => setActiveTab('register')}
                    onSubmit={handleLoginSubmit}
                  />
                </motion.div>
              )}

              {activeTab === 'register' && (
                <motion.div
                  key="register"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="h-full"
                >
                  <RegisterForm
                    onSwitchToLogin={() => setActiveTab('login')}
                    onSubmit={handleRegisterSubmit}
                  />
                </motion.div>
              )}

              {activeTab === 'guest' && (
                <motion.div
                  key="guest"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="h-full"
                >
                  <GuestPrompt
                    onEnterGuest={handleGuestLogin}
                    onSwitchToLogin={() => setActiveTab('login')}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </main>

      {/* Clean Footer */}
      <footer className="w-full max-w-[1240px] flex flex-col sm:flex-row items-center justify-between text-stone-400 text-xs font-sans pt-2 z-10 gap-2">
        <span>{t.footerRights}</span>
        <div className="flex items-center gap-1.5 text-amber-400/90 font-medium">
          <Music className="w-3.5 h-3.5" />
          <span>{t.footerTune}</span>
        </div>
      </footer>
    </div>
  );
}
