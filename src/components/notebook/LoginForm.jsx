import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function LoginForm({ onSwitchToRegister, onSubmit }) {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleFillDemoUser = () => {
    setEmail('gabothdev@gmail.com');
    setPassword('songbook');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    if (onSubmit) {
      onSubmit({ 
        email, 
        password, 
        rememberMe,
        name: email.toLowerCase().includes('gabothdev') ? 'Gabriel (GabothDev)' : email.split('@')[0]
      });
    }
  };

  return (
    <div className="h-full flex flex-col justify-between p-8 sm:p-10 select-none">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight">
          {t.loginTitle}
        </h2>
        <p className="text-xs sm:text-sm font-sans text-stone-600 mt-1">
          {t.loginSubtitle}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="my-auto py-4 space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 font-sans">
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
              className="w-full bg-white border border-stone-300 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 pl-9 pr-3 py-2 rounded-xl text-sm text-stone-900 font-sans transition-all outline-none"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 font-sans">
              {t.passwordLabel}
            </label>
            <button
              type="button"
              className="text-xs font-sans text-amber-800 hover:text-amber-950 font-medium cursor-pointer"
            >
              {t.forgotPassword}
            </button>
          </div>
          <div className="relative flex items-center">
            <Lock className="w-4 h-4 text-stone-400 absolute left-3 pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.passwordPlaceholder}
              className="w-full bg-white border border-stone-300 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 pl-9 pr-10 py-2 rounded-xl text-sm text-stone-900 font-sans transition-all outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 text-stone-400 hover:text-stone-600 cursor-pointer p-0.5"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Quick Credentials / Remember Me */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 text-amber-700 rounded border-stone-300 focus:ring-amber-500 accent-amber-700 cursor-pointer"
            />
            <span className="text-xs font-sans text-stone-600">{t.rememberMe}</span>
          </label>

          <button
            type="button"
            onClick={handleFillDemoUser}
            className="text-[11px] font-sans font-semibold text-amber-800 hover:underline cursor-pointer"
          >
            Llenar datos demo
          </button>
        </div>

        {/* Action Button */}
        <motion.button
          type="submit"
          disabled={isLoading}
          whileTap={{ scale: 0.98 }}
          className="w-full py-3 px-4 bg-stone-900 hover:bg-black text-amber-100 rounded-xl font-sans font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 animate-spin text-amber-300" />
              <span>Abriendo cuaderno...</span>
            </span>
          ) : (
            <>
              <span>{t.loginButton}</span>
              <ArrowRight className="w-4 h-4 text-amber-400" />
            </>
          )}
        </motion.button>
      </form>

      {/* Switch to register */}
      <div className="pt-4 border-t border-stone-200/60 text-center">
        <p className="text-xs font-sans text-stone-600">
          {t.noAccount}{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-amber-800 font-bold underline hover:text-amber-950 cursor-pointer"
          >
            {t.createOneHere}
          </button>
        </p>
      </div>
    </div>
  );
}
