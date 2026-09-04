import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { useInstrument, INSTRUMENTS } from '../../context/InstrumentContext';
import { GuitarIcon, BandoneonIcon } from '../icons/InstrumentIcons';

/**
 * InstrumentBookmark Component for SongBook
 * Renders an analog-style bookmark tab sticking out from the left edge of the notebook,
 * featuring the active instrument icon and a chevron that opens an instrument selector dropdown.
 */
export default function InstrumentBookmark() {
  const { instrument, setInstrument } = useInstrument();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const OPTIONS = [
    {
      id: INSTRUMENTS.GUITAR,
      label: 'Guitarra',
      icon: GuitarIcon,
      accentColor: 'text-amber-800',
    },
    {
      id: INSTRUMENTS.BANDONEON,
      label: 'Bandoneón',
      icon: BandoneonIcon,
      accentColor: 'text-amber-900',
    },
  ];

  const currentOption = OPTIONS.find((opt) => opt.id === instrument) || OPTIONS[0];
  const CurrentIcon = currentOption.icon;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className="absolute right-full top-12 sm:top-16 z-40 -mr-1 select-none">
      {/* Tab Button sticking out to the left */}
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ x: -3 }}
        whileTap={{ scale: 0.96 }}
        className={`
          relative flex items-center gap-1.5 px-3 py-2.5 sm:px-3.5 sm:py-3
          rounded-l-2xl font-sans text-xs font-bold tracking-wide
          border-y border-l border-amber-300/90 transition-all duration-200 cursor-pointer
          bg-[#fef9c3] hover:bg-[#fef08a] text-stone-900 shadow-lg
        `}
        style={{
          boxShadow: '-3px 4px 12px rgba(0,0,0,0.22)',
        }}
        title={`Instrumento activo: ${currentOption.label} (clic para cambiar)`}
      >
        {/* Colored attachment strip on the right edge */}
        <div className="absolute right-0 top-1.5 bottom-1.5 w-1 rounded-l bg-amber-600" />

        {/* Current Instrument Icon */}
        <CurrentIcon className="w-5 h-5 sm:w-6 sm:h-6 text-stone-900 drop-shadow-xs" />

        {/* Small Dropdown Arrow */}
        <ChevronDown
          className={`w-3.5 h-3.5 text-stone-700 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-amber-900' : ''
          }`}
        />
      </motion.button>

      {/* Floating Dropdown Selector (opens to the right over notebook edge) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 8, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-0 left-full ml-2 w-44 bg-[#faf6ee] rounded-2xl border border-stone-300 shadow-2xl p-1.5 paper-texture z-50 overflow-hidden"
          >
            <div className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-amber-900 border-b border-stone-200/80 mb-1">
              Instrumento
            </div>

            <div className="space-y-1">
              {OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = instrument === opt.id;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setInstrument(opt.id);
                      setIsOpen(false);
                    }}
                    className={`
                      w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-serif font-bold transition-all cursor-pointer
                      ${
                        isSelected
                          ? 'bg-amber-100/90 text-amber-950 border border-amber-300/80 shadow-2xs'
                          : 'hover:bg-stone-200/60 text-stone-700 hover:text-stone-900 border border-transparent'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4.5 h-4.5 ${isSelected ? opt.accentColor : 'text-stone-600'}`} />
                      <span>{opt.label}</span>
                    </div>

                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-amber-800" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
