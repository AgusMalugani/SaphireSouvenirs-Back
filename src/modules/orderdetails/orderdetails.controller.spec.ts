import { Test, TestingModule } from '@nestjs/testing';
import { OrderdetailsController } from './orderdetails.controller';
import { OrderdetailsService } from './orderdetails.service';

describe('OrderdetailsController', () => {
  let controller: OrderdetailsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderdetailsController],
      providers: [OrderdetailsService],
    }).compile();

    controller = module.get<OrderdetailsController>(OrderdetailsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
