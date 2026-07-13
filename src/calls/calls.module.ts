import { Module } from '@nestjs/common';
import { CallsService } from './calls.service';
import { CallsController } from './calls.controller';
import { AuditService } from '../common/audit.service';

@Module({
  controllers: [CallsController],
  providers: [CallsService, AuditService],
  exports: [CallsService],
})
export class CallsModule {}
