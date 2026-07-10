import { Controller, Get, Patch, Post, Body, Param, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Request } from 'express';
import { UsersService } from './users.service';
import { Roles, AuthUser } from '../common/decorators';
import { UpdateLocationDto } from '../auth/dto/auth.dto';

class CreateStaffDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEnum(UserRole)
  role!: UserRole;
}

class ActiveDto {
  @IsBoolean()
  active!: boolean;
}

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Roles(UserRole.ADMIN, UserRole.CALL_CENTER)
  @Get()
  list(@Query('role') role?: UserRole) {
    return this.users.list(role);
  }

  @Patch('me/location')
  updateMyLocation(@Req() req: Request & { user: AuthUser }, @Body() dto: UpdateLocationDto) {
    return this.users.updateLocation(req.user.id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Post('staff')
  createStaff(@Body() dto: CreateStaffDto) {
    return this.users.createStaff(dto);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id/active')
  setActive(@Param('id') id: string, @Body() dto: ActiveDto) {
    return this.users.setActive(id, dto.active);
  }
}
