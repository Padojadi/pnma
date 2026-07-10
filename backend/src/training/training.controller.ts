import { Controller, Get, Post, Body, Param, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { CreateTrainingDto, TrainingService } from './training.service';
import { Roles, Public, AuthUser } from '../common/decorators';

@ApiTags('training')
@ApiBearerAuth()
@Controller('training')
export class TrainingController {
  constructor(private training: TrainingService) {}

  @Public()
  @Get()
  list() {
    return this.training.list();
  }

  @Roles(UserRole.ADMIN, UserRole.CALL_CENTER)
  @Post()
  create(@Body() dto: CreateTrainingDto) {
    return this.training.create(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.CALL_CENTER, UserRole.SUBSCRIBER)
  @Post(':id/enroll')
  enroll(@Param('id') id: string, @Req() req: Request & { user: AuthUser }) {
    return this.training.enroll(id, req.user.id);
  }
}
