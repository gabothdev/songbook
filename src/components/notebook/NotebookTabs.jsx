import React from 'react';
import { motion } from 'framer-motion';
import { LogIn, UserPlus, Sparkles, BookOpen, Music2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function NotebookTabs({ activeTab, onTabChange, mode = 'auth' }) {
  const { t } = useLanguage();

  const AUTH_TABS = [
    {
      id: 'login',
      label: t.tabLogin,
      icon: LogIn,
      bgActive: 'bg-[#fef08a] text-stone-900 border-amber-400 shadow-lg',
      bgInactive: 'bg-[#fef9c3]/85 text-stone-700 hover:bg-[#fef08a] border-amber-300/80',
      accentColor: 'bg-amber-600',
    },
    {
      id: 'register',
      label: t.tabRegister,
      icon: UserPlus,
      bgActive: 'bg-[#fecdd3] text-stone-900 border-rose-400 shadow-lg',
      bgInactive: 'bg-[#ffe4e6]/85 text-stone-700 hover:bg-[#fecdd3] border-rose-300/80',
      accentColor: 'bg-rose-600',
    },
    {
      id: 'guest',
      label: t.tabGuest,
      icon: Sparkles,
      bgActive: 'bg-[#a7f3d0] text-stone-900 border-emerald-400 shadow-lg',
      bgInactive: 'bg-[#d1fae5]/85 text-stone-700 hover:bg-[#a7f3d0] border-emerald-300/80',
      accentColor: 'bg-emerald-600',
    },
  ];

  const MUSICIAN_TABS = [
    {
      id: 'songs',
      label: t.tabSongbook || 'Cancionero',
      icon: BookOpen,
      bgActive: 'bg-[#fef08a] text-stone-950 border-amber-400 shadow-lg',
      bgInactive: 'bg-[#fef9c3]/85 text-stone-800 hover:bg-[#fef08a] border-amber-300/80',
      accentColor: 'bg-amber-600',
    },
    {
      id: 'scores',
      label: t.tabScores || 'Partituras & Tabs',
      icon: Music2,
      bgActive: 'bg-[#bbf7d0] text-stone-950 border-emerald-400 shadow-lg',
      bgInactive: 'bg-[#dcfce7]/85 text-stone-800 hover:bg-[#bbf7d0] border-emerald-300/80',
      accentColor: 'bg-emerald-600',
    },
  ];

  const TABS = mode === 'musician' ? MUSICIAN_TABS : AUTH_TABS;

  return (
    <div className="absolute left-full top-12 sm:top-16 flex flex-col gap-3 z-30 -ml-1">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <motion.button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            whileHover={{ x: 3 }}
            whileTap={{ scale: 0.97 }}
            className={`
              relative flex items-center gap-2 px-3.5 py-2.5 sm:px-4 sm:py-3
              rounded-r-xl font-sans text-xs sm:text-sm font-bold tracking-wide
              border-y border-r transition-all duration-200 cursor-pointer select-none
              ${isActive ? `${tab.bgActive} translate-x-2 sm:translate-x-3 z-10` : `${tab.bgInactive} opacity-90 hover:opacity-100`}
            `}
            style={{
              boxShadow: isActive ? '3px 4px 12px rgba(0,0,0,0.25)' : '2px 2px 6px rgba(0,0,0,0.15)',
            }}
          >
            {/* Colored left strip indicating attachment */}
            <div
              className={`absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r ${tab.accentColor}`}
            />

            <Icon className={`w-4 h-4 ${isActive ? 'text-stone-950 stroke-[2.5]' : 'text-stone-700 stroke-[2]'}`} />
            <span className="whitespace-nowrap">{tab.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
