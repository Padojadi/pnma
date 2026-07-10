import { Injectable } from '@nestjs/common';
import { IncidentStatus, MedicalPrefinanceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async dashboard() {
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
      recentIncidents,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: 'SUBSCRIBER', active: true } }),
      this.prisma.partnerProfile.count({ where: { active: true } }),
      this.prisma.incident.count(),
      this.prisma.incident.count({
        where: { status: { in: [IncidentStatus.RECEIVED, IncidentStatus.DISPATCHING, IncidentStatus.ASSIGNED, IncidentStatus.EN_ROUTE, IncidentStatus.ON_SITE] } },
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
      this.prisma.incident.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: { select: { firstName: true, lastName: true } },
          assignedPartner: { select: { businessName: true } },
        },
      }),
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
        medicalVolumeFcfa: medicalTotal._sum.amountFcfa ?? 0,
        medicalApprovedFcfa: medicalDisbursed._sum.amountFcfa ?? 0,
        activeSubscriptions,
        insuranceContracts,
        trainings,
      },
      byType,
      byCity,
      byStatus,
      recentIncidents,
      growthTargets: [
        { year: 1, subscribers: 500, coverage: ['Dakar', 'Thiès'] },
        { year: 2, subscribers: 5000, coverage: ['Diourbel'] },
        { year: 3, subscribers: 10000, coverage: ['Saint-Louis'] },
        { year: 4, subscribers: 50000, coverage: ['Kaolack', 'Fatick', 'Ziguinchor'] },
        { year: 5, subscribers: 100000, coverage: ['National'] },
      ],
    };
  }
}
