import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { OrderdetailsService } from './orderdetails.service';
import { CreateOrderdetailDto } from './dto/create-orderdetail.dto';
import { UpdateOrderdetailDto } from './dto/update-orderdetail.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags("Order-Details")
@Controller('orderdetails')
export class OrderdetailsController {
  constructor(private readonly orderdetailsService: OrderdetailsService) {}

  @Post()


  @Get()
  async findAll() {
    return await this.orderdetailsService.findAll();
  }

  @Get(':id')
  async findOneById(@Param('id') id: string) {
    return await this.orderdetailsService.findOneById(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateOrderdetailDto: UpdateOrderdetailDto) {
    return await this.orderdetailsService.update(id, updateOrderdetailDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.orderdetailsService.remove(+id);
  }
}
