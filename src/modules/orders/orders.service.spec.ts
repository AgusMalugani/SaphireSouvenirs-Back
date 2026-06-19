jest.mock('src/config/envs', () => ({
  envs: {
    NODEMAILER_CC: 'cc@example.com',
    URL_CLIENT: 'http://localhost:5173',
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { OrderdetailsService } from '../orderdetails/orderdetails.service';
import { EMAIL_SENDER } from '../email/email-sender.token';
import { EmailSender } from '../email/email-sender.interface';
import { CreateOrderDto } from './dto/create-order.dto';
import { TransactionTypeEnum } from 'src/enums/transactionType.enum';
import { Orderdetail } from '../orderdetails/entities/orderdetail.entity';

describe('OrdersService', () => {
  let ordersService: OrdersService;
  let emailSender: jest.Mocked<EmailSender>;
  let orderDetailsService: jest.Mocked<
    Pick<OrderdetailsService, 'create'>
  >;
  let dataSource: { transaction: jest.Mock };
  let orderRepository: jest.Mocked<
    Pick<Repository<Order>, 'find' | 'findOne' | 'save' | 'delete'>
  >;

  const createOrderDto: CreateOrderDto = {
    endOrder: '2026-07-01',
    transactionType: TransactionTypeEnum.Withdraw,
    address: 'ituzaingo 1117',
    theme: 'test theme',
    nameClient: 'Malugani',
    personalizationName: 'Agustin',
    numCel: '3413857748',
    num2Cel: '3413857749',
    email: 'client@example.com',
    products: [{ productId: 'product-id', cuantity: 1 }],
  };

  const mockOrderDetail: Orderdetail = {
    id: 'detail-id',
    cuantity: 1,
    subTotal: 1500,
    product: {
      id: 'product-id',
      name: 'Llavero Test',
      price: 1500,
    } as Orderdetail['product'],
    order: {} as Order,
  };

  beforeEach(async () => {
    emailSender = {
      sendOrderConfirmation: jest.fn().mockResolvedValue(undefined),
    };

    orderDetailsService = {
      create: jest.fn().mockResolvedValue(mockOrderDetail),
    };

    const transactionOrderRepository = {
      create: jest.fn((orderData: Partial<Order>) => ({
        id: 'order-id',
        ...orderData,
      })),
      save: jest
        .fn()
        .mockImplementation(async (order: Order) => ({ ...order, id: order.id ?? 'order-id' })),
    };

    dataSource = {
      transaction: jest.fn(async (callback) => {
        const transactionManager = {
          getRepository: jest.fn().mockReturnValue(transactionOrderRepository),
        };
        return callback(transactionManager);
      }),
    };

    orderRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useValue: orderRepository,
        },
        {
          provide: OrderdetailsService,
          useValue: orderDetailsService,
        },
        {
          provide: EMAIL_SENDER,
          useValue: emailSender,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    ordersService = testingModule.get(OrdersService);
  });

  it('persists order and dispatches confirmation email asynchronously', async () => {
    const createdOrder = await ordersService.create(createOrderDto);

    expect(createdOrder.id).toBe('order-id');
    expect(createdOrder.totalPrice).toBe(1500);
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(orderDetailsService.create).toHaveBeenCalledTimes(1);

    await Promise.resolve();

    expect(emailSender.sendOrderConfirmation).toHaveBeenCalledTimes(1);
    expect(emailSender.sendOrderConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({
        to: createOrderDto.email,
        orderId: 'order-id',
        html: expect.stringContaining('Llavero Test'),
      }),
    );
  });

  it('keeps order when confirmation email fails', async () => {
    emailSender.sendOrderConfirmation.mockRejectedValue(
      new Error('SMTP timeout'),
    );

    const createdOrder = await ordersService.create(createOrderDto);

    expect(createdOrder.id).toBe('order-id');
    expect(orderRepository.delete).not.toHaveBeenCalled();

    await Promise.resolve();

    expect(emailSender.sendOrderConfirmation).toHaveBeenCalledTimes(1);
  });

  it('does not dispatch email when persistence fails', async () => {
    orderDetailsService.create.mockRejectedValue(
      new Error('Failed to save order detail'),
    );

    await expect(ordersService.create(createOrderDto)).rejects.toThrow(
      'Failed to save order detail',
    );

    expect(emailSender.sendOrderConfirmation).not.toHaveBeenCalled();
  });
});
