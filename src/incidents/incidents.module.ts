import { Module } from '@nestjs/common';
import { IncidentsService } from './incidents.service';
import { IncidentsController } from './incidents.controller';
import { PartnersModule } from '../partners/partners.module';
import { AuditService } from '../common/audit.service';

@Module({
  imports: [PartnersModule],
  controllers: [IncidentsController],
  providers: [IncidentsService, AuditService],
  exports: [IncidentsService],
})
export class IncidentsModule {}
