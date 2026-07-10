import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { IncidentStatus, IncidentType, PartnerStatus, PartnerType, Priority, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';
import { distanceKm, estimateEtaMinutes, makeReference } from '../common/geo';
import { PartnersService } from '../partners/partners.service';
import { AssignPartnerDto, CreateIncidentDto, UpdateIncidentStatusDto } from './dto/incident.dto';

function partnerTypeForIncident(type: IncidentType): PartnerType | undefined {
  if (type === IncidentType.TOWING || type === IncidentType.ACCIDENT) return PartnerType.TOWING;
  if (type === IncidentType.MEDICAL) return undefined;
  return PartnerType.MECHANIC;
}

@Injectable()
export class IncidentsService {
  constructor(
    private prisma: PrismaService,
    private partners: PartnersService,
    private audit: AuditService,
  ) {}

  list(filters?: { status?: IncidentStatus; city?: string; reporterId?: string }) {
    return this.prisma.incident.findMany({
      where: {
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.city ? { city: filters.city } : {}),
        ...(filters?.reporterId ? { reporterId: filters.reporterId } : {}),
      },
      include: {
        reporter: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        assignedPartner: { include: { user: { select: { phone: true, firstName: true, lastName: true } } } },
        updates: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string) {
    const incident = await this.prisma.incident.findUnique({
      where: { id },
      include: {
        reporter: { select: { id: true, firstName: true, lastName: true, phone: true, email: true, latitude: true, longitude: true } },
        assignedPartner: { include: { user: { select: { phone: true, firstName: true, lastName: true } } } },
        updates: { orderBy: { createdAt: 'asc' }, include: { author: { select: { firstName: true, lastName: true, role: true } } } },
        medicalPrefinance: true,
        aiSuggestions: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!incident) throw new NotFoundException('Incident introuvable');
    return incident;
  }

  async create(dto: CreateIncidentDto, actorId: string, role: UserRole) {
    const reporterId = role === UserRole.SUBSCRIBER ? actorId : dto.reporterId || actorId;
    const priority =
      dto.priority ??
      (dto.type === IncidentType.ACCIDENT || dto.type === IncidentType.MEDICAL ? Priority.CRITICAL : Priority.NORMAL);

    const incident = await this.prisma.incident.create({
      data: {
        reference: makeReference('INC'),
        type: dto.type,
        status: IncidentStatus.RECEIVED,
        priority,
        description: dto.description,
        latitude: dto.latitude,
        longitude: dto.longitude,
        address: dto.address,
        city: dto.city ?? 'Dakar',
        reporterId,
        updates: {
          create: {
            authorId: actorId,
            status: IncidentStatus.RECEIVED,
            message: 'Demande d’assistance reçue par le centre PNMA',
            latitude: dto.latitude,
            longitude: dto.longitude,
          },
        },
      },
    });

    await this.audit.log({ userId: actorId, action: 'CREATE', entity: 'Incident', entityId: incident.id });

    // Auto-dispatch nearest partner
    return this.autoDispatch(incident.id, actorId);
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
