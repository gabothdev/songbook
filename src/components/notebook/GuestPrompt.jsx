import React from 'react';
import { motion } from 'framer-motion';
import { Play, Music, Sparkles } from 'lucide-react';
import { WashiTape } from './MusicalDoodles';
import { useLanguage } from '../../context/LanguageContext';

const SAMPLE_SONGS = [
  { title: 'Muchacha (Ojos de papel)', artist: 'Almendra', key: 'G' },
  { title: 'De Música Ligera', artist: 'Soda Stereo', key: 'Bm' },
  { title: 'Seminare', artist: 'Serú Girán', key: 'C' },
];

export default function GuestPrompt({ onEnterGuest, onSwitchToLogin }) {
  const { t } = useLanguage();

  return (
    <div className="relative h-full flex flex-col justify-between p-7 sm:p-9 select-none">
      <div>
        <div className="flex items-center justify-between mb-4">
          <WashiTape color="bg-emerald-200/80" className="transform rotate-1" />
          <span className="font-mono text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
            {t.tabGuest}
          </span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-serif font-black text-stone-900 tracking-tight">
          {t.guestTitle}
        </h2>
        <p className="text-xs sm:text-sm font-sans text-stone-600 mt-1">
          {t.guestSubtitle}
        </p>
      </div>

      {/* Sample Songs List */}
      <div className="my-4 space-y-2.5">
        <span className="text-xs font-bold uppercase tracking-wider text-stone-700 font-sans flex items-center gap-1.5">
          <Music className="w-3.5 h-3.5 text-emerald-700" />
          {t.sampleSongsTitle}:
        </span>

        <div className="space-y-2">
          {SAMPLE_SONGS.map((song, i) => (
            <motion.div
              key={i}
              whileHover={{ x: 3 }}
              className="p-2.5 bg-white/80 hover:bg-white rounded-xl border border-stone-200 shadow-sm flex items-center justify-between transition-colors"
            >
              <div>
                <h4 className="font-serif font-bold text-stone-900 text-sm">{song.title}</h4>
                <p className="text-xs font-sans text-stone-500">{song.artist}</p>
              </div>
              <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-300">
                {t.key}: {song.key}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Guest Launch Button */}
      <div>
        <motion.button
          type="button"
          onClick={onEnterGuest}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white rounded-xl font-sans font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer border border-emerald-600/30"
        >
          <span>{t.guestButton}</span>
          <Play className="w-4 h-4 fill-emerald-200 text-emerald-200" />
        </motion.button>

        <div className="text-center pt-3">
          <p className="text-xs font-sans text-stone-600">
            {t.wantToSave}{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-emerald-900 font-semibold underline hover:text-emerald-950 cursor-pointer"
            >
              {t.tabRegister}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
