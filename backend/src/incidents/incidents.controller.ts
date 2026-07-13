import { Controller, Get, Post, Patch, Body, Param, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IncidentDomain, IncidentStatus, UserRole } from '@prisma/client';
import { Request } from 'express';
import { IncidentsService } from './incidents.service';
import {
  AddMedicalMeasureDto,
  AddRescueActionDto,
  AssignPartnerDto,
  CreateIncidentDto,
  UpdateIncidentStatusDto,
} from './dto/incident.dto';
import { Roles, AuthUser } from '../common/decorators';

@ApiTags('incidents')
@ApiBearerAuth()
@Controller('incidents')
export class IncidentsController {
  constructor(private incidents: IncidentsService) {}

  @Roles(UserRole.ADMIN, UserRole.CALL_CENTER, UserRole.TEAM_LEAD, UserRole.SUBSCRIBER, UserRole.PARTNER)
  @Get()
  list(
    @Req() req: Request & { user: AuthUser },
    @Query('status') status?: IncidentStatus,
    @Query('city') city?: string,
    @Query('domain') domain?: IncidentDomain,
  ) {
    const reporterId = req.user.role === UserRole.SUBSCRIBER ? req.user.id : undefined;
    return this.incidents.list({ status, city, reporterId, domain });
  }

  @Roles(UserRole.ADMIN, UserRole.CALL_CENTER, UserRole.TEAM_LEAD, UserRole.SUBSCRIBER, UserRole.PARTNER)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.incidents.get(id);
  }

  @Roles(UserRole.ADMIN, UserRole.CALL_CENTER, UserRole.TEAM_LEAD, UserRole.SUBSCRIBER)
  @Post()
  create(@Req() req: Request & { user: AuthUser }, @Body() dto: CreateIncidentDto) {
    return this.incidents.create(dto, req.user.id, req.user.role);
  }

  @Roles(UserRole.ADMIN, UserRole.CALL_CENTER, UserRole.TEAM_LEAD)
  @Post(':id/auto-dispatch')
  autoDispatch(@Param('id') id: string, @Req() req: Request & { user: AuthUser }) {
    return this.incidents.autoDispatch(id, req.user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.CALL_CENTER, UserRole.TEAM_LEAD)
  @Post(':id/assign')
  assign(@Param('id') id: string, @Body() dto: AssignPartnerDto, @Req() req: Request & { user: AuthUser }) {
    return this.incidents.assign(id, dto, req.user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.CALL_CENTER, UserRole.TEAM_LEAD, UserRole.PARTNER)
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateIncidentStatusDto,
    @Req() req: Request & { user: AuthUser },
  ) {
    return this.incidents.updateStatus(id, dto, req.user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.CALL_CENTER, UserRole.TEAM_LEAD)
  @Post(':id/rescue-actions')
  addRescue(@Param('id') id: string, @Body() dto: AddRescueActionDto) {
    return this.incidents.addRescueAction(id, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.CALL_CENTER, UserRole.TEAM_LEAD)
  @Post(':id/medical-measures')
  addMedical(@Param('id') id: string, @Body() dto: AddMedicalMeasureDto) {
    return this.incidents.addMedicalMeasure(id, dto);
  }
}
