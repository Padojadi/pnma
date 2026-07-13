import { Injectable, NotFoundException } from '@nestjs/common';
import { InsuranceContractStatus } from '@prisma/client';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { makeReference } from '../common/geo';

export class CreateInsuranceDto {
  @IsString()
  subscriberId!: string;

  @IsString()
  insurerId!: string;

  @IsString()
  vehiclePlate!: string;

  @IsString()
  coverageType!: string;

  @IsInt()
  @Min(1000)
  annualPremiumFcfa!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

@Injectable()
export class InsuranceService {
  constructor(private prisma: PrismaService) {}

  listInsurers() {
    return this.prisma.insurancePartner.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
  }

  listContracts(subscriberId?: string) {
    return this.prisma.insuranceContract.findMany({
      where: subscriberId ? { subscriberId } : undefined,
      include: {
        insurer: true,
        subscriber: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createContract(dto: CreateInsuranceDto) {
    const subscriber = await this.prisma.subscriberProfile.findUnique({ where: { id: dto.subscriberId } });
    if (!subscriber) throw new NotFoundException('Abonné introuvable');
    const insurer = await this.prisma.insurancePartner.findUnique({ where: { id: dto.insurerId } });
    if (!insurer) throw new NotFoundException('Assureur introuvable');

    return this.prisma.insuranceContract.create({
      data: {
        reference: makeReference('ASS'),
        subscriberId: dto.subscriberId,
        insurerId: dto.insurerId,
        vehiclePlate: dto.vehiclePlate,
        coverageType: dto.coverageType,
        annualPremiumFcfa: dto.annualPremiumFcfa,
        status: InsuranceContractStatus.ACTIVE,
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        notes: dto.notes,
        negotiatedByPnma: true,
      },
      include: { insurer: true, subscriber: true },
    });
  }
}
