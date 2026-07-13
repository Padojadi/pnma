'use client';

import { useEffect, useRef, useState } from 'react';
import { api, formatDuration, type CallSession } from '@/lib/api';

export function CallChronogram({ incidentId }: { incidentId?: string }) {
  const [call, setCall] = useState<CallSession | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [packetMin, setPacketMin] = useState(5);
  const [error, setError] = useState('');
  const startedAt = useRef<number | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  async function start() {
    setError('');
    try {
      const session = await api.startCall({ incidentId, packetMinutes: packetMin });
      setCall(session);
      startedAt.current = Date.now();
      setElapsed(0);
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = setInterval(async () => {
        if (!startedAt.current) return;
        const sec = Math.floor((Date.now() - startedAt.current) / 1000);
        setElapsed(sec);
        try {
          const updated = await api.tickCall(session.id, sec);
          setCall(updated);
        } catch {
          /* ignore transient */
        }
      }, 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    }
  }

  async function close() {
    if (!call) return;
    if (tickRef.current) clearInterval(tickRef.current);
    const closed = await api.closeCall(call.id, {
      decision: 'Référencement / transfert unité de suivi',
      notes: 'Clôture chronogramme',
    });
    setCall(closed);
  }

  const packetSec = (call?.packetMinutes || packetMin) * 60;
  const packets = Math.max(1, Math.ceil((elapsed || 1) / packetSec));
  const countdown = Math.max(0, packets * packetSec - elapsed);
  const exceeded = packets > 1;

  return (
    <div className="border border-white/10 bg-night-900/50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-2xl uppercase text-white">Chronogramme d’appel</h3>
          <p className="text-sm text-mist/60">Bi-directionnel : décompte du paquet + compteur écoulé</p>
        </div>
        {!call || call.status === 'CLOSED' ? (
          <div className="flex items-center gap-2">
            <select
              className="border border-white/15 bg-night-950 px-2 py-2 text-sm"
              value={packetMin}
              onChange={(e) => setPacketMin(Number(e.target.value))}
            >
              <option value={3}>Paquet 3 min</option>
              <option value={5}>Paquet 5 min</option>
            </select>
            <button onClick={start} className="bg-signal-500 px-4 py-2 font-semibold text-night-950">
              Démarrer l’appel
            </button>
          </div>
        ) : (
          <button onClick={close} className="border border-white/20 px-4 py-2 text-sm">
            Clôturer
          </button>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

      {(call || elapsed > 0) && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="border-l-2 border-signal-500 pl-4">
            <p className="text-xs uppercase tracking-wider text-mist/45">Décompte paquet</p>
            <p className={`mt-1 font-display text-5xl ${exceeded ? 'text-red-300' : 'text-signal-400'}`}>
              {formatDuration(countdown)}
            </p>
            <p className="mt-1 text-sm text-mist/60">
              Paquet {packets} · {call?.packetMinutes || packetMin} min
              {exceeded ? ' · dépassement signalé au chef d’équipe' : ''}
            </p>
          </div>
          <div className="border-l-2 border-white/30 pl-4">
            <p className="text-xs uppercase tracking-wider text-mist/45">Temps écoulé</p>
            <p className="mt-1 font-display text-5xl text-white">{formatDuration(elapsed)}</p>
            <p className="mt-1 text-sm text-mist/60">Concentrez-vous sur la solution abonné</p>
          </div>
        </div>
      )}
    </div>
  );
}
