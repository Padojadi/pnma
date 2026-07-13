import { Controller, Get, Post, Patch, Body, Param, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MedicalPrefinanceStatus, UserRole } from '@prisma/client';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Request } from 'express';
import { CreateMedicalDto, MedicalService } from './medical.service';
import { Roles, AuthUser } from '../common/decorators';

class DecideDto {
  @IsBoolean()
  approve!: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

@ApiTags('medical')
@ApiBearerAuth()
@Controller('medical')
export class MedicalController {
  constructor(private medical: MedicalService) {}

  @Roles(UserRole.ADMIN, UserRole.CALL_CENTER)
  @Get()
  list(@Query('status') status?: MedicalPrefinanceStatus) {
    return this.medical.list(status);
  }

  @Roles(UserRole.ADMIN, UserRole.CALL_CENTER, UserRole.SUBSCRIBER)
  @Post()
  create(@Body() dto: CreateMedicalDto, @Req() req: Request & { user: AuthUser }) {
    return this.medical.create(dto, req.user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.CALL_CENTER)
  @Patch(':id/decide')
  decide(@Param('id') id: string, @Body() dto: DecideDto, @Req() req: Request & { user: AuthUser }) {
    return this.medical.decide(id, dto.approve, req.user.id, dto.notes);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id/disburse')
  disburse(@Param('id') id: string, @Req() req: Request & { user: AuthUser }) {
    return this.medical.disburse(id, req.user.id);
  }
}
