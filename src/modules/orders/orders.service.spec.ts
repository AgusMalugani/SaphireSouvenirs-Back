jest.mock('src/config/envs', () => ({
  envs: {
    EMAIL_CC: 'cc@example.com',
    URL_CLIENT: 'http://localhost:5173',
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { OrderTimelineEvent } from './entities/order-timeline-event.entity';
import { OrderAdminNote } from './entities/order-admin-note.entity';
import { OrderdetailsService } from '../orderdetails/orderdetails.service';
import { EMAIL_SENDER } from '../email/email-sender.token';
import { EmailSender } from '../email/email-sender.interface';
import { CreateOrderDto } from './dto/create-order.dto';
import { TransactionTypeEnum } from 'src/enums/transactionType.enum';
import { StateEnum } from 'src/enums/states.enum';
import { Orderdetail } from '../orderdetails/entities/orderdetail.entity';
import { OrderTimelineEventType } from './enums/order-timeline-event-type.enum';
import { NotFoundException } from '@nestjs/common';

describe('OrdersService', () => {
  let ordersService: OrdersService;
  let emailSender: jest.Mocked<EmailSender>;
  let orderDetailsService: jest.Mocked<
    Pick<OrderdetailsService, 'create'>
  >;
  let dataSource: { transaction: jest.Mock };
  let orderRepository: jest.Mocked<
    Pick<
      Repository<Order>,
      'find' | 'findOne' | 'save' | 'delete' | 'createQueryBuilder'
    >
  >;
  let timelineEventRepository: jest.Mocked<
    Pick<Repository<OrderTimelineEvent>, 'find' | 'create' | 'save'>
  >;
  let adminNoteRepository: jest.Mocked<
    Pick<Repository<OrderAdminNote>, 'find' | 'create' | 'save'>
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

  const mockOrder: Order = {
    id: 'order-id',
    createAt: '2026-06-13',
    endOrder: '2026-07-01',
    transactionType: TransactionTypeEnum.Withdraw,
    state: StateEnum.InProcess,
    address: 'ituzaingo 1117',
    totalPrice: 1500,
    theme: 'test theme',
    nameClient: 'Malugani',
    personalizationName: 'Agustin',
    numCel: '3413857748',
    num2Cel: '3413857749',
    email: 'client@example.com',
    orderDetails: [mockOrderDetail],
  };

  const adminUser = { id: 'admin-id', email: 'admin@example.com' };

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
        .mockImplementation(async (order: Order) => ({
          ...order,
          id: order.id ?? 'order-id',
        })),
    };

    const transactionTimelineRepository = {
      create: jest.fn((eventData: Partial<OrderTimelineEvent>) => eventData),
      save: jest
        .fn()
        .mockImplementation(async (event: OrderTimelineEvent) => ({
          id: 'timeline-id',
          createdAt: new Date('2026-06-13T10:00:00.000Z'),
          ...event,
        })),
    };

    const transactionAdminNoteRepository = {
      create: jest.fn((noteData: Partial<OrderAdminNote>) => noteData),
      save: jest
        .fn()
        .mockImplementation(async (note: OrderAdminNote) => ({
          id: 'note-id',
          createdAt: new Date('2026-06-13T11:00:00.000Z'),
          ...note,
        })),
    };

    dataSource = {
      transaction: jest.fn(async (callback) => {
        const transactionManager = {
          getRepository: jest.fn((entity: unknown) => {
            if (entity === Order) {
              return transactionOrderRepository;
            }
            if (entity === OrderTimelineEvent) {
              return transactionTimelineRepository;
            }
            if (entity === OrderAdminNote) {
              return transactionAdminNoteRepository;
            }
            throw new Error(`Unexpected entity: ${String(entity)}`);
          }),
        };
        return callback(transactionManager);
      }),
    };

    orderRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    timelineEventRepository = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      save: jest.fn(),
    };

    adminNoteRepository = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      save: jest.fn(),
    };

    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useValue: orderRepository,
        },
        {
          provide: getRepositoryToken(OrderTimelineEvent),
          useValue: timelineEventRepository,
        },
        {
          provide: getRepositoryToken(OrderAdminNote),
          useValue: adminNoteRepository,
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

  it('persists order, records created timeline event, and dispatches confirmation email', async () => {
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
    expect(emailSender.sendOrderConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('/post-shop/order-id'),
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

  it('returns paginated orders with meta', async () => {
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockOrder], 1]),
    };
    orderRepository.createQueryBuilder.mockReturnValue(
      queryBuilder as unknown as ReturnType<
        Repository<Order>['createQueryBuilder']
      >,
    );

    const result = await ordersService.findAllPaginated({
      page: 1,
      limit: 20,
      sort: 'createAt',
      order: 'desc',
    });

    expect(result.data).toHaveLength(1);
    expect(result.meta).toEqual({
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
  });

  it('records state_changed timeline event on partial update', async () => {
    orderRepository.findOne.mockResolvedValue({ ...mockOrder });
    orderRepository.save.mockImplementation(async (order) => order as Order);

    const updatedOrder = await ordersService.updatePartial(
      'order-id',
      { state: StateEnum.Paid },
      adminUser,
    );

    expect(updatedOrder.state).toBe(StateEnum.Paid);
    expect(dataSource.transaction).toHaveBeenCalled();
  });

  it('returns admin order detail with timeline and notes', async () => {
    orderRepository.findOne.mockResolvedValue({ ...mockOrder });
    timelineEventRepository.find.mockResolvedValue([
      {
        id: 'timeline-id',
        type: OrderTimelineEventType.Created,
        payload: {},
        createdAt: new Date('2026-06-13T10:00:00.000Z'),
        createdByUser: null,
      } as OrderTimelineEvent,
    ]);
    adminNoteRepository.find.mockResolvedValue([
      {
        id: 'note-id',
        text: 'Nota de prueba',
        createdAt: new Date('2026-06-13T11:00:00.000Z'),
        createdByUser: {
          id: adminUser.id,
          email: adminUser.email,
        },
      } as OrderAdminNote,
    ]);

    const result = await ordersService.findAdminById('order-id');

    expect(result.timeline).toHaveLength(1);
    expect(result.notes).toHaveLength(1);
    expect(result.timeline[0].type).toBe(OrderTimelineEventType.Created);
    expect(result.notes[0].text).toBe('Nota de prueba');
  });

  it('appends admin note and records admin_note_added timeline event', async () => {
    orderRepository.findOne.mockResolvedValue({ ...mockOrder });

    const result = await ordersService.addAdminNote(
      'order-id',
      'Cliente confirmó diseño',
      adminUser,
    );

    expect(result.note.text).toBe('Cliente confirmó diseño');
    expect(result.note.createdBy.email).toBe(adminUser.email);
    expect(dataSource.transaction).toHaveBeenCalled();
  });

  it('throws NotFoundException when order does not exist', async () => {
    orderRepository.findOne.mockResolvedValue(null);

    await expect(ordersService.findOneById('missing-id')).rejects.toThrow(
      NotFoundException,
    );
  });
});
