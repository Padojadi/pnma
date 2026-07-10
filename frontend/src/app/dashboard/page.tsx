'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/SiteChrome';
import {
  api,
  clearAuth,
  formatFcfa,
  getStoredUser,
  statusLabel,
  type DashboardData,
  type Incident,
  type User,
} from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [medical, setMedical] = useState<Array<Record<string, unknown>>>([]);
  const [ai, setAi] = useState<Record<string, unknown> | null>(null);
  const [tab, setTab] = useState<'incidents' | 'kpis' | 'medical' | 'ai'>('incidents');
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.push('/connexion');
      return;
    }
    setUser(stored);
    const isStaff = stored.role === 'ADMIN' || stored.role === 'CALL_CENTER';
    Promise.all([
      api.me().catch(() => stored),
      api.incidents(),
      isStaff ? api.dashboard() : Promise.resolve(null),
      isStaff ? api.medical() : Promise.resolve([]),
    ])
      .then(([me, incs, dash, med]) => {
        setUser(me);
        setIncidents(incs);
        if (dash) setDashboard(dash);
        setMedical(med as Array<Record<string, unknown>>);
        if (isStaff) setTab('kpis');
      })
      .catch((e) => setError(e.message));
  }, [router]);

  async function runAi() {
    try {
      const res = await api.aiNetwork();
      setAi(res);
      setTab('ai');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur IA');
    }
  }

  async function optimizeFirst() {
    const open = incidents.find((i) => !['RESOLVED', 'CANCELLED'].includes(i.status));
    if (!open) return;
    try {
      const res = await api.aiOptimize(open.id);
      setAi(res);
      setTab('ai');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur IA');
    }
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-night-950 px-5 py-28 text-mist/60">
        Chargement…
      </main>
    );
  }

  const isStaff = user.role === 'ADMIN' || user.role === 'CALL_CENTER';

  return (
    <main className="min-h-screen bg-night-950">
      <SiteHeader solid />
      <div className="mx-auto max-w-6xl px-5 py-28">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-signal-400">{user.role.replace('_', ' ')}</p>
            <h1 className="font-display text-5xl uppercase text-white">
              Bonjour, {user.firstName}
            </h1>
            <p className="mt-2 text-mist/65">Interlocuteur unique PNMA — suivi des interventions en temps réel.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/assistance" className="bg-signal-500 px-4 py-2 font-semibold text-night-950">
              Nouvelle assistance
            </Link>
            {isStaff && (
              <button onClick={runAi} className="border border-white/20 px-4 py-2 text-sm text-white hover:border-signal-400">
                Insights IA réseau
              </button>
            )}
            <button
              onClick={() => {
                clearAuth();
                router.push('/');
              }}
              className="px-4 py-2 text-sm text-mist/50 hover:text-white"
            >
              Déconnexion
            </button>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

        <div className="mt-8 flex flex-wrap gap-4 border-b border-white/10 pb-3 text-sm">
          {(isStaff
            ? (['kpis', 'incidents', 'medical', 'ai'] as const)
            : (['incidents', 'medical'] as const)
          ).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={tab === t ? 'text-signal-400' : 'text-mist/50 hover:text-white'}
            >
              {t === 'kpis' ? 'Indicateurs' : t === 'incidents' ? 'Incidents' : t === 'medical' ? 'Médical' : 'IA'}
            </button>
          ))}
        </div>

        {tab === 'kpis' && dashboard && (
          <div className="mt-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Abonnés actifs', dashboard.kpis.subscribers],
                ['Partenaires', dashboard.kpis.partners],
                ['Incidents ouverts', dashboard.kpis.openIncidents],
                ['Taux résolution', `${dashboard.kpis.resolutionRate}%`],
                ['ETA moyen', `${dashboard.kpis.avgEtaMin} min`],
                ['Abonnements', dashboard.kpis.activeSubscriptions],
                ['Contrats assurance', dashboard.kpis.insuranceContracts],
                ['Volume médical', formatFcfa(dashboard.kpis.medicalVolumeFcfa)],
              ].map(([label, value]) => (
                <div key={String(label)} className="border-l-2 border-signal-500 bg-night-900/50 px-4 py-4">
                  <p className="text-xs uppercase tracking-wider text-mist/45">{label}</p>
                  <p className="mt-1 font-display text-3xl text-white">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-10">
              <h2 className="font-display text-2xl uppercase text-white">Objectifs de croissance</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-5">
                {dashboard.growthTargets.map((g) => (
                  <div key={g.year} className="border border-white/10 p-4 text-sm">
                    <p className="text-signal-400">Année {g.year}</p>
                    <p className="mt-1 font-display text-2xl text-white">{g.subscribers.toLocaleString('fr-FR')}</p>
                    <p className="text-mist/50">{g.coverage.join(', ')}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'incidents' && (
          <div className="mt-8 space-y-3">
            {incidents.map((inc) => (
              <div key={inc.id} className="flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-night-900/40 px-4 py-4">
                <div>
                  <p className="font-semibold text-white">{inc.reference}</p>
                  <p className="text-sm text-mist/60">
                    {inc.type} · {inc.city || '—'} · {statusLabel(inc.status)}
                    {inc.assignedPartner ? ` · ${inc.assignedPartner.businessName}` : ''}
                    {inc.estimatedEtaMin ? ` · ETA ${inc.estimatedEtaMin} min` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  {isStaff && !['RESOLVED', 'CANCELLED'].includes(inc.status) && (
                    <button
                      onClick={() => api.aiOptimize(inc.id).then(setAi).then(() => setTab('ai'))}
                      className="text-sm text-signal-400"
                    >
                      Optimiser IA
                    </button>
                  )}
                  {isStaff && inc.status === 'DISPATCHING' && (
                    <button
                      onClick={() => api.autoDispatch(inc.id).then(() => api.incidents().then(setIncidents))}
                      className="text-sm text-white"
                    >
                      Relancer dispatch
                    </button>
                  )}
                </div>
              </div>
            ))}
            {!incidents.length && <p className="text-mist/50">Aucun incident pour le moment.</p>}
          </div>
        )}

        {tab === 'medical' && (
          <div className="mt-8 space-y-3">
            {isStaff ? (
              medical.map((m) => (
                <div key={String(m.id)} className="flex flex-wrap items-center justify-between gap-3 border border-white/10 px-4 py-4">
                  <div>
                    <p className="text-white">{String(m.reference)}</p>
                    <p className="text-sm text-mist/60">
                      {formatFcfa(Number(m.amountFcfa))} · {statusLabel(String(m.status))}
                    </p>
                  </div>
                  {m.status === 'REQUESTED' && (
                    <div className="flex gap-2">
                      <button
                        className="bg-signal-500 px-3 py-1 text-sm text-night-950"
                        onClick={() =>
                          api.decideMedical(String(m.id), true).then(() => api.medical().then(setMedical))
                        }
                      >
                        Approuver
                      </button>
                      <button
                        className="border border-white/20 px-3 py-1 text-sm"
                        onClick={() =>
                          api.decideMedical(String(m.id), false).then(() => api.medical().then(setMedical))
                        }
                      >
                        Rejeter
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <MedicalForm onCreated={() => setError('Demande médicale envoyée')} />
            )}
            {isStaff && !medical.length && <p className="text-mist/50">Aucune demande médicale.</p>}
          </div>
        )}

        {tab === 'ai' && (
          <div className="mt-8 border border-white/10 bg-night-900/40 p-6">
            <div className="flex gap-3">
              <button onClick={runAi} className="text-sm text-signal-400">
                Insights réseau
              </button>
              <button onClick={optimizeFirst} className="text-sm text-mist/70 hover:text-white">
                Optimiser 1er incident ouvert
              </button>
            </div>
            <pre className="mt-4 overflow-auto text-xs text-mist/70">
              {ai ? JSON.stringify(ai.payload || ai, null, 2) : 'Lancez une analyse IA.'}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}

function MedicalForm({ onCreated }: { onCreated: () => void }) {
  const [amount, setAmount] = useState(100000);
  const [hospital, setHospital] = useState('');
  const [msg, setMsg] = useState('');

  return (
    <form
      className="max-w-md space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await api.createMedical({ amountFcfa: amount, hospitalName: hospital });
          setMsg('Demande envoyée au centre PNMA');
          onCreated();
        } catch (err) {
          setMsg(err instanceof Error ? err.message : 'Erreur');
        }
      }}
    >
      <h2 className="font-display text-2xl uppercase text-white">Préfinancement médical</h2>
      <input
        type="number"
        className="w-full border border-white/15 bg-night-900 px-3 py-3"
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
      />
      <input
        className="w-full border border-white/15 bg-night-900 px-3 py-3"
        placeholder="Hôpital / clinique"
        value={hospital}
        onChange={(e) => setHospital(e.target.value)}
      />
      <button type="submit" className="bg-signal-500 px-4 py-2 font-semibold text-night-950">
        Soumettre
      </button>
      {msg && <p className="text-sm text-mist/70">{msg}</p>}
    </form>
  );
}
