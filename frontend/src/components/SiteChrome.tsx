'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearAuth, getStoredUser } from '@/lib/api';
import { useEffect, useState } from 'react';

export function SiteHeader({ solid = false }: { solid?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getStoredUser>>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, [pathname]);

  const logout = () => {
    clearAuth();
    setUser(null);
    router.push('/');
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 ${
        solid ? 'bg-night-950/95 border-b border-white/10 backdrop-blur' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" className="font-display text-3xl font-bold tracking-wide text-white">
          PNMA
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-mist/80 md:flex">
          <Link href="/#offres" className="hover:text-signal-400">
            Offres
          </Link>
          <Link href="/#services" className="hover:text-signal-400">
            Services
          </Link>
          <Link href="/#reseau" className="hover:text-signal-400">
            Réseau
          </Link>
          {user ? (
            <>
              <Link href="/dashboard" className="hover:text-signal-400">
                Espace
              </Link>
              <button onClick={logout} className="text-mist/60 hover:text-white">
                Déconnexion
              </button>
            </>
          ) : (
            <Link
              href="/connexion"
              className="rounded-sm bg-signal-500 px-4 py-2 font-semibold text-night-950 transition hover:bg-signal-400"
            >
              Connexion
            </Link>
          )}
        </nav>
        <Link href="/connexion" className="md:hidden text-sm text-signal-400">
          Connexion
        </Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-night-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-10 text-sm text-mist/55 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="font-display text-2xl text-white">PNMA</div>
          <p>Orchestrateur d’assistance routière — Sénégal</p>
        </div>
        <p>Centre d’appel national · 24h/24 · 7j/7</p>
      </div>
    </footer>
  );
}
