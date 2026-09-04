import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Sparkles } from 'lucide-react';
import { WashiTape } from './MusicalDoodles';
import { useLanguage } from '../../context/LanguageContext';

export default function RegisterForm({ onSwitchToLogin, onSubmit }) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [instrument, setInstrument] = useState('guitar');
  const [isLoading, setIsLoading] = useState(false);

  const INSTRUMENTS = [
    { id: 'guitar', label: t.instGuitar, icon: '🎸' },
    { id: 'piano', label: t.instPiano, icon: '🎹' },
    { id: 'bandoneon', label: t.instBandoneon, icon: '🪗' },
    { id: 'ukelele', label: t.instUkulele, icon: '🪕' },
    { id: 'vocals', label: t.instVocals, icon: '🎤' },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    if (onSubmit) {
      onSubmit({ name, email, password, instrument });
    }
    setTimeout(() => setIsLoading(false), 700);
  };

  return (
    <div className="relative h-full flex flex-col justify-between p-7 sm:p-9 select-none">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <WashiTape color="bg-rose-200/80" className="transform -rotate-2" />
          <span className="font-mono text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
            {t.tabRegister}
          </span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-serif font-black text-stone-900 tracking-tight">
          {t.registerTitle}
        </h2>
        <p className="text-xs sm:text-sm font-sans text-stone-600 mt-1">
          {t.registerSubtitle}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="my-3 space-y-3.5">
        {/* Name */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 font-sans">
            {t.nameLabel}
          </label>
          <div className="relative flex items-center">
            <User className="w-4 h-4 text-stone-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.namePlaceholder}
              className="w-full bg-white/70 hover:bg-white focus:bg-white border border-stone-300 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20 pl-9 pr-3 py-2 rounded-lg text-sm text-stone-900 font-sans transition-all placeholder:text-stone-400 outline-none"
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 font-sans">
            {t.emailLabel}
          </label>
          <div className="relative flex items-center">
            <Mail className="w-4 h-4 text-stone-400 absolute left-3 pointer-events-none" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.emailPlaceholder}
              className="w-full bg-white/70 hover:bg-white focus:bg-white border border-stone-300 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20 pl-9 pr-3 py-2 rounded-lg text-sm text-stone-900 font-sans transition-all placeholder:text-stone-400 outline-none"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 font-sans">
            {t.passwordLabel}
          </label>
          <div className="relative flex items-center">
            <Lock className="w-4 h-4 text-stone-400 absolute left-3 pointer-events-none" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.passwordPlaceholder}
              className="w-full bg-white/70 hover:bg-white focus:bg-white border border-stone-300 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20 pl-9 pr-3 py-2 rounded-lg text-sm text-stone-900 font-sans transition-all placeholder:text-stone-400 outline-none"
            />
          </div>
        </div>

        {/* Instrument preference */}
        <div className="space-y-1.5 pt-1">
          <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 font-sans">
            {t.instrumentLabel}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {INSTRUMENTS.map((inst) => {
              const isSelected = instrument === inst.id;
              return (
                <button
                  type="button"
                  key={inst.id}
                  onClick={() => setInstrument(inst.id)}
                  className={`
                    px-2.5 py-1 rounded-lg text-xs font-medium font-sans transition-all cursor-pointer flex items-center gap-1.5
                    ${isSelected
                      ? 'bg-rose-900 text-white shadow-sm ring-2 ring-rose-600/30'
                      : 'bg-white/80 text-stone-700 hover:bg-white border border-stone-200'}
                  `}
                >
                  <span>{inst.icon}</span>
                  <span>{inst.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit */}
        <motion.button
          type="submit"
          disabled={isLoading}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-rose-700 to-rose-800 hover:from-rose-800 hover:to-rose-900 text-white rounded-xl font-sans font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer border border-rose-600/30"
        >
          {isLoading ? (
            <span>{t.creatingNotebook}</span>
          ) : (
            <>
              <span>{t.registerButton}</span>
              <Sparkles className="w-4 h-4 text-rose-200" />
            </>
          )}
        </motion.button>
      </form>

      {/* Switch to login */}
      <div className="text-center pt-2 border-t border-stone-200">
        <p className="text-xs font-sans text-stone-600">
          {t.alreadyHaveAccount}{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-rose-900 font-semibold underline hover:text-rose-950 cursor-pointer"
          >
            {t.loginHere}
          </button>
        </p>
      </div>
    </div>
  );
}
