export const translations = {
  es: {
    badge: 'Edición Músico • v2.0',
    studioName: 'SongBook Studio',
    deskLighting: 'Ambiente de Mesa',
    tagline: 'Tu cuaderno interactivo de canciones y acordes',
    quote: '“Donde las palabras fallan, la música habla.”',
    footerRights: '© 2026 SongBook • Diseñado para músicos y creadores',
    footerTune: 'Afina tu instrumento y abre tus acordes',

    // Left Page
    chordStampsTitle: 'Sellos de Acordes Rápidos',
    tapToTry: 'Toca para probar',
    selectedChord: 'Acorde activo',
    major: 'Mayor',
    minor: 'Menor',
    featuresTitle: 'HERRAMIENTAS DEL CUADERNO',
    feature1: 'Sincronización rítmica con YouTube & BeatGrid',
    feature2: 'Diagramas dinámicos de Guitarra y Bandoneón',
    feature3: 'Transposición al instante con sonido real',

    // Tabs
    tabLogin: 'Ingresar',
    tabRegister: 'Crear Cuenta',
    tabGuest: 'Modo Libre',

    // Login Form
    loginTitle: 'Abrir mi Cuaderno',
    loginSubtitle: 'Accede a tus canciones, acordes y listas sincronizadas.',
    emailLabel: 'Correo Electrónico',
    emailPlaceholder: 'nombre@ejemplo.com',
    passwordLabel: 'Contraseña',
    passwordPlaceholder: 'Tu contraseña',
    forgotPassword: '¿Olvidaste tu contraseña?',
    rememberMe: 'Recordar sesión en este equipo',
    loginButton: 'Entrar al Cuaderno',
    openingNotebook: 'Abriendo cuaderno...',
    orContinueWith: 'o continúa con',
    noAccount: '¿Aún no tienes cuenta?',
    createOneHere: 'Crea tu cuaderno gratis',

    // Register Form
    registerTitle: 'Nuevo Cuaderno',
    registerSubtitle: 'Personaliza tu espacio de acordes y biblioteca musical.',
    nameLabel: 'Nombre o Nombre Artístico',
    namePlaceholder: 'Ej: Gustavo, Fito, Charly...',
    instrumentLabel: 'Instrumento Principal',
    registerButton: 'Crear mi Cuaderno',
    creatingNotebook: 'Preparando tu cuaderno...',
    alreadyHaveAccount: '¿Ya tienes un cuaderno?',
    loginHere: 'Inicia sesión aquí',

    // Instruments
    instGuitar: 'Guitarra',
    instPiano: 'Piano',
    instBandoneon: 'Bandoneón',
    instUkulele: 'Ukelele',
    instVocals: 'Voz / Canto',

    // Guest Mode
    guestTitle: 'Explorar Modo Libre',
    guestSubtitle: 'Prueba todas las funciones y canciones de muestra sin necesidad de registro.',
    sampleSongsTitle: 'Canciones de muestra listas para tocar',
    key: 'Tonalidad',
    guestButton: 'Comenzar a Tocar',
    wantToSave: '¿Deseas guardar tus propias canciones?',

    // Language toggle
    language: 'Idioma',
    langEs: 'Español',
    langEn: 'English',

    // Musician tabs & header
    tabSongbook: 'Cancionero',
    tabScores: 'Partituras & Tabs',
    notebookOf: 'Cuaderno de',
    chordStudio: 'Estudio de Acordes & Canciones',
    closeNotebook: 'Cerrar Cuaderno',
  },
  en: {
    badge: 'Musician Edition • v2.0',
    studioName: 'SongBook Studio',
    deskLighting: 'Desk Ambiance',
    tagline: 'Your interactive chord & song notebook',
    quote: '“Where words fail, music speaks.”',
    footerRights: '© 2026 SongBook • Crafted for musicians & songwriters',
    footerTune: 'Tune your instrument and open your chords',

    // Left Page
    chordStampsTitle: 'Quick Chord Stamps',
    tapToTry: 'Tap to preview',
    selectedChord: 'Active chord',
    major: 'Major',
    minor: 'Minor',
    featuresTitle: 'NOTEBOOK CAPABILITIES',
    feature1: 'Rhythmic YouTube & BeatGrid synchronization',
    feature2: 'Dynamic Guitar & Bandoneon chord charts',
    feature3: 'Instant transposition with authentic audio',

    // Tabs
    tabLogin: 'Sign In',
    tabRegister: 'Sign Up',
    tabGuest: 'Free Tour',

    // Login Form
    loginTitle: 'Open my Songbook',
    loginSubtitle: 'Access your songs, transposed chords, and synced sets.',
    emailLabel: 'Email Address',
    emailPlaceholder: 'you@example.com',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Your password',
    forgotPassword: 'Forgot password?',
    rememberMe: 'Keep me signed in',
    loginButton: 'Open Songbook',
    openingNotebook: 'Opening songbook...',
    orContinueWith: 'or continue with',
    noAccount: "Don't have a notebook yet?",
    createOneHere: 'Create one for free',

    // Register Form
    registerTitle: 'Create your Notebook',
    registerSubtitle: 'Customize your chord workspace and music library.',
    nameLabel: 'Name or Stage Name',
    namePlaceholder: 'e.g. John, Taylor, Paul...',
    instrumentLabel: 'Primary Instrument',
    registerButton: 'Create my Songbook',
    creatingNotebook: 'Setting up your notebook...',
    alreadyHaveAccount: 'Already have an account?',
    loginHere: 'Sign in here',

    // Instruments
    instGuitar: 'Guitar',
    instPiano: 'Piano',
    instBandoneon: 'Bandoneon',
    instUkulele: 'Ukulele',
    instVocals: 'Vocals',

    // Guest Mode
    guestTitle: 'Explore Free Mode',
    guestSubtitle: 'Experience the full chord visualizer and sample songs without an account.',
    sampleSongsTitle: 'Sample songs ready to play',
    key: 'Key',
    guestButton: 'Start Playing Now',
    wantToSave: 'Want to save your own custom songs?',

    // Language toggle
    language: 'Language',
    langEs: 'Español',
    langEn: 'English',

    // Musician tabs & header
    tabSongbook: 'Songbook',
    tabScores: 'Scores & Tabs',
    notebookOf: 'Notebook of',
    chordStudio: 'Chord & Song Studio',
    closeNotebook: 'Close Notebook',
  },
};

/**
 * Detect user language from browser
 */
export function detectBrowserLanguage() {
  try {
    const navLang = navigator.language || (navigator.languages && navigator.languages[0]) || 'es';
    if (navLang.toLowerCase().startsWith('es')) {
      return 'es';
    }
    return 'en';
  } catch {
    return 'es';
  }
}
