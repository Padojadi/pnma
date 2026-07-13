import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PartnerType, UserRole } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsNumber, IsOptional } from 'class-validator';
import { PartnersService } from './partners.service';
import { CreatePartnerDto, UpdatePartnerStatusDto } from './dto/partner.dto';
import { Roles, Public } from '../common/decorators';

class NearestQuery {
  @Type(() => Number)
  @IsNumber()
  latitude!: number;

  @Type(() => Number)
  @IsNumber()
  longitude!: number;

  @IsOptional()
  @IsEnum(PartnerType)
  type?: PartnerType;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  availableOnly?: boolean;
}

@ApiTags('partners')
@ApiBearerAuth()
@Controller('partners')
export class PartnersController {
  constructor(private partners: PartnersService) {}

  @Public()
  @Get()
  list(@Query('city') city?: string, @Query('type') type?: PartnerType) {
    return this.partners.list(city, type);
  }

  @Roles(UserRole.ADMIN, UserRole.CALL_CENTER, UserRole.SUBSCRIBER)
  @Get('dispatch/nearest')
  nearest(@Query() query: NearestQuery) {
    return this.partners.findNearest(query.latitude, query.longitude, query.type, query.availableOnly ?? true);
  }

  @Roles(UserRole.ADMIN, UserRole.CALL_CENTER)
  @Post()
  create(@Body() dto: CreatePartnerDto) {
    return this.partners.create(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.CALL_CENTER, UserRole.PARTNER)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdatePartnerStatusDto) {
    return this.partners.updateStatus(id, dto.status);
  }
}
