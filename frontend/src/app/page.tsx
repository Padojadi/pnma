'use client';

import Link from 'next/link';
import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import { useEffect, useState } from 'react';
import { api, formatFcfa, type OfferPlan, type Partner } from '@/lib/api';

export default function HomePage() {
  const [offers, setOffers] = useState<OfferPlan[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);

  useEffect(() => {
    api.offers().then(setOffers).catch(() => undefined);
    api.partners().then(setPartners).catch(() => undefined);
  }, []);

  return (
    <main>
      <SiteHeader />

      <section className="relative min-h-screen overflow-hidden bg-road-glow">
        <div className="pointer-events-none absolute inset-0 bg-asphalt opacity-80" />
        <div className="pointer-events-none absolute inset-x-0 bottom-24 h-px">
          <div className="road-line mx-auto w-4/5 animate-pulse-line" />
        </div>
        <div className="pointer-events-none absolute inset-y-1/3 left-0 h-24 w-full overflow-hidden opacity-30">
          <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-signal-500/40 to-transparent animate-sweep" />
        </div>

        <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-5 pb-24 pt-28">
          <p className="animate-rise font-display text-6xl font-bold tracking-wide text-white md:text-8xl">PNMA</p>
          <h1 className="animate-rise-delay mt-4 max-w-2xl font-display text-3xl font-semibold uppercase leading-tight text-mist md:text-5xl">
            L’assistance routière, orchestrée.
          </h1>
          <p className="animate-rise-delay-2 mt-5 max-w-xl text-base text-mist/75 md:text-lg">
            Un interlocuteur unique 24/7 pour dépannage, remorquage, préfinancement médical et coordination
            d’assurance au Sénégal.
          </p>
          <div className="animate-rise-delay-2 mt-8 flex flex-wrap gap-3">
            <Link
              href="/assistance"
              className="rounded-sm bg-signal-500 px-6 py-3 font-semibold text-night-950 transition hover:bg-signal-400"
            >
              Demander une assistance
            </Link>
            <Link
              href="/connexion"
              className="rounded-sm border border-white/25 px-6 py-3 font-semibold text-white transition hover:border-signal-400 hover:text-signal-400"
            >
              Espace abonné
            </Link>
          </div>
        </div>
      </section>

      <section id="services" className="bg-night-900 px-5 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-4xl uppercase text-white md:text-5xl">Une plateforme, tous les services</h2>
          <p className="mt-3 max-w-2xl text-mist/70">
            PNMA n’est ni un assureur, ni un garage : c’est l’orchestrateur qui coordonne assistance, mobilité et
            protection.
          </p>
          <div className="mt-12 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            {[
              ['Assistance 24/7', 'Centre d’appel national et prise en charge immédiate.'],
              ['Réseau partenaires', 'Mécaniciens et remorqueurs géolocalisés, assignés automatiquement.'],
              ['Préfinancement médical', 'Urgence plafonnée selon l’offre, validée en quelques minutes.'],
              ['Assurance & prévention', 'Négociation de contrats auto et formations premiers secours.'],
            ].map(([title, text]) => (
              <div key={title}>
                <div className="mb-3 h-1 w-10 bg-signal-500" />
                <h3 className="font-display text-2xl uppercase text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mist/65">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="offres" className="bg-night-950 px-5 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-4xl uppercase text-white md:text-5xl">Offres d’abonnement</h2>
          <p className="mt-3 max-w-xl text-mist/70">Particuliers et entreprises — couverture progressive Dakar & Thiès.</p>
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            {offers.map((offer) => (
              <div key={offer.id} className="border border-white/10 bg-night-800/40 p-8">
                <p className="font-display text-sm uppercase tracking-[0.2em] text-signal-400">{offer.level.replace('_', ' ')}</p>
                <h3 className="mt-2 font-display text-3xl uppercase text-white">{offer.name}</h3>
                <p className="mt-4 font-display text-4xl text-signal-400">{formatFcfa(offer.annualPriceFcfa)}
                  <span className="ml-2 text-base text-mist/50">/ an</span>
                </p>
                <p className="mt-4 text-sm text-mist/70">{offer.description}</p>
                <ul className="mt-6 space-y-2 text-sm text-mist/80">
                  <li>Plafond médical : {formatFcfa(offer.medicalCeilingFcfa)}</li>
                  {offer.priorityIntervention && <li>Priorité d’intervention</li>}
                  {offer.premiumAssistance && <li>Assistance premium</li>}
                  {offer.adminSupport && <li>Accompagnement administratif</li>}
                </ul>
              </div>
            ))}
            {!offers.length && (
              <>
                <div className="border border-white/10 p-8 text-mist/60">Offre Niveau 1 — 75 000 FCFA / an</div>
                <div className="border border-white/10 p-8 text-mist/60">Offre Niveau 2 — 150 000 FCFA / an</div>
              </>
            )}
          </div>
        </div>
      </section>

      <section id="reseau" className="bg-night-900 px-5 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-4xl uppercase text-white">Réseau Année 1</h2>
          <p className="mt-3 text-mist/70">Dakar et Thiès — extension nationale progressive.</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {partners.slice(0, 4).map((p) => (
              <div key={p.id} className="border-l-2 border-signal-500 pl-4">
                <p className="font-semibold text-white">{p.businessName}</p>
                <p className="text-sm text-mist/60">
                  {p.city} · {p.type}
                </p>
              </div>
            ))}
            {!partners.length && <p className="text-mist/50">Réseau en cours de chargement…</p>}
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
