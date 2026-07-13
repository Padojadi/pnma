import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import {
  IncidentDomain,
  IncidentStatus,
  IncidentType,
  MedicalMeasure,
  Priority,
  RescueAction,
  RescueCategory,
} from '@prisma/client';

export class CreateIncidentDto {
  @IsEnum(IncidentType)
  type!: IncidentType;

  @IsOptional()
  @IsEnum(IncidentDomain)
  domain?: IncidentDomain;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsString()
  reporterId?: string;

  @IsOptional()
  @IsBoolean()
  confirmedBreakdown?: boolean;

  @IsOptional()
  @IsString()
  redirectService?: string;
}

export class UpdateIncidentStatusDto {
  @IsEnum(IncidentStatus)
  status!: IncidentStatus;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}

export class AssignPartnerDto {
  @IsString()
  partnerId!: string;

  @IsOptional()
  @IsString()
  message?: string;
}

export class AddRescueActionDto {
  @IsEnum(RescueCategory)
  category!: RescueCategory;

  @IsEnum(RescueAction)
  action!: RescueAction;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}

export class AddMedicalMeasureDto {
  @IsEnum(MedicalMeasure)
  measure!: MedicalMeasure;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}

export class BulkMedicalMeasuresDto {
  @IsArray()
  measures!: MedicalMeasure[];
}
