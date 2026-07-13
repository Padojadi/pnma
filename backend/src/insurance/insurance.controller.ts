import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CreateInsuranceDto, InsuranceService } from './insurance.service';
import { Roles, Public } from '../common/decorators';

@ApiTags('insurance')
@ApiBearerAuth()
@Controller('insurance')
export class InsuranceController {
  constructor(private insurance: InsuranceService) {}

  @Public()
  @Get('partners')
  insurers() {
    return this.insurance.listInsurers();
  }

  @Roles(UserRole.ADMIN, UserRole.CALL_CENTER, UserRole.INSURER)
  @Get('contracts')
  contracts(@Query('subscriberId') subscriberId?: string) {
    return this.insurance.listContracts(subscriberId);
  }

  @Roles(UserRole.ADMIN, UserRole.CALL_CENTER)
  @Post('contracts')
  create(@Body() dto: CreateInsuranceDto) {
    return this.insurance.createContract(dto);
  }
}
