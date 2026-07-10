import { Injectable, NotFoundException } from '@nestjs/common';
import { IncidentType, PartnerStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PartnersService } from '../partners/partners.service';
import { distanceKm, estimateEtaMinutes } from '../common/geo';

@Injectable()
export class AiService {
  constructor(
    private prisma: PrismaService,
    private partners: PartnersService,
  ) {}

  async optimizeIncident(incidentId: string) {
    const incident = await this.prisma.incident.findUnique({ where: { id: incidentId } });
    if (!incident) throw new NotFoundException('Incident introuvable');

    const typeHint =
      incident.type === IncidentType.TOWING || incident.type === IncidentType.ACCIDENT
        ? 'TOWING'
        : incident.type === IncidentType.MEDICAL
          ? 'MEDICAL'
          : 'MECHANIC';

    const nearest = await this.partners.findNearest(
      incident.latitude,
      incident.longitude,
      typeHint === 'TOWING' ? 'TOWING' : typeHint === 'MECHANIC' ? 'MECHANIC' : undefined,
      true,
    );

    const openLoad = await this.prisma.incident.groupBy({
      by: ['assignedPartnerId'],
      where: {
        status: { in: ['ASSIGNED', 'EN_ROUTE', 'ON_SITE'] },
        assignedPartnerId: { not: null },
      },
      _count: true,
    });
    const loadMap = Object.fromEntries(openLoad.map((l) => [l.assignedPartnerId!, l._count]));

    const scored = (nearest.candidates || []).map((c) => {
      const load = loadMap[c.id] || 0;
      const score = Math.max(0, 100 - c.distanceKm * 4 - load * 12 + c.rating * 4);
      return {
        partnerId: c.id,
        businessName: c.businessName,
        distanceKm: c.distanceKm,
        rating: c.rating,
        openJobs: load,
        etaMin: estimateEtaMinutes(c.distanceKm),
        score: Math.round(score * 10) / 10,
      };
    });

    const priorityAdvice =
      incident.type === IncidentType.ACCIDENT || incident.type === IncidentType.MEDICAL
        ? 'Priorité critique : mobiliser remorquage + alerte médicale si blessés.'
        : incident.priority === 'HIGH'
          ? 'Priorité haute : confirmer ETA < 25 min.'
          : 'Priorité normale : optimiser le partenaire le plus proche disponible.';

    const payload = {
      recommendation: scored[0] || null,
      alternatives: scored.slice(1, 4),
      priorityAdvice,
      suggestedActions: [
        'Confirmer la géolocalisation de l’abonné',
        'Notifier le partenaire sélectionné',
        'Ouvrir un canal centre d’appel unique',
        incident.type === IncidentType.ACCIDENT ? 'Évaluer un préfinancement médical' : 'Suivre l’intervention en temps réel',
      ],
      model: 'pnma-dispatch-heuristic-v1',
    };

    const suggestion = await this.prisma.aiSuggestion.create({
      data: {
        incidentId,
        kind: 'DISPATCH_OPTIMIZATION',
        payload,
        score: scored[0]?.score ?? 0,
      },
    });

    return suggestion;
  }

  async networkInsights() {
    const partners = await this.prisma.partnerProfile.findMany({ where: { active: true } });
    const available = partners.filter((p) => p.status === PartnerStatus.AVAILABLE).length;
    const busy = partners.filter((p) => p.status === PartnerStatus.BUSY).length;
    const offline = partners.filter((p) => p.status === PartnerStatus.OFFLINE).length;

    const cities = ['Dakar', 'Thiès'];
    const coverage = cities.map((city) => {
      const local = partners.filter((p) => p.city === city);
      return {
        city,
        partners: local.length,
        available: local.filter((p) => p.status === PartnerStatus.AVAILABLE).length,
        avgCoverageKm: local.length
          ? Math.round(local.reduce((s, p) => s + p.coverageKm, 0) / local.length)
          : 0,
      };
    });

    const hotspots = await this.prisma.incident.groupBy({
      by: ['city'],
      _count: true,
      orderBy: { _count: { city: 'desc' } },
      take: 5,
    });

    const payload = {
      network: { total: partners.length, available, busy, offline },
      coverage,
      hotspots,
      recommendations: [
        available / Math.max(partners.length, 1) < 0.4
          ? 'Taux de disponibilité bas : activer des partenaires en réserve à Dakar.'
          : 'Couverture partenaires saine pour la zone Année 1.',
        hotspots[0]
          ? `Hotspot incidents : ${hotspots[0].city} — renforcer le dispatch local.`
          : 'Pas encore assez d’historique pour les hotspots.',
        'Utiliser l’auto-dispatch IA sur chaque nouvel incident pour réduire le temps de prise en charge.',
      ],
      model: 'pnma-network-optimizer-v1',
    };

    return this.prisma.aiSuggestion.create({
      data: { kind: 'NETWORK_INSIGHTS', payload, score: available },
    });
  }

  recent(limit = 20) {
    return this.prisma.aiSuggestion.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { incident: { select: { reference: true, type: true, city: true } } },
    });
  }
}
