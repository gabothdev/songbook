import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  CheckCircle2,
  Crown,
  Guitar,
  Ban,
  Cloud,
  FileDown,
  Layers,
  Flame,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const PRO_FEATURES = [
  { title: 'Canciones y Setlists Ilimitados', desc: 'Guarda todos tus repertorios sin límite de cantidad.' },
  { title: 'Diagramas de Bandoneón & Todos los Instrumentos', desc: 'Acceso completo a acordes de bandoneón, piano y guitarra.' },
  { title: '100% Sin Publicidad ni Distracciones', desc: 'Una experiencia ultra-rápida, limpia y enfocada al tocar.' },
  { title: 'Sincronización en la Nube Multi-Dispositivo', desc: 'Tus canciones disponibles en computadora, tablet y teléfono.' },
  { title: 'Exportación a PDF y Modo Escenario', desc: 'Descarga tus hojas listas para imprimir en formato A4.' },
  { title: 'Edición Rítmica Avanzada en BeatGrid', desc: 'Ajuste fino de compases y timestamps con YouTube.' },
];

export default function UpgradeModal() {
  const { isUpgradeModalOpen, closeUpgradeModal, upgradeToPro } = useAuth();
  const { t } = useLanguage();
  const [billingCycle, setBillingCycle] = useState('yearly'); // 'monthly' | 'yearly'

  // AnimatePresence must wrap the conditional so the exit animation plays when closing
  return (
    <AnimatePresence>
      {isUpgradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeUpgradeModal}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Window */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative w-full max-w-xl bg-[#fcf9f2] text-stone-900 rounded-3xl shadow-2xl border-4 border-[#35251d] overflow-hidden paper-texture z-10 p-6 sm:p-8"
          >
            {/* Close button */}
            <button
              onClick={closeUpgradeModal}
              className="absolute right-4 top-4 p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-xs font-bold font-mono uppercase tracking-wider shadow-sm">
                <Crown className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                <span>SongBook Pro</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-serif font-black text-stone-900 tracking-tight">
                Lleva tu Cuaderno al Nivel Profesional
              </h3>
              <p className="text-xs sm:text-sm font-sans text-stone-600 max-w-md mx-auto">
                Desbloquea todas las herramientas avanzadas para ensayar, tocar en vivo y sincronizar tus canciones.
              </p>
            </div>

            {/* Billing Toggle (Monthly / Yearly) */}
            <div className="flex items-center justify-center gap-2 my-5">
              <div className="bg-stone-200/80 p-1 rounded-xl flex items-center shadow-inner">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-sans transition-all cursor-pointer ${
                    billingCycle === 'monthly'
                      ? 'bg-white text-stone-900 shadow-sm'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Mensual ($4.99/mes)
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-sans transition-all cursor-pointer flex items-center gap-1.5 ${
                    billingCycle === 'yearly'
                      ? 'bg-amber-700 text-white shadow-sm'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <span>Anual ($29.99/año)</span>
                  <span className="bg-amber-300 text-amber-950 text-[10px] font-black px-1.5 py-0.5 rounded uppercase">
                    Ahorra 50%
                  </span>
                </button>
              </div>
            </div>

            {/* Features List */}
            <div className="bg-white/70 rounded-2xl p-4 border border-stone-200 shadow-sm space-y-2.5 my-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PRO_FEATURES.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-serif font-bold text-xs text-stone-900">{feat.title}</h5>
                      <p className="text-[11px] font-sans text-stone-500">{feat.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Button */}
            <div className="space-y-2.5 pt-2">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={upgradeToPro}
                className="w-full py-3 px-6 bg-gradient-to-r from-amber-700 via-amber-800 to-stone-900 hover:from-amber-800 hover:to-black text-amber-50 rounded-xl font-sans font-bold text-sm sm:text-base shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer border border-amber-600/40"
              >
                <span>Activar SongBook Pro (7 Días Gratis)</span>
                <ArrowRight className="w-4 h-4 text-amber-300" />
              </motion.button>

              <p className="text-center text-[11px] font-sans text-stone-400">
                Cancela en cualquier momento sin compromiso. Pagos procesados de forma segura con Stripe.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
