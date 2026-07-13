import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  IncidentDomain,
  IncidentStatus,
  IncidentType,
  PartnerStatus,
  PartnerType,
  Priority,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';
import { distanceKm, estimateEtaMinutes, makeReference } from '../common/geo';
import { PartnersService } from '../partners/partners.service';
import {
  AddMedicalMeasureDto,
  AddRescueActionDto,
  AssignPartnerDto,
  CreateIncidentDto,
  UpdateIncidentStatusDto,
} from './dto/incident.dto';

function partnerTypeForIncident(type: IncidentType): PartnerType | undefined {
  if (type === IncidentType.TOWING || type === IncidentType.ACCIDENT || type === IncidentType.EVACUATION) {
    return PartnerType.TOWING;
  }
  if (type === IncidentType.MEDICAL || type === IncidentType.RESCUE) return undefined;
  return PartnerType.MECHANIC;
}

function domainForType(type: IncidentType, explicit?: IncidentDomain): IncidentDomain {
  if (explicit) return explicit;
  if (type === IncidentType.RESCUE) return IncidentDomain.SECOURS;
  if (type === IncidentType.MEDICAL) return IncidentDomain.MEDICAL;
  return IncidentDomain.ASSISTANCE;
}

@Injectable()
export class IncidentsService {
  constructor(
    private prisma: PrismaService,
    private partners: PartnersService,
    private audit: AuditService,
  ) {}

  list(filters?: { status?: IncidentStatus; city?: string; reporterId?: string; domain?: IncidentDomain }) {
    return this.prisma.incident.findMany({
      where: {
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.city ? { city: filters.city } : {}),
        ...(filters?.reporterId ? { reporterId: filters.reporterId } : {}),
        ...(filters?.domain ? { domain: filters.domain } : {}),
      },
      include: {
        reporter: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        assignedPartner: { include: { user: { select: { phone: true, firstName: true, lastName: true } } } },
        updates: { orderBy: { createdAt: 'desc' }, take: 5 },
        rescueActions: true,
        medicalMeasures: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string) {
    const incident = await this.prisma.incident.findUnique({
      where: { id },
      include: {
        reporter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            latitude: true,
            longitude: true,
            subscriberProfile: { include: { subscriptions: { include: { offerPlan: true }, where: { status: 'ACTIVE' } } } },
          },
        },
        assignedPartner: { include: { user: { select: { phone: true, firstName: true, lastName: true } } } },
        updates: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { firstName: true, lastName: true, role: true } } },
        },
        medicalPrefinance: true,
        aiSuggestions: { orderBy: { createdAt: 'desc' } },
        rescueActions: true,
        medicalMeasures: true,
        callSessions: { orderBy: { startedAt: 'desc' }, take: 5 },
      },
    });
    if (!incident) throw new NotFoundException('Incident introuvable');
    return incident;
  }

  async create(dto: CreateIncidentDto, actorId: string, role: UserRole) {
    const reporterId = role === UserRole.SUBSCRIBER ? actorId : dto.reporterId || actorId;
    const domain = domainForType(dto.type, dto.domain);
    const priority =
      dto.priority ??
      (dto.type === IncidentType.ACCIDENT ||
      dto.type === IncidentType.MEDICAL ||
      dto.type === IncidentType.RESCUE
        ? Priority.CRITICAL
        : Priority.NORMAL);

    // Panne: si non confirmée, redirection vers autre service
    if (dto.type === IncidentType.BREAKDOWN && dto.confirmedBreakdown === false) {
      const redirected = await this.prisma.incident.create({
        data: {
          reference: makeReference('INC'),
          domain: IncidentDomain.ASSISTANCE,
          type: IncidentType.BREAKDOWN,
          status: IncidentStatus.REDIRECTED,
          priority: Priority.NORMAL,
          description: dto.description || 'Appel sans panne confirmée — redirection service',
          latitude: dto.latitude,
          longitude: dto.longitude,
          address: dto.address,
          city: dto.city ?? 'Dakar',
          region: dto.region ?? dto.city ?? 'Dakar',
          reporterId,
          redirectedService: dto.redirectService || 'Service information / orientation',
          updates: {
            create: {
              authorId: actorId,
              status: IncidentStatus.REDIRECTED,
              message: `Pas de panne confirmée — renvoi vers ${dto.redirectService || 'service approprié'}`,
            },
          },
        },
      });
      return { incident: redirected, dispatch: null, redirected: true };
    }

    // Véhicule de remplacement : vérifier contrat
    let replacementEligible = false;
    if (dto.type === IncidentType.REPLACEMENT_VEHICLE) {
      const profile = await this.prisma.subscriberProfile.findUnique({
        where: { userId: reporterId },
        include: { subscriptions: { where: { status: 'ACTIVE' }, include: { offerPlan: true } } },
      });
      replacementEligible = !!profile?.subscriptions?.[0]?.offerPlan?.replacementVehicleIncluded;
      if (!replacementEligible) {
        throw new BadRequestException(
          'Véhicule de remplacement non inclus dans le contrat d’abonnement (rubrique fermée)',
        );
      }
    }

    const incident = await this.prisma.incident.create({
      data: {
        reference: makeReference('INC'),
        domain,
        type: dto.type,
        status: IncidentStatus.RECEIVED,
        priority,
        description: dto.description,
        latitude: dto.latitude,
        longitude: dto.longitude,
        address: dto.address,
        city: dto.city ?? 'Dakar',
        region: dto.region ?? dto.city ?? 'Dakar',
        reporterId,
        replacementEligible,
        updates: {
          create: {
            authorId: actorId,
            status: IncidentStatus.RECEIVED,
            message: `Demande ${domain} reçue par le centre PNMA`,
            latitude: dto.latitude,
            longitude: dto.longitude,
          },
        },
      },
    });

    await this.audit.log({ userId: actorId, action: 'CREATE', entity: 'Incident', entityId: incident.id });

    if (domain === IncidentDomain.SECOURS || domain === IncidentDomain.MEDICAL) {
      return { incident: await this.get(incident.id), dispatch: null };
    }

    return this.autoDispatch(incident.id, actorId);
  }

  async addRescueAction(incidentId: string, dto: AddRescueActionDto) {
    await this.get(incidentId);
    return this.prisma.incidentRescueAction.create({
      data: {
        incidentId,
        category: dto.category,
        action: dto.action,
        notes: dto.notes,
        completed: dto.completed ?? false,
      },
    });
  }

  async addMedicalMeasure(incidentId: string, dto: AddMedicalMeasureDto) {
    await this.get(incidentId);
    return this.prisma.incidentMedicalMeasure.create({
      data: {
        incidentId,
        measure: dto.measure,
        notes: dto.notes,
        completed: dto.completed ?? false,
      },
    });
  }

  async autoDispatch(incidentId: string, actorId?: string) {
    const incident = await this.get(incidentId);
    if (incident.status === IncidentStatus.RESOLVED || incident.status === IncidentStatus.CANCELLED) {
      throw new BadRequestException('Incident déjà clôturé');
    }

    const type = partnerTypeForIncident(incident.type);
    const nearest = await this.partners.findNearest(incident.latitude, incident.longitude, type, true);

    if (!nearest.nearest) {
      const updated = await this.prisma.incident.update({
        where: { id: incidentId },
        data: {
          status: IncidentStatus.DISPATCHING,
          updates: {
            create: {
              authorId: actorId,
              status: IncidentStatus.DISPATCHING,
              message: 'Aucun partenaire disponible dans le rayon — recherche élargie en cours',
            },
          },
        },
        include: {
          reporter: { select: { id: true, firstName: true, lastName: true, phone: true } },
          assignedPartner: true,
          updates: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
      });
      return { incident: updated, dispatch: nearest };
    }

    const partner = nearest.nearest;
    const eta = estimateEtaMinutes(partner.distanceKm);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.partnerProfile.update({
        where: { id: partner.id },
        data: { status: PartnerStatus.BUSY },
      });
      return tx.incident.update({
        where: { id: incidentId },
        data: {
          status: IncidentStatus.ASSIGNED,
          assignedPartnerId: partner.id,
          distanceKm: partner.distanceKm,
          estimatedEtaMin: eta,
          updates: {
            create: {
              authorId: actorId,
              status: IncidentStatus.ASSIGNED,
              message: `Partenaire assigné automatiquement : ${partner.businessName} (${partner.distanceKm} km, ETA ~${eta} min)`,
            },
          },
        },
        include: {
          reporter: { select: { id: true, firstName: true, lastName: true, phone: true } },
          assignedPartner: { include: { user: { select: { phone: true, firstName: true, lastName: true } } } },
          updates: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
      });
    });

    await this.audit.log({
      userId: actorId,
      action: 'DISPATCH',
      entity: 'Incident',
      entityId: incidentId,
      meta: { partnerId: partner.id, distanceKm: partner.distanceKm, eta },
    });

    return { incident: updated, dispatch: nearest };
  }

  async assign(incidentId: string, dto: AssignPartnerDto, actorId: string) {
    const incident = await this.get(incidentId);
    const partner = await this.prisma.partnerProfile.findUnique({ where: { id: dto.partnerId } });
    if (!partner) throw new NotFoundException('Partenaire introuvable');

    const dist = distanceKm(incident.latitude, incident.longitude, partner.latitude, partner.longitude);
    const eta = estimateEtaMinutes(dist);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (incident.assignedPartnerId && incident.assignedPartnerId !== partner.id) {
        await tx.partnerProfile.update({
          where: { id: incident.assignedPartnerId },
          data: { status: PartnerStatus.AVAILABLE },
        });
      }
      await tx.partnerProfile.update({ where: { id: partner.id }, data: { status: PartnerStatus.BUSY } });
      return tx.incident.update({
        where: { id: incidentId },
        data: {
          assignedPartnerId: partner.id,
          status: IncidentStatus.ASSIGNED,
          distanceKm: Math.round(dist * 10) / 10,
          estimatedEtaMin: eta,
          updates: {
            create: {
              authorId: actorId,
              status: IncidentStatus.ASSIGNED,
              message: dto.message || `Partenaire assigné manuellement : ${partner.businessName}`,
            },
          },
        },
        include: {
          assignedPartner: true,
          updates: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
      });
    });

    await this.audit.log({ userId: actorId, action: 'ASSIGN', entity: 'Incident', entityId: incidentId });
    return updated;
  }

  async updateStatus(incidentId: string, dto: UpdateIncidentStatusDto, actorId: string) {
    const incident = await this.get(incidentId);
    const data: Record<string, unknown> = {
      status: dto.status,
      updates: {
        create: {
          authorId: actorId,
          status: dto.status,
          message: dto.message || `Statut mis à jour : ${dto.status}`,
          latitude: dto.latitude,
          longitude: dto.longitude,
        },
      },
    };
    if (dto.status === IncidentStatus.RESOLVED) {
      data.resolvedAt = new Date();
      if (incident.assignedPartnerId) {
        await this.prisma.partnerProfile.update({
          where: { id: incident.assignedPartnerId },
          data: { status: PartnerStatus.AVAILABLE },
        });
      }
    }
    if (dto.status === IncidentStatus.CANCELLED && incident.assignedPartnerId) {
      await this.prisma.partnerProfile.update({
        where: { id: incident.assignedPartnerId },
        data: { status: PartnerStatus.AVAILABLE },
      });
    }

    return this.prisma.incident.update({
      where: { id: incidentId },
      data,
      include: {
        assignedPartner: true,
        updates: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
  }
}
