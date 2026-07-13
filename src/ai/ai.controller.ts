import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { AiService } from './ai.service';
import { Roles } from '../common/decorators';

class LimitQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private ai: AiService) {}

  @Roles(UserRole.ADMIN, UserRole.CALL_CENTER)
  @Post('incidents/:id/optimize')
  optimize(@Param('id') id: string) {
    return this.ai.optimizeIncident(id);
  }

  @Roles(UserRole.ADMIN, UserRole.CALL_CENTER)
  @Post('network/insights')
  network() {
    return this.ai.networkInsights();
  }

  @Roles(UserRole.ADMIN, UserRole.CALL_CENTER)
  @Get('suggestions')
  suggestions(@Query() query: LimitQuery) {
    return this.ai.recent(query.limit ?? 20);
  }
}
