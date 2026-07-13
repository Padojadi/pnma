import { Injectable, NotFoundException } from '@nestjs/common';
import { PartnerStatus, PartnerType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { distanceKm } from '../common/geo';
import { CreatePartnerDto } from './dto/partner.dto';

@Injectable()
export class PartnersService {
  constructor(private prisma: PrismaService) {}

  list(city?: string, type?: PartnerType) {
    return this.prisma.partnerProfile.findMany({
      where: {
        active: true,
        ...(city ? { city } : {}),
        ...(type ? { type: type === PartnerType.BOTH ? undefined : { in: [type, PartnerType.BOTH] } } : {}),
      },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } } },
      orderBy: { rating: 'desc' },
    });
  }

  async create(dto: CreatePartnerDto) {
    const password = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        password,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: UserRole.PARTNER,
        latitude: dto.latitude,
        longitude: dto.longitude,
        lastLocationAt: new Date(),
        partnerProfile: {
          create: {
            businessName: dto.businessName,
            type: dto.type,
            city: dto.city,
            address: dto.address,
            latitude: dto.latitude,
            longitude: dto.longitude,
            coverageKm: dto.coverageKm ?? 30,
            specialties: dto.specialties ?? [],
            phone: dto.phone,
            status: PartnerStatus.AVAILABLE,
          },
        },
      },
      include: { partnerProfile: true },
    });
    const { password: _, ...safe } = user;
    return safe;
  }

  async updateStatus(partnerId: string, status: PartnerStatus) {
    const partner = await this.prisma.partnerProfile.findUnique({ where: { id: partnerId } });
    if (!partner) throw new NotFoundException('Partenaire introuvable');
    return this.prisma.partnerProfile.update({ where: { id: partnerId }, data: { status } });
  }

  async findNearest(latitude: number, longitude: number, type?: PartnerType, availableOnly = true) {
    const partners = await this.prisma.partnerProfile.findMany({
      where: {
        active: true,
        ...(availableOnly ? { status: PartnerStatus.AVAILABLE } : {}),
        ...(type
          ? { type: { in: type === PartnerType.BOTH ? [PartnerType.BOTH] : [type, PartnerType.BOTH] } }
          : {}),
      },
      include: { user: { select: { phone: true, firstName: true, lastName: true } } },
    });

    const ranked = partners
      .map((p) => {
        const distance = distanceKm(latitude, longitude, p.latitude, p.longitude);
        return { ...p, distanceKm: Math.round(distance * 10) / 10, inCoverage: distance <= p.coverageKm };
      })
      .filter((p) => p.inCoverage)
      .sort((a, b) => a.distanceKm - b.distanceKm || b.rating - a.rating);

    return {
      count: ranked.length,
      nearest: ranked[0] ?? null,
      candidates: ranked.slice(0, 5),
    };
  }
}
