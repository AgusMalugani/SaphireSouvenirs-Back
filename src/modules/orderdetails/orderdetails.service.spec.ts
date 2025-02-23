import { Test, TestingModule } from '@nestjs/testing';
import { OrderdetailsService } from './orderdetails.service';

describe('OrderdetailsService', () => {
  let service: OrderdetailsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderdetailsService],
    }).compile();

    service = module.get<OrderdetailsService>(OrderdetailsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
