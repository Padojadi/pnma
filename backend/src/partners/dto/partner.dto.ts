import { IsArray, IsEnum, IsNumber, IsOptional, IsString, IsBoolean } from 'class-validator';
import { PartnerStatus, PartnerType } from '@prisma/client';

export class CreatePartnerDto {
  @IsString()
  email!: string;

  @IsString()
  password!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  businessName!: string;

  @IsEnum(PartnerType)
  type!: PartnerType;

  @IsString()
  city!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;

  @IsOptional()
  @IsNumber()
  coverageKm?: number;

  @IsOptional()
  @IsArray()
  specialties?: string[];
}

export class UpdatePartnerStatusDto {
  @IsEnum(PartnerStatus)
  status!: PartnerStatus;
}

export class NearestPartnerQueryDto {
  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;

  @IsOptional()
  @IsEnum(PartnerType)
  type?: PartnerType;

  @IsOptional()
  @IsBoolean()
  availableOnly?: boolean;
}
