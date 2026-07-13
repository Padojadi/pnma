import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { OfferLevel, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private audit: AuditService,
  ) {}

  async login(dto: LoginDto, ip?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: {
        subscriberProfile: { include: { subscriptions: { include: { offerPlan: true }, where: { status: 'ACTIVE' } } } },
        partnerProfile: true,
      },
    });
    if (!user || !user.active) throw new UnauthorizedException('Identifiants invalides');
    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Identifiants invalides');

    await this.audit.log({ userId: user.id, action: 'LOGIN', entity: 'User', entityId: user.id, ipAddress: ip });

    const { password: _, ...safe } = user;
    const token = this.jwt.sign({ sub: user.id, email: user.email, role: user.role });
    return { user: safe, accessToken: token };
  }

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email déjà utilisé');

    const role = dto.role && dto.role === UserRole.SUBSCRIBER ? UserRole.SUBSCRIBER : UserRole.SUBSCRIBER;
    const password = await bcrypt.hash(dto.password, 10);

    const plan = await this.prisma.offerPlan.findUnique({ where: { level: OfferLevel.NIVEAU_1 } });

    const user = await this.prisma.user.create({
      data: {
        email,
        password,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role,
        subscriberProfile: {
          create: {
            isEnterprise: dto.isEnterprise ?? false,
            companyName: dto.companyName,
            city: dto.city ?? 'Dakar',
            vehiclePlate: dto.vehiclePlate,
            subscriptions: plan
              ? {
                  create: {
                    offerPlanId: plan.id,
                    status: 'ACTIVE',
                    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                  },
                }
              : undefined,
          },
        },
      },
      include: {
        subscriberProfile: { include: { subscriptions: { include: { offerPlan: true } } } },
      },
    });

    const { password: _, ...safe } = user;
    const token = this.jwt.sign({ sub: user.id, email: user.email, role: user.role });
    return { user: safe, accessToken: token };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriberProfile: { include: { subscriptions: { include: { offerPlan: true }, where: { status: 'ACTIVE' } } } },
        partnerProfile: true,
      },
    });
    if (!user) throw new UnauthorizedException();
    const { password: _, ...safe } = user;
    return safe;
  }
}
