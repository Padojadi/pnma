'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/SiteChrome';
import { CallChronogram } from '@/components/CallChronogram';
import { api, getStoredUser, statusLabel, typeLabel, type Catalog } from '@/lib/api';

const TYPES = [
  { value: 'BREAKDOWN', label: 'Panne de véhicule', domain: 'ASSISTANCE' },
  { value: 'REMOTE_DIAGNOSIS', label: 'Diagnostic à distance', domain: 'ASSISTANCE' },
  { value: 'ON_SITE_REPAIR', label: 'Dépannage sur site', domain: 'ASSISTANCE' },
  { value: 'EVACUATION', label: 'Évacuation', domain: 'ASSISTANCE' },
  { value: 'REPLACEMENT_VEHICLE', label: 'Véhicule de remplacement', domain: 'ASSISTANCE' },
  { value: 'RESCUE', label: 'Secours', domain: 'SECOURS' },
  { value: 'MEDICAL', label: 'Médical', domain: 'MEDICAL' },
  { value: 'ACCIDENT', label: 'Accident', domain: 'ASSISTANCE' },
  { value: 'OTHER', label: 'Autre', domain: 'ASSISTANCE' },
];

export default function AssistancePage() {
  const router = useRouter();
  const [type, setType] = useState('BREAKDOWN');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Dakar');
  const [lat, setLat] = useState(14.7167);
  const [lng, setLng] = useState(-17.4677);
  const [confirmedBreakdown, setConfirmedBreakdown] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [result, setResult] = useState<{
    reference?: string;
    status?: string;
    partner?: string;
    eta?: number;
    redirected?: boolean;
    id?: string;
  } | null>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.push('/connexion');
      return;
    }
    setIsStaff(['ADMIN', 'CALL_CENTER', 'TEAM_LEAD'].includes(user.role));
    api.catalog().then(setCatalog).catch(() => undefined);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
          api.updateLocation(pos.coords.latitude, pos.coords.longitude).catch(() => undefined);
        },
        () => undefined,
        { enableHighAccuracy: true, timeout: 8000 },
      );
    }
  }, [router]);

  const selected = TYPES.find((t) => t.value === type);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.createIncident({
        type,
        domain: selected?.domain,
        description,
        address,
        city,
        region: city,
        latitude: lat,
        longitude: lng,
        confirmedBreakdown: type === 'BREAKDOWN' ? confirmedBreakdown : undefined,
        redirectService: !confirmedBreakdown ? 'Orientation / information abonné' : undefined,
        priority:
          type === 'ACCIDENT' || type === 'MEDICAL' || type === 'RESCUE' ? 'CRITICAL' : 'NORMAL',
      });
      const incident = res.incident;
      setResult({
        id: incident.id,
        reference: incident.reference,
        status: incident.status,
        partner: incident.assignedPartner?.businessName,
        eta: incident.estimatedEtaMin,
        redirected: res.redirected,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-night-950">
      <SiteHeader solid />
      <div className="mx-auto max-w-3xl px-5 py-28">
        <h1 className="font-display text-5xl uppercase text-white">Demande d’assistance</h1>
        <p className="mt-3 text-mist/70">
          Rubriques contractuelles : Assistance → Secours → Médical. Géolocalisation active.
        </p>

        {isStaff && (
          <div className="mt-8">
            <CallChronogram incidentId={result?.id} />
          </div>
        )}

        {catalog && (
          <div className="mt-8 space-y-4 border border-white/10 p-5">
            <h2 className="font-display text-2xl uppercase text-signal-400">Catalogue des rubriques</h2>
            {catalog.domains.map((d) => (
              <div key={d.domain}>
                <p className="font-semibold text-white">{d.label}</p>
                <ul className="mt-2 space-y-1 text-sm text-mist/65">
                  {d.rubrics.map((r, i) => (
                    <li key={i}>• {String(r.label || r.type || r.code)}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {result ? (
          <div className="mt-10 border border-signal-500/40 bg-night-800/50 p-6">
            <p className="font-display text-2xl uppercase text-signal-400">
              {result.redirected ? 'Appel redirigé' : 'Demande enregistrée'}
            </p>
            <p className="mt-3 text-white">Référence : {result.reference}</p>
            <p className="text-mist/70">Statut : {statusLabel(result.status || '')}</p>
            {result.partner && (
              <p className="mt-2 text-mist/80">
                Partenaire : {result.partner}
                {result.eta ? ` · ETA ~${result.eta} min` : ''}
              </p>
            )}
            <Link href="/dashboard" className="mt-6 inline-block text-signal-400">
              Suivre dans mon espace →
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <label className="block text-sm text-mist/70">
              Type d’incident / rubrique
              <select
                className="mt-1 w-full border border-white/15 bg-night-900 px-3 py-3 outline-none focus:border-signal-500"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    [{t.domain}] {t.label}
                  </option>
                ))}
              </select>
            </label>

            {type === 'BREAKDOWN' && (
              <label className="flex items-center gap-3 text-sm text-mist/80">
                <input
                  type="checkbox"
                  checked={confirmedBreakdown}
                  onChange={(e) => setConfirmedBreakdown(e.target.checked)}
                />
                Panne confirmée (sinon redirection hors ligne d’assistance)
              </label>
            )}

            {type === 'REPLACEMENT_VEHICLE' && (
              <p className="text-sm text-signal-400">
                Rubrique conditionnelle : accessible uniquement si prévue au contrat (Niveau 2).
              </p>
            )}

            <textarea
              className="w-full border border-white/15 bg-night-900 px-3 py-3 outline-none focus:border-signal-500"
              rows={3}
              placeholder="Décrivez la situation"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className="border border-white/15 bg-night-900 px-3 py-3 outline-none focus:border-signal-500"
                placeholder="Adresse / repère"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              <input
                className="border border-white/15 bg-night-900 px-3 py-3 outline-none focus:border-signal-500"
                placeholder="Ville / région"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <p className="text-xs text-mist/45">
              Position : {lat.toFixed(5)}, {lng.toFixed(5)} · Type : {typeLabel(type)}
            </p>
            {error && <p className="text-sm text-red-300">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="bg-signal-500 px-6 py-3 font-semibold text-night-950 hover:bg-signal-400 disabled:opacity-60"
            >
              {loading ? 'Traitement…' : 'Envoyer au centre PNMA'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
