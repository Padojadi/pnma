import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

export class CreateTrainingDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  city!: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;
}

@Injectable()
export class TrainingService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.trainingSession.findMany({
      include: { _count: { select: { enrollments: true } } },
      orderBy: { startsAt: 'asc' },
    });
  }

  create(dto: CreateTrainingDto) {
    return this.prisma.trainingSession.create({
      data: {
        title: dto.title,
        description: dto.description,
        city: dto.city,
        location: dto.location,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        capacity: dto.capacity ?? 20,
      },
    });
  }

  async enroll(sessionId: string, userId: string) {
    const session = await this.prisma.trainingSession.findUnique({
      where: { id: sessionId },
      include: { _count: { select: { enrollments: true } } },
    });
    if (!session) throw new NotFoundException('Session introuvable');
    if (session._count.enrollments >= session.capacity) {
      throw new BadRequestException('Session complète');
    }
    return this.prisma.trainingEnrollment.create({
      data: { sessionId, userId },
      include: { session: true },
    });
  }
}
