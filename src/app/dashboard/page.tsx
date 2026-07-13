'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/SiteChrome';
import { CallChronogram } from '@/components/CallChronogram';
import { A11yToolbar } from '@/components/A11yProvider';
import {
  api,
  clearAuth,
  formatFcfa,
  getStoredUser,
  statusLabel,
  typeLabel,
  type CallSession,
  type DashboardData,
  type FluxMedical,
  type Incident,
  type User,
} from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [medical, setMedical] = useState<Array<Record<string, unknown>>>([]);
  const [fluxDetail, setFluxDetail] = useState<FluxMedical | null>(null);
  const [showFlux, setShowFlux] = useState(false);
  const [exceededCalls, setExceededCalls] = useState<CallSession[]>([]);
  const [ai, setAi] = useState<Record<string, unknown> | null>(null);
  const [tab, setTab] = useState<'incidents' | 'kpis' | 'medical' | 'calls' | 'ai'>('incidents');
  const [region, setRegion] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.push('/connexion');
      return;
    }
    setUser(stored);
    const isStaff = ['ADMIN', 'CALL_CENTER', 'TEAM_LEAD'].includes(stored.role);
    Promise.all([
      api.me().catch(() => stored),
      api.incidents(),
      isStaff ? api.dashboard() : Promise.resolve(null),
      isStaff ? api.medical() : Promise.resolve([]),
      isStaff ? api.calls('exceeded=true').catch(() => []) : Promise.resolve([]),
    ])
      .then(([me, incs, dash, med, calls]) => {
        setUser(me);
        setIncidents(incs);
        if (dash) setDashboard(dash);
        setMedical(med as Array<Record<string, unknown>>);
        setExceededCalls(calls as CallSession[]);
        if (isStaff) setTab('kpis');
      })
      .catch((e) => setError(e.message));
  }, [router]);

  async function openFlux() {
    try {
      const data = await api.fluxMedical(region || undefined);
      setFluxDetail(data);
      setShowFlux(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur flux médical');
    }
  }

  async function refreshDashboard() {
    const dash = await api.dashboard(region || undefined);
    setDashboard(dash);
  }

  if (!user) {
    return <main className="min-h-screen bg-night-950 px-5 py-28 text-mist/60">Chargement…</main>;
  }

  const isStaff = ['ADMIN', 'CALL_CENTER', 'TEAM_LEAD'].includes(user.role);
  const isLead = user.role === 'ADMIN' || user.role === 'TEAM_LEAD';

  return (
    <main id="contenu-principal" className="min-h-screen bg-night-950" tabIndex={-1}>
      <SiteHeader solid />
      <div className="mx-auto max-w-6xl px-5 py-28">
        <div className="mb-6">
          <A11yToolbar />
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-signal-400">{user.role.replace('_', ' ')}</p>
            <h1 className="font-display text-5xl uppercase text-white">Bonjour, {user.firstName}</h1>
            <p className="mt-2 text-mist/65">PNMA — indicateurs locaux / nationaux, flux médical, chronogramme.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/assistance" className="bg-signal-500 px-4 py-2 font-semibold text-night-950">
              Nouvelle assistance
            </Link>
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
            ? (['kpis', 'incidents', 'medical', 'calls', 'ai'] as const)
            : (['incidents', 'medical'] as const)
          ).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={tab === t ? 'text-signal-400' : 'text-mist/50 hover:text-white'}
            >
              {t === 'kpis'
                ? 'Indicateurs'
                : t === 'incidents'
                  ? 'Incidents'
                  : t === 'medical'
                    ? 'Médical'
                    : t === 'calls'
                      ? 'Appels'
                      : 'IA'}
            </button>
          ))}
        </div>

        {tab === 'kpis' && dashboard && (
          <div className="mt-8 space-y-10">
            <div className="flex flex-wrap gap-3">
              <select
                className="border border-white/15 bg-night-900 px-3 py-2 text-sm"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                <option value="">National</option>
                <option value="Dakar">Dakar</option>
                <option value="Thiès">Thiès</option>
              </select>
              <button onClick={refreshDashboard} className="border border-white/20 px-3 py-2 text-sm">
                Filtrer
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Abonnés actifs', dashboard.kpis.subscribers],
                ['Partenaires', dashboard.kpis.partners],
                ['Incidents ouverts', dashboard.kpis.openIncidents],
                ['Taux résolution', `${dashboard.kpis.resolutionRate}%`],
                ['ETA moyen', `${dashboard.kpis.avgEtaMin} min`],
                ['Abonnements', dashboard.kpis.activeSubscriptions],
                ['Contrats assurance', dashboard.kpis.insuranceContracts],
              ].map(([label, value]) => (
                <div key={String(label)} className="border-l-2 border-signal-500 bg-night-900/50 px-4 py-4">
                  <p className="text-xs uppercase tracking-wider text-mist/45">{label}</p>
                  <p className="mt-1 font-display text-3xl text-white">{value}</p>
                </div>
              ))}
              <button
                onClick={openFlux}
                className="border-l-2 border-signal-500 bg-night-900/50 px-4 py-4 text-left transition hover:bg-night-800/80"
              >
                <p className="text-xs uppercase tracking-wider text-mist/45">Flux médical</p>
                <p className="mt-1 font-display text-3xl text-white">
                  {formatFcfa(dashboard.kpis.medicalFluxFcfa ?? dashboard.kpis.medicalVolumeFcfa)}
                </p>
                <p className="mt-1 text-xs text-signal-400">Cliquer pour détail objectif / incidence →</p>
              </button>
            </div>

            {showFlux && fluxDetail && (
              <div className="border border-signal-500/30 bg-night-900/60 p-6">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="font-display text-3xl uppercase text-white">Flux médical — {fluxDetail.region}</h2>
                  <button onClick={() => setShowFlux(false)} className="text-sm text-mist/50">
                    Fermer
                  </button>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-mist/50">Objectif mensuel</p>
                    <p className="font-display text-4xl text-signal-400">{fluxDetail.month.pctOfObjective}%</p>
                    <p className="text-sm text-mist/70">
                      {formatFcfa(fluxDetail.month.amountFcfa)} / {formatFcfa(fluxDetail.month.objectiveFcfa)}
                    </p>
                    <p className="text-xs text-mist/45">Reste : {formatFcfa(fluxDetail.month.remainingFcfa)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-mist/50">Objectif annuel</p>
                    <p className="font-display text-4xl text-white">{fluxDetail.year.pctOfObjective}%</p>
                    <p className="text-sm text-mist/70">
                      {formatFcfa(fluxDetail.year.amountFcfa)} / {formatFcfa(fluxDetail.year.objectiveFcfa)}
                    </p>
                  </div>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="border border-white/10 p-4">
                    <p className="text-sm text-mist/50">Incidence régionale</p>
                    <p className="mt-1 text-white">
                      {fluxDetail.incidence.regionalCases} cas / {fluxDetail.incidence.regionalSubscribers} abonnés
                      locaux ({fluxDetail.incidence.regionalRatePct}%)
                    </p>
                  </div>
                  <div className="border border-white/10 p-4">
                    <p className="text-sm text-mist/50">Incidence nationale</p>
                    <p className="mt-1 text-white">
                      {fluxDetail.incidence.nationalCases} cas / {fluxDetail.incidence.nationalSubscribers} abonnés
                      nationaux ({fluxDetail.incidence.nationalRatePct}%)
                    </p>
                  </div>
                </div>
                <p className="mt-5 text-sm leading-relaxed text-mist/75">{fluxDetail.narrative}</p>
              </div>
            )}

            {dashboard.localNational && (
              <div>
                <h2 className="font-display text-2xl uppercase text-white">Répartition locale / nationale</h2>
                <p className="mt-2 text-sm text-mist/65">{dashboard.localNational.narrative}</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="border border-white/10 p-4">
                    <p className="text-sm text-signal-400">Abonnés par région</p>
                    <ul className="mt-3 space-y-2 text-sm">
                      {dashboard.localNational.subscribersByRegion.map((r) => (
                        <li key={r.region} className="flex justify-between text-mist/80">
                          <span>{r.region}</span>
                          <span>
                            {r.count} · {r.shareNationalPct}% nat.
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="border border-white/10 p-4">
                    <p className="text-sm text-signal-400">Flux médical par région</p>
                    <ul className="mt-3 space-y-2 text-sm">
                      {dashboard.localNational.medicalByRegion.map((r) => (
                        <li key={r.region} className="flex justify-between text-mist/80">
                          <span>{r.region}</span>
                          <span>
                            {r.cases} cas · {r.shareNationalPct}%
                          </span>
                        </li>
                      ))}
                      {!dashboard.localNational.medicalByRegion.length && (
                        <li className="text-mist/45">Pas encore de données régionales</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {dashboard.byDomain && (
              <div>
                <h2 className="font-display text-2xl uppercase text-white">Par domaine</h2>
                <div className="mt-3 flex flex-wrap gap-3">
                  {dashboard.byDomain.map((d) => (
                    <div key={d.domain} className="border border-white/10 px-4 py-3 text-sm">
                      <span className="text-signal-400">{d.domain}</span> · {d._count}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'incidents' && (
          <div className="mt-8 space-y-3">
            {incidents.map((inc) => (
              <div
                key={inc.id}
                className="flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-night-900/40 px-4 py-4"
              >
                <div>
                  <p className="font-semibold text-white">{inc.reference}</p>
                  <p className="text-sm text-mist/60">
                    [{inc.domain || 'ASSISTANCE'}] {typeLabel(inc.type)} · {inc.city || '—'} ·{' '}
                    {statusLabel(inc.status)}
                    {inc.assignedPartner ? ` · ${inc.assignedPartner.businessName}` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  {isStaff && !['RESOLVED', 'CANCELLED', 'REDIRECTED'].includes(inc.status) && (
                    <button
                      onClick={() => api.aiOptimize(inc.id).then(setAi).then(() => setTab('ai'))}
                      className="text-sm text-signal-400"
                    >
                      Optimiser IA
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
                <div
                  key={String(m.id)}
                  className="flex flex-wrap items-center justify-between gap-3 border border-white/10 px-4 py-4"
                >
                  <div>
                    <p className="text-white">{String(m.reference)}</p>
                    <p className="text-sm text-mist/60">
                      {formatFcfa(Number(m.amountFcfa))} · {statusLabel(String(m.status))}
                      {m.region ? ` · ${String(m.region)}` : ''}
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

        {tab === 'calls' && isStaff && (
          <div className="mt-8 space-y-6">
            <CallChronogram />
            {isLead && (
              <div>
                <h2 className="font-display text-2xl uppercase text-white">Alertes chef d’équipe</h2>
                <p className="mt-1 text-sm text-mist/60">
                  Appels ayant consommé plus d’un paquet de minutes — à analyser en réunion qualité.
                </p>
                <div className="mt-4 space-y-2">
                  {exceededCalls.map((c) => (
                    <div key={c.id} className="border border-red-400/30 px-4 py-3 text-sm">
                      <p className="text-white">
                        {c.reference} · {c.agent?.firstName} {c.agent?.lastName}
                      </p>
                      <p className="text-mist/60">
                        {c.packetsUsed} paquets · {c.elapsedSec}s · {c.incident?.reference || 'sans incident'}
                      </p>
                    </div>
                  ))}
                  {!exceededCalls.length && <p className="text-mist/50">Aucun dépassement en cours.</p>}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'ai' && (
          <div className="mt-8 border border-white/10 bg-night-900/40 p-6">
            <button onClick={() => api.aiNetwork().then(setAi)} className="text-sm text-signal-400">
              Insights réseau
            </button>
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
