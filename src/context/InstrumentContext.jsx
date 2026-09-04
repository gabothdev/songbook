import React, { createContext, useContext, useState, useEffect } from 'react';

const InstrumentContext = createContext();

export const INSTRUMENTS = {
  GUITAR: 'guitar',
  BANDONEON: 'bandoneon',
};

export function InstrumentProvider({ children }) {
  const [instrument, setInstrumentState] = useState(() => {
    return localStorage.getItem('songbook_instrument') || INSTRUMENTS.GUITAR;
  });

  const setInstrument = (newInstrument) => {
    if (newInstrument === INSTRUMENTS.GUITAR || newInstrument === INSTRUMENTS.BANDONEON) {
      setInstrumentState(newInstrument);
      localStorage.setItem('songbook_instrument', newInstrument);
    }
  };

  useEffect(() => {
    localStorage.setItem('songbook_instrument', instrument);
  }, [instrument]);

  const isGuitar = instrument === INSTRUMENTS.GUITAR;
  const isBandoneon = instrument === INSTRUMENTS.BANDONEON;

  return (
    <InstrumentContext.Provider
      value={{
        instrument,
        setInstrument,
        isGuitar,
        isBandoneon,
      }}
    >
      {children}
    </InstrumentContext.Provider>
  );
}

export function useInstrument() {
  const context = useContext(InstrumentContext);
  if (!context) {
    throw new Error('useInstrument must be used within an InstrumentProvider');
  }
  return context;
}
