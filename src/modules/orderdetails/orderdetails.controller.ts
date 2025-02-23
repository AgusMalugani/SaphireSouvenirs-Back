import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { OrderdetailsService } from './orderdetails.service';
import { CreateOrderdetailDto } from './dto/create-orderdetail.dto';
import { UpdateOrderdetailDto } from './dto/update-orderdetail.dto';

@Controller('orderdetails')
export class OrderdetailsController {
  constructor(private readonly orderdetailsService: OrderdetailsService) {}

  @Post()
  create(@Body() createOrderdetailDto: CreateOrderdetailDto) {
    return this.orderdetailsService.create(createOrderdetailDto);
  }

  @Get()
  findAll() {
    return this.orderdetailsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orderdetailsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOrderdetailDto: UpdateOrderdetailDto) {
    return this.orderdetailsService.update(+id, updateOrderdetailDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.orderdetailsService.remove(+id);
  }
}
