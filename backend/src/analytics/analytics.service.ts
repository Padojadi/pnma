import { Injectable } from '@nestjs/common';
import { IncidentDomain, IncidentStatus, IncidentType, MedicalPrefinanceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async dashboard(region?: string) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthStart = new Date(year, month - 1, 1);
    const yearStart = new Date(year, 0, 1);

    const [
      subscribers,
      partners,
      incidents,
      openIncidents,
      resolvedIncidents,
      medicalTotal,
      medicalDisbursed,
      activeSubscriptions,
      insuranceContracts,
      trainings,
      byType,
      byCity,
      byStatus,
      byDomain,
      recentIncidents,
      subscribersByRegion,
      medicalByRegion,
      exceededCalls,
      openCalls,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: 'SUBSCRIBER', active: true } }),
      this.prisma.partnerProfile.count({ where: { active: true } }),
      this.prisma.incident.count(),
      this.prisma.incident.count({
        where: {
          status: {
            in: [
              IncidentStatus.RECEIVED,
              IncidentStatus.DISPATCHING,
              IncidentStatus.ASSIGNED,
              IncidentStatus.EN_ROUTE,
              IncidentStatus.ON_SITE,
            ],
          },
        },
      }),
      this.prisma.incident.count({ where: { status: IncidentStatus.RESOLVED } }),
      this.prisma.medicalPrefinance.aggregate({ _sum: { amountFcfa: true }, _count: true }),
      this.prisma.medicalPrefinance.aggregate({
        where: { status: { in: [MedicalPrefinanceStatus.DISBURSED, MedicalPrefinanceStatus.APPROVED] } },
        _sum: { amountFcfa: true },
      }),
      this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.insuranceContract.count({ where: { status: 'ACTIVE' } }),
      this.prisma.trainingSession.count(),
      this.prisma.incident.groupBy({ by: ['type'], _count: true }),
      this.prisma.incident.groupBy({ by: ['city'], _count: true }),
      this.prisma.incident.groupBy({ by: ['status'], _count: true }),
      this.prisma.incident.groupBy({ by: ['domain'], _count: true }),
      this.prisma.incident.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: { select: { firstName: true, lastName: true } },
          assignedPartner: { select: { businessName: true } },
        },
      }),
      this.prisma.subscriberProfile.groupBy({ by: ['region'], _count: true }),
      this.prisma.medicalPrefinance.groupBy({
        by: ['region'],
        _sum: { amountFcfa: true },
        _count: true,
      }),
      this.prisma.callSession.count({ where: { exceeded: true, status: 'OPEN' } }),
      this.prisma.callSession.count({ where: { status: 'OPEN' } }),
    ]);

    const resolvedWithEta = await this.prisma.incident.findMany({
      where: { status: IncidentStatus.RESOLVED, estimatedEtaMin: { not: null } },
      select: { estimatedEtaMin: true, createdAt: true, resolvedAt: true },
    });

    const avgEta =
      resolvedWithEta.length > 0
        ? Math.round(resolvedWithEta.reduce((s, i) => s + (i.estimatedEtaMin || 0), 0) / resolvedWithEta.length)
        : 0;

    const avgResolutionMin =
      resolvedWithEta.filter((i) => i.resolvedAt).length > 0
        ? Math.round(
            resolvedWithEta
              .filter((i) => i.resolvedAt)
              .reduce((s, i) => s + (i.resolvedAt!.getTime() - i.createdAt.getTime()) / 60000, 0) /
              resolvedWithEta.filter((i) => i.resolvedAt).length,
          )
        : 0;

    const fluxMedical = await this.fluxMedical(region);

    const localNational = {
      subscribersByRegion: subscribersByRegion.map((r) => ({
        region: r.region || 'Non renseigné',
        count: r._count,
        shareNationalPct: subscribers ? Math.round((r._count / subscribers) * 1000) / 10 : 0,
      })),
      medicalByRegion: medicalByRegion.map((r) => ({
        region: r.region || 'National / N.R.',
        cases: r._count,
        amountFcfa: r._sum.amountFcfa ?? 0,
        shareNationalPct:
          medicalTotal._count > 0 ? Math.round((r._count / medicalTotal._count) * 1000) / 10 : 0,
      })),
      narrative: this.buildNarrative(subscribers, subscribersByRegion, medicalTotal._count, medicalByRegion),
    };

    return {
      kpis: {
        subscribers,
        partners,
        incidents,
        openIncidents,
        resolvedIncidents,
        resolutionRate: incidents ? Math.round((resolvedIncidents / incidents) * 100) : 0,
        avgEtaMin: avgEta,
        avgResolutionMin,
        medicalRequests: medicalTotal._count,
        medicalFluxFcfa: medicalTotal._sum.amountFcfa ?? 0,
        medicalVolumeFcfa: medicalTotal._sum.amountFcfa ?? 0,
        medicalApprovedFcfa: medicalDisbursed._sum.amountFcfa ?? 0,
        activeSubscriptions,
        insuranceContracts,
        trainings,
        openCalls,
        exceededCalls,
      },
      fluxMedical,
      localNational,
      byType,
      byCity,
      byStatus,
      byDomain,
      recentIncidents,
      period: { year, month, monthStart, yearStart },
      growthTargets: [
        { year: 1, subscribers: 500, coverage: ['Dakar', 'Thiès'] },
        { year: 2, subscribers: 5000, coverage: ['Diourbel'] },
        { year: 3, subscribers: 10000, coverage: ['Saint-Louis'] },
        { year: 4, subscribers: 50000, coverage: ['Kaolack', 'Fatick', 'Ziguinchor'] },
        { year: 5, subscribers: 100000, coverage: ['National'] },
      ],
      incidentCatalog: this.incidentCatalog(),
    };
  }

  async fluxMedical(region?: string) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthStart = new Date(year, month - 1, 1);
    const yearStart = new Date(year, 0, 1);

    const regionFilter = region ? { region } : {};

    const [monthFlux, yearFlux, monthCases, yearCases, monthObj, yearObj, nationalSubs, regionalSubs] =
      await Promise.all([
        this.prisma.medicalPrefinance.aggregate({
          where: { createdAt: { gte: monthStart }, ...regionFilter },
          _sum: { amountFcfa: true },
          _count: true,
        }),
        this.prisma.medicalPrefinance.aggregate({
          where: { createdAt: { gte: yearStart }, ...regionFilter },
          _sum: { amountFcfa: true },
          _count: true,
        }),
        this.prisma.incident.count({
          where: {
            domain: IncidentDomain.MEDICAL,
            createdAt: { gte: monthStart },
            ...(region ? { region } : {}),
          },
        }),
        this.prisma.incident.count({
          where: {
            OR: [{ domain: IncidentDomain.MEDICAL }, { type: IncidentType.MEDICAL }],
            createdAt: { gte: yearStart },
            ...(region ? { region } : {}),
          },
        }),
        this.prisma.medicalBudgetConfig.findFirst({
          where: { year, month, region: region || null, active: true },
        }),
        this.prisma.medicalBudgetConfig.findFirst({
          where: { year, month: null, region: region || null, active: true },
        }),
        this.prisma.subscriberProfile.count(),
        region
          ? this.prisma.subscriberProfile.count({ where: { region } })
          : this.prisma.subscriberProfile.count(),
      ]);

    // Fallback objectives if none configured
    const monthlyObjective = monthObj?.objectiveFcfa ?? 5_000_000;
    const annualObjective = yearObj?.objectiveFcfa ?? 50_000_000;
    const monthAmount = monthFlux._sum.amountFcfa ?? 0;
    const yearAmount = yearFlux._sum.amountFcfa ?? 0;

    const casesRegional = region
      ? await this.prisma.medicalPrefinance.count({
          where: { createdAt: { gte: monthStart }, region },
        })
      : monthFlux._count;

    return {
      label: 'Flux médical',
      month: {
        amountFcfa: monthAmount,
        objectiveFcfa: monthlyObjective,
        pctOfObjective: monthlyObjective
          ? Math.round((monthAmount / monthlyObjective) * 1000) / 10
          : 0,
        cases: monthFlux._count,
        remainingFcfa: Math.max(0, monthlyObjective - monthAmount),
      },
      year: {
        amountFcfa: yearAmount,
        objectiveFcfa: annualObjective,
        pctOfObjective: annualObjective ? Math.round((yearAmount / annualObjective) * 1000) / 10 : 0,
        cases: yearFlux._count,
        remainingFcfa: Math.max(0, annualObjective - yearAmount),
      },
      incidence: {
        regionalCases: casesRegional,
        regionalSubscribers: regionalSubs,
        regionalRatePct: regionalSubs ? Math.round((casesRegional / regionalSubs) * 10000) / 100 : 0,
        nationalCases: monthFlux._count,
        nationalSubscribers: nationalSubs,
        nationalRatePct: nationalSubs ? Math.round((monthFlux._count / nationalSubs) * 10000) / 100 : 0,
        yearMedicalIncidents: yearCases,
        monthMedicalIncidents: monthCases,
      },
      narrative: this.fluxNarrative(monthAmount, monthlyObjective, casesRegional, regionalSubs, nationalSubs),
      region: region || 'National',
    };
  }

  private fluxNarrative(
    amount: number,
    objective: number,
    regionalCases: number,
    regionalSubs: number,
    nationalSubs: number,
  ) {
    const pct = objective ? Math.round((amount / objective) * 100) : 0;
    const pressure =
      pct >= 90 ? 'pression budgétaire critique' : pct >= 70 ? 'vigilance budgétaire' : 'consommation maîtrisée';
    return `Le flux médical du mois représente ${pct}% de l’objectif d’engagement (${amount.toLocaleString('fr-FR')} / ${objective.toLocaleString('fr-FR')} FCFA) — ${pressure}. ${regionalCases} cas médicaux pour ${regionalSubs} abonnés locaux (${nationalSubs} au national).`;
  }

  private buildNarrative(
    nationalSubs: number,
    byRegion: Array<{ region: string | null; _count: number }>,
    medicalCases: number,
    medicalByRegion: Array<{ region: string | null; _count: number; _sum: { amountFcfa: number | null } }>,
  ) {
    const top = [...byRegion].sort((a, b) => b._count - a._count)[0];
    const topMed = [...medicalByRegion].sort((a, b) => b._count - a._count)[0];
    return `Répartition nationale : ${nationalSubs} abonnés actifs. Concentration principale : ${top?.region || 'N/A'} (${top?._count || 0} abonnés). Cas médicaux : ${medicalCases}, hotspot : ${topMed?.region || 'N/A'}.`;
  }

  incidentCatalog() {
    return {
      domains: [
        {
          domain: 'ASSISTANCE',
          label: 'Traitement des incidents',
          rubrics: [
            {
              type: 'BREAKDOWN',
              label: 'Panne de véhicule',
              description:
                'Déclenchement du droit d’appeler. Si pas de panne, renvoyer vers un service plus approprié.',
              requiresBreakdown: true,
            },
            {
              type: 'REMOTE_DIAGNOSIS',
              label: 'Diagnostic à distance',
              description: 'Analyse téléphonique / numérique pour orienter la prestation.',
            },
            {
              type: 'ON_SITE_REPAIR',
              label: 'Dépannage sur site',
              description: 'Intervention d’un mécanicien partenaire sur le lieu de l’incident.',
            },
            {
              type: 'EVACUATION',
              label: 'Évacuation',
              description: 'Éloignement du lieu d’incident et prise en charge jusqu’à destination.',
            },
            {
              type: 'REPLACEMENT_VEHICLE',
              label: 'Véhicule de remplacement',
              description: 'Accessible uniquement si inclus dans le contrat d’abonnement.',
              conditional: true,
            },
          ],
        },
        {
          domain: 'SECOURS',
          label: 'Secours',
          rubrics: [
            {
              category: 'ALERT_SERVICES',
              label: 'Alerte des services de secours',
              actions: [
                { code: 'FIREFIGHTERS', label: 'Sapeurs-pompiers' },
                { code: 'GENDARMERIE_POLICE', label: 'Gendarmerie / Police' },
                { code: 'OTHER_HOMOLOGATED', label: 'Unité homologuée (SAMU, Croix-Rouge, etc.)' },
              ],
            },
            {
              category: 'ONSITE_EMERGENCY',
              label: 'Intervention d’urgence sur site',
              actions: [
                { code: 'ZONE_SECURE', label: 'Sécurisation de la zone' },
                { code: 'ALERT_PNMA', label: 'Alerte des secours ou appel PNMA' },
                { code: 'FIRST_AID', label: 'Gestes de premier secours' },
                { code: 'PERSON_SECURE_EVAC', label: 'Sécurisation des personnes et évacuation d’urgence' },
              ],
            },
          ],
        },
        {
          domain: 'MEDICAL',
          label: 'Médical',
          rubrics: [
            { code: 'HEALTH_REFERRAL', label: 'Référencement vers structure de santé appropriée' },
            { code: 'ACTIVATE_HEALTH_FOCAL', label: 'Activation du point focal santé' },
            { code: 'FORWARD_FOLLOWUP_UNIT', label: 'Renvoi à l’unité de suivi PNMA' },
            { code: 'HOSPITAL_CARE_PLAN', label: 'Mesures de prise en charge hospitalière' },
            { code: 'TRANSFER_FINANCE', label: 'Transfert vers le Service financier' },
            { code: 'ACTIVATE_INSURER_FOCAL', label: 'Activation du point focal assureur' },
            { code: 'PNMA_FINANCIAL_ENGAGEMENT', label: 'Engagement financier PNMA' },
            { code: 'INSURER_FOLLOWUP', label: 'Suivi du dossier auprès de l’assureur' },
            { code: 'RECOVERY_ACTIVATION', label: 'Activation des mesures de recouvrement' },
          ],
        },
      ],
    };
  }
}
