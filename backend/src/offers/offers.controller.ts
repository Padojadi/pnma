import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OffersService } from './offers.service';
import { Public } from '../common/decorators';

@ApiTags('offers')
@Controller('offers')
export class OffersController {
  constructor(private offers: OffersService) {}

  @Public()
  @Get()
  list() {
    return this.offers.list();
  }
}
