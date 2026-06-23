import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { UpdateOrderPartialDto } from './dto/update-order-partial.dto';
import { CreateOrderNoteDto } from './dto/create-order-note.dto';
import { AuthGuard } from 'src/guards/auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';

interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
  };
}

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async create(@Body() createOrderDto: CreateOrderDto) {
    return await this.ordersService.create(createOrderDto);
  }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  async findAll(@Query() query: ListOrdersQueryDto) {
    return await this.ordersService.findAllPaginated(query);
  }

  @Get(':id/admin')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  async findAdminById(@Param('id') id: string) {
    return await this.ordersService.findAdminById(id);
  }

  @Post(':id/notes')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  async addAdminNote(
    @Param('id') id: string,
    @Body() createOrderNoteDto: CreateOrderNoteDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return await this.ordersService.addAdminNote(
      id,
      createOrderNoteDto.note,
      {
        id: request.user.id,
        email: request.user.email,
      },
    );
  }

  @Get(':id')
  async findOneById(@Param('id') id: string) {
    return await this.ordersService.findOneById(id);
  }

  @Put(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  async updatePartial(
    @Param('id') id: string,
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    updateOrderPartialDto: UpdateOrderPartialDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return await this.ordersService.updatePartial(id, updateOrderPartialDto, {
      id: request.user.id,
      email: request.user.email,
    });
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ordersService.remove(+id);
  }
}
