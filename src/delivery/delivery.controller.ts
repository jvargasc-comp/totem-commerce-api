import { Controller, Get, Query } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { DeliveryWindowsQueryDto } from './dto/delivery-windows-query.dto';

@Controller('delivery')
export class DeliveryController {
  constructor(private readonly service: DeliveryService) {}

  @Get('windows')
  getWindows(@Query() q: DeliveryWindowsQueryDto) {
    return this.service.getWindows(q);
  }
}
