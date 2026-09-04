import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const TIERS = {
  FREE: 'FREE',
  PREMIUM: 'PREMIUM',
};

export const TIER_LIMITS = {
  FREE: {
    maxSongs: 5,
    maxSetlists: 2,
    hasAds: true,
    allowedInstruments: ['guitar', 'ukelele', 'vocals'],
    canExportPdf: false,
    canSyncCloud: false,
  },
  PREMIUM: {
    maxSongs: Infinity,
    maxSetlists: Infinity,
    hasAds: false,
    allowedInstruments: ['guitar', 'piano', 'bandoneon', 'ukelele', 'vocals'],
    canExportPdf: true,
    canSyncCloud: true,
  },
};

const DEFAULT_USERS = {
  'gabothdev@gmail.com': {
    name: 'Gabriel (GabothDev)',
    email: 'gabothdev@gmail.com',
    instrument: 'Guitarra & Bandoneón',
    tier: TIERS.PREMIUM,
    role: 'Músico Pro',
    songsCount: 18,
    setlistsCount: 4,
    chordsLearned: 36,
  },
  'invitado': {
    name: 'Músico Free',
    email: 'free.user@songbook.app',
    instrument: 'Guitarra',
    tier: TIERS.FREE,
    role: 'Usuario Free',
    songsCount: 3,
    setlistsCount: 1,
    chordsLearned: 8,
  },
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('songbook_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('songbook_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('songbook_user');
    }
  }, [currentUser]);

  const login = (credentials) => {
    const { email = '' } = credentials;
    const lowerEmail = email.toLowerCase().trim();

    if (lowerEmail === 'gabothdev@gmail.com') {
      const user = { ...DEFAULT_USERS['gabothdev@gmail.com'] };
      setCurrentUser(user);
      return user;
    } else if (credentials.guest) {
      const user = { ...DEFAULT_USERS['invitado'] };
      setCurrentUser(user);
      return user;
    } else {
      const user = {
        name: credentials.name || lowerEmail.split('@')[0] || 'Músico',
        email: lowerEmail,
        instrument: credentials.instrument || 'Guitarra',
        tier: TIERS.FREE,
        role: 'Usuario Free',
        songsCount: 1,
        setlistsCount: 1,
        chordsLearned: 5,
      };
      setCurrentUser(user);
      return user;
    }
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const toggleTier = () => {
    if (!currentUser) return;
    setCurrentUser((prev) => ({
      ...prev,
      tier: prev.tier === TIERS.FREE ? TIERS.PREMIUM : TIERS.FREE,
      role: prev.tier === TIERS.FREE ? 'Músico Pro' : 'Usuario Free',
    }));
  };

  const upgradeToPro = () => {
    if (!currentUser) return;
    setCurrentUser((prev) => ({
      ...prev,
      tier: TIERS.PREMIUM,
      role: 'Músico Pro',
    }));
    setIsUpgradeModalOpen(false);
  };

  const limits = currentUser ? TIER_LIMITS[currentUser.tier] || TIER_LIMITS.FREE : TIER_LIMITS.FREE;

  const canAddSong = (currentCount) => {
    return currentCount < limits.maxSongs;
  };

  const canAddSetlist = (currentCount) => {
    return currentCount < limits.maxSetlists;
  };

  const canUseInstrument = (instrumentId) => {
    return limits.allowedInstruments.includes(instrumentId);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        login,
        logout,
        toggleTier,
        upgradeToPro,
        limits,
        canAddSong,
        canAddSetlist,
        canUseInstrument,
        isUpgradeModalOpen,
        openUpgradeModal: () => setIsUpgradeModalOpen(true),
        closeUpgradeModal: () => setIsUpgradeModalOpen(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
