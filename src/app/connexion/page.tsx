'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setAuth } from '@/lib/api';
import { SiteHeader } from '@/components/SiteChrome';

export default function ConnexionPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('admin@pnma.2ticglobal.com');
  const [password, setPassword] = useState('PnmaAdmin!2026');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res =
        mode === 'login'
          ? await api.login(email, password)
          : await api.register({ email, password, firstName, lastName });
      setAuth(res.accessToken, res.user);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-road-glow">
      <SiteHeader solid />
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-28">
        <h1 className="font-display text-5xl uppercase text-white">
          {mode === 'login' ? 'Connexion' : 'Inscription'}
        </h1>
        <p className="mt-2 text-sm text-mist/65">Accédez à l’espace PNMA — abonnés, centre d’appel, partenaires.</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          {mode === 'register' && (
            <div className="grid grid-cols-2 gap-3">
              <input
                className="w-full border border-white/15 bg-night-900/80 px-3 py-3 text-sm outline-none focus:border-signal-500"
                placeholder="Prénom"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <input
                className="w-full border border-white/15 bg-night-900/80 px-3 py-3 text-sm outline-none focus:border-signal-500"
                placeholder="Nom"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          )}
          <input
            type="email"
            className="w-full border border-white/15 bg-night-900/80 px-3 py-3 text-sm outline-none focus:border-signal-500"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            className="w-full border border-white/15 bg-night-900/80 px-3 py-3 text-sm outline-none focus:border-signal-500"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-300">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-signal-500 py-3 font-semibold text-night-950 transition hover:bg-signal-400 disabled:opacity-60"
          >
            {loading ? 'Patientez…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </button>
        </form>

        <button
          className="mt-5 text-sm text-mist/60 hover:text-signal-400"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? 'Créer un compte abonné' : 'Déjà inscrit ? Se connecter'}
        </button>

        <div className="mt-8 border-t border-white/10 pt-5 text-xs text-mist/45">
          <p>Comptes démo :</p>
          <p>admin@pnma.2ticglobal.com / PnmaAdmin!2026</p>
          <p>callcenter@pnma.2ticglobal.com / CallCenter!2026</p>
          <p>chef@pnma.2ticglobal.com / TeamLead!2026</p>
          <p>abonne@pnma.2ticglobal.com / Abonne!2026</p>
          <Link href="/" className="mt-3 inline-block text-signal-400">
            ← Retour
          </Link>
        </div>
      </div>
    </main>
  );
}
