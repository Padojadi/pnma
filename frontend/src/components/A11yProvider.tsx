'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type A11yPrefs = {
  largeText: boolean;
  highContrast: boolean;
  voiceAlerts: boolean;
};

type A11yContextValue = A11yPrefs & {
  setLargeText: (v: boolean) => void;
  setHighContrast: (v: boolean) => void;
  setVoiceAlerts: (v: boolean) => void;
  announce: (message: string, assertive?: boolean) => void;
  speak: (message: string) => void;
};

const A11yContext = createContext<A11yContextValue | null>(null);
const STORAGE_KEY = 'pnma-a11y';

const defaults: A11yPrefs = {
  largeText: false,
  highContrast: false,
  voiceAlerts: true,
};

export function A11yProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<A11yPrefs>(defaults);
  const [live, setLive] = useState({ polite: '', assertive: '' });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPrefs({ ...defaults, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    document.documentElement.classList.toggle('a11y-large-text', prefs.largeText);
    document.documentElement.classList.toggle('a11y-high-contrast', prefs.highContrast);
  }, [prefs]);

  const announce = useCallback((message: string, assertive = false) => {
    if (assertive) {
      setLive((s) => ({ ...s, assertive: '' }));
      requestAnimationFrame(() => setLive((s) => ({ ...s, assertive: message })));
    } else {
      setLive((s) => ({ ...s, polite: '' }));
      requestAnimationFrame(() => setLive((s) => ({ ...s, polite: message })));
    }
  }, []);

  const speak = useCallback(
    (message: string) => {
      if (!prefs.voiceAlerts || typeof window === 'undefined' || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(message);
      utt.lang = 'fr-FR';
      utt.rate = 1;
      window.speechSynthesis.speak(utt);
    },
    [prefs.voiceAlerts],
  );

  const value = useMemo<A11yContextValue>(
    () => ({
      ...prefs,
      setLargeText: (v) => setPrefs((p) => ({ ...p, largeText: v })),
      setHighContrast: (v) => setPrefs((p) => ({ ...p, highContrast: v })),
      setVoiceAlerts: (v) => setPrefs((p) => ({ ...p, voiceAlerts: v })),
      announce,
      speak,
    }),
    [prefs, announce, speak],
  );

  return (
    <A11yContext.Provider value={value}>
      <a href="#contenu-principal" className="skip-link">
        Aller au contenu principal
      </a>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {live.polite}
      </div>
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {live.assertive}
      </div>
      {children}
    </A11yContext.Provider>
  );
}

export function useA11y() {
  const ctx = useContext(A11yContext);
  if (!ctx) throw new Error('useA11y must be used within A11yProvider');
  return ctx;
}

export function A11yToolbar() {
  const a11y = useA11y();
  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-sm border border-white/15 bg-night-900/80 px-3 py-2 text-xs"
      role="group"
      aria-label="Options d’accessibilité"
    >
      <span className="font-semibold text-signal-400">Accessibilité</span>
      <label className="inline-flex min-h-11 items-center gap-2 px-1">
        <input
          type="checkbox"
          checked={a11y.largeText}
          onChange={(e) => a11y.setLargeText(e.target.checked)}
        />
        Texte agrandi
      </label>
      <label className="inline-flex min-h-11 items-center gap-2 px-1">
        <input
          type="checkbox"
          checked={a11y.highContrast}
          onChange={(e) => a11y.setHighContrast(e.target.checked)}
        />
        Contraste élevé
      </label>
      <label className="inline-flex min-h-11 items-center gap-2 px-1">
        <input
          type="checkbox"
          checked={a11y.voiceAlerts}
          onChange={(e) => a11y.setVoiceAlerts(e.target.checked)}
        />
        Alertes vocales
      </label>
      <span className="text-mist/45">Raccourcis : Alt+/ aide · Alt+A démarrer appel · Alt+C clôturer</span>
    </div>
  );
}
