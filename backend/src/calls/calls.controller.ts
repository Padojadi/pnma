import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CallSessionStatus, UserRole } from '@prisma/client';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { Request } from 'express';
import { AuthUser, Roles } from '../common/decorators';
import { CloseCallDto, StartCallDto, TickCallDto, CallsService } from './calls.service';

class ListQuery {
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  exceeded?: boolean;

  @IsOptional()
  @IsString()
  status?: CallSessionStatus;
}

class ReviewDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

@ApiTags('calls')
@ApiBearerAuth()
@Controller('calls')
export class CallsController {
  constructor(private calls: CallsService) {}

  @Roles(UserRole.ADMIN, UserRole.CALL_CENTER, UserRole.TEAM_LEAD)
  @Get()
  list(@Query() query: ListQuery, @Req() req: Request & { user: AuthUser }) {
    const agentId = req.user.role === UserRole.CALL_CENTER ? req.user.id : undefined;
    return this.calls.list({
      exceeded: query.exceeded,
      status: query.status,
      agentId,
    });
  }

  @Roles(UserRole.ADMIN, UserRole.TEAM_LEAD)
  @Get('team-lead')
  teamLead() {
    return this.calls.teamLeadBoard();
  }

  @Roles(UserRole.ADMIN, UserRole.CALL_CENTER, UserRole.TEAM_LEAD)
  @Post()
  start(@Req() req: Request & { user: AuthUser }, @Body() dto: StartCallDto) {
    return this.calls.start(req.user.id, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.CALL_CENTER, UserRole.TEAM_LEAD)
  @Patch(':id/tick')
  tick(@Param('id') id: string, @Body() dto: TickCallDto, @Req() req: Request & { user: AuthUser }) {
    return this.calls.tick(id, dto.elapsedSec, req.user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.CALL_CENTER, UserRole.TEAM_LEAD)
  @Post(':id/add-packet')
  addPacket(@Param('id') id: string, @Req() req: Request & { user: AuthUser }) {
    return this.calls.addPacket(id, req.user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.CALL_CENTER, UserRole.TEAM_LEAD)
  @Patch(':id/close')
  close(@Param('id') id: string, @Body() dto: CloseCallDto, @Req() req: Request & { user: AuthUser }) {
    return this.calls.close(id, req.user.id, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.TEAM_LEAD)
  @Patch(':id/review')
  review(@Param('id') id: string, @Body() dto: ReviewDto, @Req() req: Request & { user: AuthUser }) {
    return this.calls.review(id, req.user.id, dto.notes);
  }
}
