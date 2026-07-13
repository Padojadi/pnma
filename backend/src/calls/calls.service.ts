import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CallSessionStatus, UserRole } from '@prisma/client';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';
import { makeReference } from '../common/geo';

export class StartCallDto {
  @IsOptional()
  @IsString()
  incidentId?: string;

  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(10)
  packetMinutes?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class TickCallDto {
  @IsInt()
  @Min(0)
  elapsedSec!: number;
}

export class CloseCallDto {
  @IsOptional()
  @IsString()
  decision?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

@Injectable()
export class CallsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  list(filters?: { exceeded?: boolean; status?: CallSessionStatus; agentId?: string }) {
    return this.prisma.callSession.findMany({
      where: {
        ...(filters?.exceeded !== undefined ? { exceeded: filters.exceeded } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.agentId ? { agentId: filters.agentId } : {}),
      },
      include: {
        agent: { select: { firstName: true, lastName: true, email: true } },
        incident: { select: { reference: true, type: true, city: true, domain: true } },
        reviewedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: 100,
    });
  }

  teamLeadBoard() {
    return this.prisma.callSession.findMany({
      where: { exceeded: true },
      include: {
        agent: { select: { firstName: true, lastName: true, email: true } },
        incident: { select: { reference: true, type: true, city: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
  }

  async start(agentId: string, dto: StartCallDto) {
    const packet = dto.packetMinutes ?? 5;
    return this.prisma.callSession.create({
      data: {
        reference: makeReference('CALL'),
        agentId,
        incidentId: dto.incidentId,
        packetMinutes: packet,
        packetsUsed: 1,
        countdownRemain: packet * 60,
        elapsedSec: 0,
        notes: dto.notes,
        status: CallSessionStatus.OPEN,
      },
      include: {
        agent: { select: { firstName: true, lastName: true } },
        incident: true,
      },
    });
  }

  async tick(id: string, elapsedSec: number, agentId: string) {
    const call = await this.prisma.callSession.findUnique({ where: { id } });
    if (!call) throw new NotFoundException('Appel introuvable');
    if (call.status !== CallSessionStatus.OPEN) throw new BadRequestException('Appel déjà clos');
    if (call.agentId !== agentId) throw new BadRequestException('Appel non assigné à cet agent');

    const packetSec = call.packetMinutes * 60;
    const packetsNeeded = Math.max(1, Math.ceil((elapsedSec || 1) / packetSec));
    const countdownRemain = Math.max(0, packetsNeeded * packetSec - elapsedSec);
    const exceeded = packetsNeeded > 1;
    const newlyExceeded = exceeded && !call.exceeded;

    const updated = await this.prisma.callSession.update({
      where: { id },
      data: {
        elapsedSec,
        packetsUsed: packetsNeeded,
        countdownRemain,
        exceeded,
      },
    });

    if (newlyExceeded) {
      await this.audit.log({
        userId: agentId,
        action: 'CALL_EXCEED',
        entity: 'CallSession',
        entityId: id,
        meta: { packetsUsed: packetsNeeded, elapsedSec, packetMinutes: call.packetMinutes },
      });
    }

    return {
      ...updated,
      chronogram: {
        countdownRemain,
        elapsedSec,
        packetsUsed: packetsNeeded,
        packetMinutes: call.packetMinutes,
        exceeded,
        directionCountdown: countdownRemain,
        directionElapsed: elapsedSec,
      },
    };
  }

  async addPacket(id: string, agentId: string) {
    const call = await this.prisma.callSession.findUnique({ where: { id } });
    if (!call || call.status !== CallSessionStatus.OPEN) throw new NotFoundException('Appel introuvable');
    const packetsUsed = call.packetsUsed + 1;
    const updated = await this.prisma.callSession.update({
      where: { id },
      data: {
        packetsUsed,
        countdownRemain: call.packetMinutes * 60,
        exceeded: true,
      },
    });
    await this.audit.log({
      userId: agentId,
      action: 'CALL_EXCEED',
      entity: 'CallSession',
      entityId: id,
      meta: { packetsUsed, manual: true },
    });
    return updated;
  }

  async close(id: string, agentId: string, dto: CloseCallDto) {
    const call = await this.prisma.callSession.findUnique({ where: { id } });
    if (!call) throw new NotFoundException('Appel introuvable');
    return this.prisma.callSession.update({
      where: { id },
      data: {
        status: CallSessionStatus.CLOSED,
        endedAt: new Date(),
        decision: dto.decision,
        notes: dto.notes ?? call.notes,
      },
    });
  }

  async review(id: string, reviewerId: string, notes?: string) {
    return this.prisma.callSession.update({
      where: { id },
      data: { reviewedById: reviewerId, reviewNotes: notes },
    });
  }
}
