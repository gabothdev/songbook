import React from 'react';
import { Sparkles, ExternalLink, ShieldCheck } from 'lucide-react';
import { useAuth, TIERS } from '../../context/AuthContext';

/**
 * Non-intrusive ad slot designed cleanly for musicians and free users.
 * Automatically disappears completely for PREMIUM users.
 */
export default function AdBanner({ slotId = 'default', className = "" }) {
  const { currentUser, openUpgradeModal } = useAuth();

  // If user is PREMIUM, render nothing
  if (currentUser?.tier === TIERS.PREMIUM) {
    return null;
  }

  return (
    <div className={`relative my-3 p-3 bg-amber-50/90 hover:bg-amber-50 border border-amber-900/20 rounded-xl shadow-sm transition-all text-stone-800 ${className}`}>
      {/* Sponsor Tag & Remove Ads Link */}
      <div className="flex items-center justify-between text-[10px] font-mono text-stone-500 mb-1.5 pb-1 border-b border-amber-900/10">
        <span className="uppercase tracking-wider font-semibold">Anuncio Patrocinado</span>
        <button
          onClick={openUpgradeModal}
          className="text-amber-800 hover:text-amber-950 font-bold underline flex items-center gap-1 cursor-pointer"
        >
          <Sparkles className="w-2.5 h-2.5 text-amber-600" />
          <span>Quitar anuncios con SongBook Pro</span>
        </button>
      </div>

      {/* Ad Content (Clean musical sponsor banner) */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-stone-900 text-amber-300 flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-inner">
            🎸 VIP
          </div>
          <div className="min-w-0">
            <h5 className="font-serif font-bold text-xs text-stone-900 truncate">
              Masterclass de Acordes y Armonía Moderna
            </h5>
            <p className="text-[11px] font-sans text-stone-600 truncate">
              Aprende sustituciones de acordes y técnicas de rasgueo con músicos profesionales.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="px-2.5 py-1 bg-stone-900 hover:bg-black text-amber-200 text-[11px] font-sans font-bold rounded-lg shadow-sm flex items-center gap-1 flex-shrink-0 cursor-pointer"
        >
          <span>Ver Más</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
