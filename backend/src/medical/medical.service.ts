import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MedicalPrefinanceStatus, OfferLevel } from '@prisma/client';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';
import { makeReference } from '../common/geo';

export class CreateMedicalDto {
  @IsOptional()
  @IsString()
  incidentId?: string;

  @IsInt()
  @Min(1000)
  amountFcfa!: number;

  @IsOptional()
  @IsString()
  hospitalName?: string;

  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

@Injectable()
export class MedicalService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  list(status?: MedicalPrefinanceStatus) {
    return this.prisma.medicalPrefinance.findMany({
      where: status ? { status } : undefined,
      include: {
        requester: { select: { firstName: true, lastName: true, email: true, phone: true } },
        approver: { select: { firstName: true, lastName: true } },
        incident: { select: { reference: true, type: true, city: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateMedicalDto, requesterId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: requesterId },
      include: {
        subscriberProfile: {
          include: { subscriptions: { where: { status: 'ACTIVE' }, include: { offerPlan: true } } },
        },
      },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const plan = user.subscriberProfile?.subscriptions[0]?.offerPlan;
    const ceiling = plan?.medicalCeilingFcfa ?? 200000;

    if (dto.amountFcfa > ceiling) {
      throw new BadRequestException(`Montant supérieur au plafond d’offre (${ceiling.toLocaleString('fr-FR')} FCFA)`);
    }

    const record = await this.prisma.medicalPrefinance.create({
      data: {
        reference: makeReference('MED'),
        incidentId: dto.incidentId,
        requesterId,
        amountFcfa: dto.amountFcfa,
        ceilingFcfa: ceiling,
        hospitalName: dto.hospitalName,
        diagnosis: dto.diagnosis,
        notes: dto.notes,
        status: MedicalPrefinanceStatus.REQUESTED,
      },
    });

    await this.audit.log({ userId: requesterId, action: 'CREATE', entity: 'MedicalPrefinance', entityId: record.id });
    return record;
  }

  async decide(id: string, approve: boolean, approverId: string, notes?: string) {
    const existing = await this.prisma.medicalPrefinance.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Demande introuvable');
    if (existing.status !== MedicalPrefinanceStatus.REQUESTED) {
      throw new BadRequestException('Demande déjà traitée');
    }

    const updated = await this.prisma.medicalPrefinance.update({
      where: { id },
      data: {
        status: approve ? MedicalPrefinanceStatus.APPROVED : MedicalPrefinanceStatus.REJECTED,
        approverId,
        notes: notes ?? existing.notes,
      },
    });

    await this.audit.log({
      userId: approverId,
      action: approve ? 'APPROVE' : 'REJECT',
      entity: 'MedicalPrefinance',
      entityId: id,
    });
    return updated;
  }

  async disburse(id: string, actorId: string) {
    const existing = await this.prisma.medicalPrefinance.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Demande introuvable');
    if (existing.status !== MedicalPrefinanceStatus.APPROVED) {
      throw new BadRequestException('La demande doit être approuvée avant décaissement');
    }
    return this.prisma.medicalPrefinance.update({
      where: { id },
      data: { status: MedicalPrefinanceStatus.DISBURSED },
    });
  }

  offerCeiling(level: OfferLevel) {
    return level === OfferLevel.NIVEAU_2 ? 500000 : 200000;
  }
}
