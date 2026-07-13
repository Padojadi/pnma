'use client';

import { useEffect } from 'react';
import { useA11y } from '@/components/A11yProvider';

type Handlers = {
  onStartCall?: () => void;
  onCloseCall?: () => void;
  onNewAssistance?: () => void;
  onFocusMain?: () => void;
};

/** Raccourcis clavier pour le plateau RA (malvoyants / PMR — zéro souris). */
export function useRaShortcuts(handlers: Handlers, enabled = true) {
  const { announce } = useA11y();

  useEffect(() => {
    if (!enabled) return;

    function onKey(e: KeyboardEvent) {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const key = e.key.toLowerCase();

      if (key === '/') {
        e.preventDefault();
        announce(
          'Raccourcis : Alt plus A démarrer appel, Alt plus C clôturer appel, Alt plus N nouvelle assistance, Alt plus M contenu principal, Alt plus slash aide.',
          true,
        );
        return;
      }
      if (key === 'a' && handlers.onStartCall) {
        e.preventDefault();
        handlers.onStartCall();
        announce('Démarrage de l’appel');
      }
      if (key === 'c' && handlers.onCloseCall) {
        e.preventDefault();
        handlers.onCloseCall();
        announce('Clôture de l’appel');
      }
      if (key === 'n' && handlers.onNewAssistance) {
        e.preventDefault();
        handlers.onNewAssistance();
      }
      if (key === 'm' && handlers.onFocusMain) {
        e.preventDefault();
        handlers.onFocusMain();
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, handlers, announce]);
}
