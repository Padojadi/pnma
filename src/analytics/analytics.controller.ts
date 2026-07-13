import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsOptional, IsString } from 'class-validator';
import { AnalyticsService } from './analytics.service';
import { Public, Roles } from '../common/decorators';

class RegionQuery {
  @IsOptional()
  @IsString()
  region?: string;
}

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private analytics: AnalyticsService) {}

  @Roles(UserRole.ADMIN, UserRole.CALL_CENTER, UserRole.TEAM_LEAD)
  @Get('dashboard')
  dashboard(@Query() query: RegionQuery) {
    return this.analytics.dashboard(query.region);
  }

  @Roles(UserRole.ADMIN, UserRole.CALL_CENTER, UserRole.TEAM_LEAD)
  @Get('flux-medical')
  fluxMedical(@Query() query: RegionQuery) {
    return this.analytics.fluxMedical(query.region);
  }

  @Public()
  @Get('catalog')
  catalog() {
    return this.analytics.incidentCatalog();
  }
}
