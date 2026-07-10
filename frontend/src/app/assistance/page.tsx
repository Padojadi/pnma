'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/SiteChrome';
import { api, getStoredUser, statusLabel } from '@/lib/api';

const TYPES = [
  { value: 'BREAKDOWN', label: 'Panne' },
  { value: 'ACCIDENT', label: 'Accident' },
  { value: 'FLAT_TIRE', label: 'Crevaison' },
  { value: 'BATTERY', label: 'Batterie' },
  { value: 'TOWING', label: 'Remorquage' },
  { value: 'MEDICAL', label: 'Urgence médicale' },
  { value: 'OTHER', label: 'Autre' },
];

export default function AssistancePage() {
  const router = useRouter();
  const [type, setType] = useState('BREAKDOWN');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Dakar');
  const [lat, setLat] = useState(14.7167);
  const [lng, setLng] = useState(-17.4677);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    reference?: string;
    status?: string;
    partner?: string;
    eta?: number;
  } | null>(null);

  useEffect(() => {
    if (!getStoredUser()) {
      router.push('/connexion');
      return;
    }
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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.createIncident({
        type,
        description,
        address,
        city,
        latitude: lat,
        longitude: lng,
        priority: type === 'ACCIDENT' || type === 'MEDICAL' ? 'CRITICAL' : 'NORMAL',
      });
      const incident = res.incident || (res as unknown as { reference: string; status: string; assignedPartner?: { businessName: string }; estimatedEtaMin?: number });
      setResult({
        reference: incident.reference,
        status: incident.status,
        partner: incident.assignedPartner?.businessName,
        eta: incident.estimatedEtaMin,
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
      <div className="mx-auto max-w-2xl px-5 py-28">
        <h1 className="font-display text-5xl uppercase text-white">Demande d’assistance</h1>
        <p className="mt-3 text-mist/70">
          Géolocalisation active — PNMA identifie automatiquement le partenaire le plus proche.
        </p>

        {result ? (
          <div className="mt-10 border border-signal-500/40 bg-night-800/50 p-6">
            <p className="font-display text-2xl uppercase text-signal-400">Demande enregistrée</p>
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
              Type d’incident
              <select
                className="mt-1 w-full border border-white/15 bg-night-900 px-3 py-3 outline-none focus:border-signal-500"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
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
                placeholder="Ville"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <p className="text-xs text-mist/45">
              Position : {lat.toFixed(5)}, {lng.toFixed(5)}
            </p>
            {error && <p className="text-sm text-red-300">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="bg-signal-500 px-6 py-3 font-semibold text-night-950 hover:bg-signal-400 disabled:opacity-60"
            >
              {loading ? 'Dispatch en cours…' : 'Envoyer au centre PNMA'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
