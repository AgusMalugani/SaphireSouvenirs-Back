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
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

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
  let transactionOrderRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
  };
  let transactionTimelineRepository: {
    create: jest.Mock;
    save: jest.Mock;
  };
  let adminNoteRepository: jest.Mocked<
    Pick<Repository<OrderAdminNote>, 'find' | 'create' | 'save'>
  >;

  const configureReloadedOrder = (orderOverrides: Partial<Order> = {}) => {
    transactionOrderRepository.findOne.mockResolvedValue({
      ...mockOrder,
      ...orderOverrides,
      orderDetails: orderOverrides.orderDetails ?? [mockOrderDetail],
    });
  };

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
    depositAmount: 0,
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

    transactionOrderRepository = {
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
      findOne: jest.fn().mockImplementation(async () => ({
        ...mockOrder,
        depositAmount: 750,
        state: StateEnum.PartialPayment,
        orderDetails: [mockOrderDetail],
      })),
    };

    const transactionOrderDetailRepository = {
      delete: jest.fn().mockResolvedValue(undefined),
    };

    transactionTimelineRepository = {
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
            if (entity === Orderdetail) {
              return transactionOrderDetailRepository;
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
    expect(result.data[0].remainingBalance).toBe(1500);
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'order.state != :cancelledState',
      { cancelledState: StateEnum.Cancelled },
    );
    expect(result.meta).toEqual({
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
  });

  it('sets paid state when deposit equals total', async () => {
    orderRepository.findOne.mockResolvedValue({ ...mockOrder, depositAmount: 0 });
    configureReloadedOrder({
      depositAmount: 1500,
      state: StateEnum.Paid,
      totalPrice: 1500,
    });

    const updatedOrder = await ordersService.updateOrder(
      'order-id',
      { depositAmount: 1500 },
      adminUser,
    );

    expect(updatedOrder.state).toBe(StateEnum.Paid);
    expect(updatedOrder.remainingBalance).toBe(0);
  });

  it('rejects deposit greater than total', async () => {
    orderRepository.findOne.mockResolvedValue({ ...mockOrder, depositAmount: 0 });

    await expect(
      ordersService.updateOrder(
        'order-id',
        { depositAmount: 2000 },
        adminUser,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('keeps partial payment when products increase total', async () => {
    const higherSubtotalDetail = { ...mockOrderDetail, subTotal: 3000 };
    orderDetailsService.create.mockResolvedValue(higherSubtotalDetail);
    orderRepository.findOne.mockResolvedValue({
      ...mockOrder,
      depositAmount: 750,
      state: StateEnum.PartialPayment,
    });
    configureReloadedOrder({
      depositAmount: 750,
      totalPrice: 3000,
      state: StateEnum.PartialPayment,
      orderDetails: [higherSubtotalDetail],
    });

    const updatedOrder = await ordersService.updateOrder(
      'order-id',
      { products: [{ productId: 'product-id', cuantity: 2 }] },
      adminUser,
    );

    expect(updatedOrder.totalPrice).toBe(3000);
    expect(updatedOrder.state).toBe(StateEnum.PartialPayment);
    expect(updatedOrder.remainingBalance).toBe(2250);
  });

  it('marks order paid when products lower total below deposit', async () => {
    const lowerSubtotalDetail = { ...mockOrderDetail, subTotal: 800 };
    orderDetailsService.create.mockResolvedValue(lowerSubtotalDetail);
    orderRepository.findOne.mockResolvedValue({
      ...mockOrder,
      depositAmount: 800,
      state: StateEnum.PartialPayment,
      totalPrice: 1500,
    });
    configureReloadedOrder({
      depositAmount: 800,
      totalPrice: 800,
      state: StateEnum.Paid,
      orderDetails: [lowerSubtotalDetail],
    });

    const updatedOrder = await ordersService.updateOrder(
      'order-id',
      { products: [{ productId: 'product-id', cuantity: 1 }] },
      adminUser,
    );

    expect(updatedOrder.totalPrice).toBe(800);
    expect(updatedOrder.state).toBe(StateEnum.Paid);
    expect(updatedOrder.remainingBalance).toBe(0);
  });

  it('rejects product update when deposit exceeds new total', async () => {
    const lowerSubtotalDetail = { ...mockOrderDetail, subTotal: 5000 };
    orderDetailsService.create.mockResolvedValue(lowerSubtotalDetail);
    orderRepository.findOne.mockResolvedValue({
      ...mockOrder,
      depositAmount: 8000,
      totalPrice: 10000,
      state: StateEnum.PartialPayment,
    });

    await expect(
      ordersService.updateOrder(
        'order-id',
        { products: [{ productId: 'product-id', cuantity: 1 }] },
        adminUser,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('records order_edited when client fields change', async () => {
    orderRepository.findOne.mockResolvedValue({ ...mockOrder });
    configureReloadedOrder({ nameClient: 'Nuevo Cliente' });

    const updatedOrder = await ordersService.updateOrder(
      'order-id',
      { nameClient: 'Nuevo Cliente' },
      adminUser,
    );

    expect(updatedOrder.nameClient).toBe('Nuevo Cliente');
    expect(transactionTimelineRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        type: OrderTimelineEventType.OrderEdited,
      }),
    );
  });

  it('returns early without timeline events when payload has no changes', async () => {
    orderRepository.findOne.mockResolvedValue({ ...mockOrder, depositAmount: 0 });
    transactionTimelineRepository.save.mockClear();

    const updatedOrder = await ordersService.updateOrder(
      'order-id',
      { depositAmount: 0 },
      adminUser,
    );

    expect(updatedOrder.depositAmount).toBe(0);
    expect(transactionTimelineRepository.save).not.toHaveBeenCalled();
  });

  it('cancels in-process order', async () => {
    orderRepository.findOne.mockResolvedValue({
      ...mockOrder,
      state: StateEnum.PartialPayment,
      depositAmount: 500,
    });

    const cancelledOrder = await ordersService.updateOrder(
      'order-id',
      { state: StateEnum.Cancelled, cancelReason: 'Cliente desistió' },
      adminUser,
    );

    expect(cancelledOrder.state).toBe(StateEnum.Cancelled);
    expect(transactionTimelineRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        type: OrderTimelineEventType.OrderCancelled,
      }),
    );
  });

  it('rejects cancelling a paid order', async () => {
    orderRepository.findOne.mockResolvedValue({
      ...mockOrder,
      state: StateEnum.Paid,
      depositAmount: 1500,
    });

    await expect(
      ordersService.updateOrder(
        'order-id',
        { state: StateEnum.Cancelled },
        adminUser,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects cancel and deposit update in the same request', async () => {
    orderRepository.findOne.mockResolvedValue({ ...mockOrder });

    await expect(
      ordersService.updateOrder(
        'order-id',
        { state: StateEnum.Cancelled, depositAmount: 100 },
        adminUser,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('serializes deposit defaults on create', async () => {
    const createdOrder = await ordersService.create(createOrderDto);

    expect(createdOrder.depositAmount).toBe(0);
    expect(createdOrder.remainingBalance).toBe(1500);
  });

  it('derives payment state from depositAmount and records payment_updated', async () => {
    orderRepository.findOne.mockResolvedValue({ ...mockOrder, depositAmount: 0 });

    const updatedOrder = await ordersService.updateOrder(
      'order-id',
      { depositAmount: 750 },
      adminUser,
    );

    expect(updatedOrder.state).toBe(StateEnum.PartialPayment);
    expect(updatedOrder.remainingBalance).toBe(750);
    expect(updatedOrder.depositAmount).toBe(750);
    expect(dataSource.transaction).toHaveBeenCalled();
  });

  it('rejects manual payment state changes', async () => {
    orderRepository.findOne.mockResolvedValue({ ...mockOrder });

    await expect(
      ordersService.updateOrder(
        'order-id',
        { state: StateEnum.Paid as StateEnum.Cancelled },
        adminUser,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('allows admin notes on cancelled orders', async () => {
    orderRepository.findOne.mockResolvedValue({
      ...mockOrder,
      state: StateEnum.Cancelled,
    });

    const result = await ordersService.addAdminNote(
      'order-id',
      'Seguimiento post-cancelación',
      adminUser,
    );

    expect(result.note.text).toBe('Seguimiento post-cancelación');
  });

  it('hides cancelled orders from public findOneById', async () => {
    orderRepository.findOne.mockResolvedValue({
      ...mockOrder,
      state: StateEnum.Cancelled,
    });

    await expect(ordersService.findOneById('order-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('blocks edits on cancelled orders', async () => {
    orderRepository.findOne.mockResolvedValue({
      ...mockOrder,
      state: StateEnum.Cancelled,
    });

    await expect(
      ordersService.updateOrder(
        'order-id',
        { depositAmount: 100 },
        adminUser,
      ),
    ).rejects.toThrow(ConflictException);
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
    expect(result.remainingBalance).toBe(1500);
    expect(result.depositAmount).toBe(0);
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
