import { Module } from '@nestjs/common';
import { MedicalService } from './medical.service';
import { MedicalController } from './medical.controller';
import { AuditService } from '../common/audit.service';

@Module({
  controllers: [MedicalController],
  providers: [MedicalService, AuditService],
})
export class MedicalModule {}
