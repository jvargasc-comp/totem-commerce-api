import { Controller, Get, Param, Post } from '@nestjs/common';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Get(':id/receipt')
  receipt(@Param('id') id: string) {
    return this.service.getReceipt(id);
  }
  @Get(':id/status')
  status(@Param('id') id: string) {
    return this.service.getStatus(id);
  }
  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.service.cancel(id);
  }
}
