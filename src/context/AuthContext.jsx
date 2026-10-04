import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const TIERS = {
  FREE: 'FREE',
  PRO: 'PRO',
  ADMIN: 'ADMIN',
  PREMIUM: 'PRO', // Alias de compatibilidad
};

export const TIER_LIMITS = {
  FREE: {
    maxSongs: 5,
    maxSetlists: 2,
    hasAds: true,
    allowedInstruments: ['guitar', 'ukelele', 'vocals'],
    canExportPdf: false,
    canSyncCloud: false,
    canEditArtwork: false,
  },
  PRO: {
    maxSongs: Infinity,
    maxSetlists: Infinity,
    hasAds: false,
    allowedInstruments: ['guitar', 'piano', 'bandoneon', 'ukelele', 'vocals'],
    canExportPdf: true,
    canSyncCloud: true,
    canEditArtwork: false,
  },
  ADMIN: {
    maxSongs: Infinity,
    maxSetlists: Infinity,
    hasAds: false,
    allowedInstruments: ['guitar', 'piano', 'bandoneon', 'ukelele', 'vocals'],
    canExportPdf: true,
    canSyncCloud: true,
    canEditArtwork: true,
  },
};

TIER_LIMITS.PREMIUM = TIER_LIMITS.PRO;

const DEFAULT_USERS = {
  'gabothdev@gmail.com': {
    id: 'user_admin_gabothdev',
    name: 'Gabriel (GabothDev)',
    email: 'gabothdev@gmail.com',
    instrument: 'Guitarra & Bandoneón',
    tier: TIERS.ADMIN,
    role: 'Administrador',
    songsCount: 18,
    setlistsCount: 4,
    chordsLearned: 36,
  },
  'pro.user@songbook.app': {
    name: 'Músico Pro',
    email: 'pro.user@songbook.app',
    instrument: 'Guitarra & Piano',
    tier: TIERS.PRO,
    role: 'Músico Pro',
    songsCount: 12,
    setlistsCount: 3,
    chordsLearned: 24,
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

  // Cycles through: FREE -> PRO -> ADMIN -> FREE
  const toggleTier = () => {
    if (!currentUser) return;
    setCurrentUser((prev) => {
      let nextTier = TIERS.PRO;
      let nextRole = 'Músico Pro';

      if (prev.tier === TIERS.FREE) {
        nextTier = TIERS.PRO;
        nextRole = 'Músico Pro';
      } else if (prev.tier === TIERS.PRO || prev.tier === 'PREMIUM') {
        nextTier = TIERS.ADMIN;
        nextRole = 'Administrador';
      } else {
        nextTier = TIERS.FREE;
        nextRole = 'Usuario Free';
      }

      return {
        ...prev,
        tier: nextTier,
        role: nextRole,
      };
    });
  };

  const upgradeToPro = () => {
    if (!currentUser) return;
    setCurrentUser((prev) => ({
      ...prev,
      tier: TIERS.PRO,
      role: 'Músico Pro',
    }));
    setIsUpgradeModalOpen(false);
  };

  const isPro = currentUser?.tier === TIERS.PRO || currentUser?.tier === TIERS.ADMIN || currentUser?.tier === 'PREMIUM';
  const isAdmin = currentUser?.tier === TIERS.ADMIN;
  const canEditArtwork = isAdmin;

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
        isPro,
        isAdmin,
        canEditArtwork,
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
