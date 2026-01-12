import { Controller, Get, Query } from '@nestjs/common';
import { DeliveryService } from './delivery.service';

@Controller('delivery')
export class DeliveryController {
  constructor(private readonly delivery: DeliveryService) {}

  @Get('windows')
  list(@Query('date') date: string) {
    return this.delivery.listWindows(date);
  }
}
