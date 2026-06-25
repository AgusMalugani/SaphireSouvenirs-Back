import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { Brackets, DataSource, EntityManager, Repository } from 'typeorm';
import { OrderdetailsService } from './../orderdetails/orderdetails.service';
import * as dayjs from 'dayjs';
import { envs } from 'src/config/envs';
import { EMAIL_SENDER } from '../email/email-sender.token';
import { EmailSender } from '../email/email-sender.interface';
import { Orderdetail } from '../orderdetails/entities/orderdetail.entity';
import { CreateOrderdetailDto } from '../orderdetails/dto/create-orderdetail.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { UpdateOrderAdminDto } from './dto/update-order-admin.dto';
import { OrderTimelineEvent } from './entities/order-timeline-event.entity';
import { OrderAdminNote } from './entities/order-admin-note.entity';
import { OrderTimelineEventType } from './enums/order-timeline-event-type.enum';
import { AuthenticatedAdminUser } from './interfaces/authenticated-admin-user.interface';
import { User } from '../users/entities/user.entity';
import {
  SerializedAdminNote,
  SerializedTimelineEvent,
} from './interfaces/order-admin-responses.interface';
import { StateEnum } from 'src/enums/states.enum';
import {
  computeRemainingBalance,
  derivePaymentState,
} from './helpers/derive-payment-state.helper';
import {
  OrderWithRemainingBalance,
  serializeOrderWithBalance,
} from './helpers/serialize-order-response.helper';

interface BuildOrderConfirmationHtmlInput {
  nameClient: string;
  order: Order;
  orderDetails: Orderdetail[];
  total: number;
}

interface PersistedOrderResult {
  order: Order;
  orderDetails: Orderdetail[];
  total: number;
}

export interface OrderListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedOrdersResponse {
  data: OrderWithRemainingBalance[];
  meta: OrderListMeta;
}

interface LoadOrderOptions {
  allowCancelled: boolean;
}

interface OrderFieldSnapshot {
  nameClient: string;
  personalizationName: string;
  email: string;
  numCel: string;
  num2Cel?: string;
  theme: string;
  address: string;
  endOrder: string;
  transactionType: Order['transactionType'];
  depositAmount: number;
  totalPrice: number;
}

interface UpdateOrderMutationResult {
  paymentChanged: boolean;
  orderEdited: boolean;
  deliveryOnlyChanged: boolean;
  productsChanged: boolean;
  previousDeposit: number;
  previousSnapshot: OrderFieldSnapshot;
}

interface RecordTimelineEventInput {
  order: Order;
  type: OrderTimelineEventType;
  payload: Record<string, unknown>;
  createdByUserId: string | null;
  transactionManager: EntityManager;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderTimelineEvent)
    private readonly timelineEventRepository: Repository<OrderTimelineEvent>,
    @InjectRepository(OrderAdminNote)
    private readonly adminNoteRepository: Repository<OrderAdminNote>,
    private readonly orderDetailsService: OrderdetailsService,
    @Inject(EMAIL_SENDER)
    private readonly emailSender: EmailSender,
    private readonly dataSource: DataSource,
  ) {}

  async create(createOrderDto: CreateOrderDto) {
    const {
      endOrder,
      nameClient,
      personalizationName,
      num2Cel,
      numCel,
      theme,
      transactionType,
      products,
      address,
      email,
    } = createOrderDto;

    const createAt = dayjs().format('YYYY-MM-DD');

    const { order, orderDetails, total } =
      await this.dataSource.transaction<PersistedOrderResult>(
        async (transactionManager) => {
          const orderRepository = transactionManager.getRepository(Order);

          const orderSchema = orderRepository.create({
            createAt,
            endOrder,
            transactionType,
            nameClient,
            personalizationName,
            theme,
            num2Cel,
            numCel,
            address,
            email,
            totalPrice: 0,
            depositAmount: 0,
          });

          const savedOrder = await orderRepository.save(orderSchema);

          const orderDetailsList = await Promise.all(
            products.map(async (productItem) =>
              this.orderDetailsService.create(
                productItem,
                savedOrder,
                transactionManager,
              ),
            ),
          );

          let orderTotal = 0;
          for (const orderDetail of orderDetailsList) {
            orderTotal += orderDetail.subTotal;
          }

          savedOrder.orderDetails = orderDetailsList;
          savedOrder.totalPrice = orderTotal;

          const persistedOrder = await orderRepository.save(savedOrder);

          await this.recordTimelineEvent({
            order: persistedOrder,
            type: OrderTimelineEventType.Created,
            payload: {},
            createdByUserId: null,
            transactionManager,
          });

          return {
            order: persistedOrder,
            orderDetails: orderDetailsList,
            total: orderTotal,
          };
        },
      );

    const emailHtml = this.buildOrderConfirmationHtml({
      nameClient,
      order,
      orderDetails,
      total,
    });

    void this.emailSender
      .sendOrderConfirmation({
        to: email,
        cc: envs.EMAIL_CC,
        subject: 'Confirmación de Pedido ✔',
        html: emailHtml,
        orderId: order.id,
      })
      .catch((error: unknown) => {
        this.logger.warn(
          `Order confirmation email failed for ${order.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      });

    return serializeOrderWithBalance(order);
  }

  private buildOrderConfirmationHtml(
    input: BuildOrderConfirmationHtmlInput,
  ): string {
    const { nameClient, order, orderDetails, total } = input;

    const orderItemsHtml = orderDetails
      .map((orderDetail) => {
        return `
          <tr>
            <td style="padding:12px 0;font-size:14px;color:#44403c;border-bottom:1px solid #f5f0ed;">${orderDetail.product.name}</td>
            <td style="padding:12px 0;font-size:14px;color:#78716c;text-align:center;border-bottom:1px solid #f5f0ed;">${orderDetail.cuantity}</td>
            <td style="padding:12px 0;font-size:14px;color:#78716c;text-align:right;border-bottom:1px solid #f5f0ed;">$${orderDetail.product.price.toFixed(2)}</td>
            <td style="padding:12px 0;font-size:14px;font-weight:600;color:#44403c;text-align:right;border-bottom:1px solid #f5f0ed;">$${orderDetail.subTotal.toFixed(2)}</td>
          </tr>
        `;
      })
      .join('');

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmación de Pedido</title>
</head>
<body style="margin:0;padding:0;background-color:#fafafa;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa;padding:40px 16px;">
    <tr>
      <td align="center">

        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;border:1px solid #f0ece8;overflow:hidden;">

          <tr>
            <td style="background:linear-gradient(135deg,#fb7185,#f43f5e);padding:40px 32px;text-align:center;">
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:28px;color:#ffffff;font-weight:700;letter-spacing:2px;">
                ✦ SaphireSouvenirs ✦
              </h1>
              <p style="margin:10px 0 0;font-size:15px;color:rgba(255,255,255,0.85);font-style:italic;letter-spacing:0.5px;">
                ¡Gracias por tu compra!
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:36px 40px 0;">
              <h2 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#fb7185;font-weight:600;">
                Hola, ${nameClient} 🌸
              </h2>
              <p style="margin:12px 0 0;font-size:15px;color:#78716c;line-height:1.7;">
                Recibimos tu pedido con éxito. A continuación encontrarás el resumen detallado de tu compra. Gracias por elegirnos.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 40px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <thead>
                  <tr style="border-bottom:2px solid #f5f0ed;">
                    <th style="padding:10px 0;text-align:left;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#a8a29e;">Producto</th>
                    <th style="padding:10px 0;text-align:center;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#a8a29e;">Cant.</th>
                    <th style="padding:10px 0;text-align:right;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#a8a29e;">Precio</th>
                    <th style="padding:10px 0;text-align:right;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#a8a29e;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${orderItemsHtml}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="3" style="padding:20px 0 0;text-align:right;font-size:14px;color:#78716c;font-weight:500;">Total del pedido:</td>
                    <td style="padding:20px 0 0;text-align:right;font-size:22px;font-weight:700;color:#fb7185;font-family:Georgia,'Times New Roman',serif;">$${total.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:40px;text-align:center;">
              <a href="${envs.URL_CLIENT}/post-shop/${order.id}"
                 style="display:inline-block;padding:15px 44px;background:linear-gradient(135deg,#fb7185,#f43f5e);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:50px;letter-spacing:0.5px;">
                Ver detalle de mi pedido →
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background-color:#f5f0ed;"></div>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 40px 36px;text-align:center;">
              <p style="margin:0 0 16px;font-size:13px;color:#a8a29e;letter-spacing:0.5px;">
                Seguinos en nuestras redes
              </p>
              <p style="margin:0 0 20px;">
                <a href="https://www.instagram.com/saphire_souvenirs/"
                   style="display:inline-block;margin:0 6px;padding:9px 22px;background:#fdf2f5;border:1px solid #fce7ed;border-radius:50px;font-size:13px;font-weight:600;color:#fb7185;text-decoration:none;">
                  ◈ Instagram
                </a>
                <a href="https://wa.me/5493417120039"
                   style="display:inline-block;margin:0 6px;padding:9px 22px;background:#fdf2f5;border:1px solid #fce7ed;border-radius:50px;font-size:13px;font-weight:600;color:#fb7185;text-decoration:none;">
                  ◈ WhatsApp
                </a>
              </p>
              <p style="margin:0;font-size:12px;color:#d6d3d1;line-height:1.6;">
                © ${new Date().getFullYear()} SaphireSouvenirs · Souvenir con amor ✦<br/>
                <span style="font-size:11px;">Si tenés alguna consulta, respondé este correo o escribinos por WhatsApp.</span>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
    `;
  }

  async findAllPaginated(
    query: ListOrdersQueryDto,
  ): Promise<PaginatedOrdersResponse> {
    const { state, transactionType, q, page, limit, sort, order } = query;
    const sortDirection = order.toUpperCase() as 'ASC' | 'DESC';
    const skip = (page - 1) * limit;

    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.orderDetails', 'orderDetails')
      .leftJoinAndSelect('orderDetails.product', 'product');

    if (state) {
      queryBuilder.andWhere('order.state = :state', { state });
    } else {
      queryBuilder.andWhere('order.state != :cancelledState', {
        cancelledState: StateEnum.Cancelled,
      });
    }

    if (transactionType) {
      queryBuilder.andWhere('order.transactionType = :transactionType', {
        transactionType,
      });
    }

    const trimmedSearch = q?.trim();
    if (trimmedSearch) {
      const searchPattern = `%${trimmedSearch}%`;
      queryBuilder.andWhere(
        new Brackets((searchBracket) => {
          searchBracket
            .where('order.nameClient ILIKE :searchPattern', { searchPattern })
            .orWhere('order.email ILIKE :searchPattern', { searchPattern })
            .orWhere('order.numCel ILIKE :searchPattern', { searchPattern })
            .orWhere('order.num2Cel ILIKE :searchPattern', { searchPattern })
            .orWhere('order.theme ILIKE :searchPattern', { searchPattern })
            .orWhere('order.address ILIKE :searchPattern', { searchPattern });
        }),
      );
    }

    if (sort !== 'createAt') {
      throw new BadRequestException('sort inválido: solo createAt está permitido');
    }

    queryBuilder
      .orderBy('order.createAt', sortDirection)
      .skip(skip)
      .take(limit);

    const [orders, total] = await queryBuilder.getManyAndCount();
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      data: orders.map((orderItem) => serializeOrderWithBalance(orderItem)),
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  private async loadOrderById(
    orderId: string,
    loadOrderOptions: LoadOrderOptions,
  ): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: { orderDetails: { product: true } },
    });

    if (!order) {
      throw new NotFoundException('No hay orden con esa id');
    }

    if (
      !loadOrderOptions.allowCancelled &&
      order.state === StateEnum.Cancelled
    ) {
      throw new NotFoundException('No hay orden con esa id');
    }

    return order;
  }

  async findOneById(orderId: string): Promise<OrderWithRemainingBalance> {
    const order = await this.loadOrderById(orderId, { allowCancelled: false });
    return serializeOrderWithBalance(order);
  }

  async findAdminById(orderId: string) {
    const order = await this.loadOrderById(orderId, { allowCancelled: true });

    const timelineEvents = await this.timelineEventRepository.find({
      where: { order: { id: orderId } },
      relations: { createdByUser: true },
      order: { createdAt: 'ASC' },
    });

    const adminNotes = await this.adminNoteRepository.find({
      where: { order: { id: orderId } },
      relations: { createdByUser: true },
      order: { createdAt: 'ASC' },
    });

    return {
      ...serializeOrderWithBalance(order),
      timeline: timelineEvents.map((event) => this.mapTimelineEvent(event)),
      notes: adminNotes.map((note) => this.mapAdminNote(note)),
    };
  }

  async updateOrder(
    orderId: string,
    updateOrderAdminDto: UpdateOrderAdminDto,
    adminUser: AuthenticatedAdminUser,
  ): Promise<OrderWithRemainingBalance> {
    const order = await this.loadOrderById(orderId, { allowCancelled: true });

    const isCancelRequest = updateOrderAdminDto.state === StateEnum.Cancelled;

    if (
      updateOrderAdminDto.state !== undefined &&
      updateOrderAdminDto.state !== StateEnum.Cancelled
    ) {
      throw new BadRequestException(
        'state solo admite cancelled; el estado de pago se deriva de depositAmount',
      );
    }

    if (isCancelRequest && updateOrderAdminDto.depositAmount !== undefined) {
      throw new BadRequestException(
        'No se puede cancelar y actualizar la seña en la misma solicitud',
      );
    }

    if (isCancelRequest) {
      const cancelledOrder = await this.handleCancelOrder(
        order,
        updateOrderAdminDto.cancelReason,
        adminUser,
      );
      return serializeOrderWithBalance(cancelledOrder);
    }

    if (order.state === StateEnum.Cancelled) {
      throw new ConflictException('El pedido cancelado no puede editarse');
    }

    return this.dataSource.transaction(async (transactionManager) => {
      const mutationResult = await this.applyOrderUpdates(
        order,
        updateOrderAdminDto,
        transactionManager,
      );

      if (
        !mutationResult.paymentChanged &&
        !mutationResult.orderEdited &&
        !mutationResult.deliveryOnlyChanged
      ) {
        return serializeOrderWithBalance(order);
      }

      this.validateDepositAgainstTotal(order.depositAmount ?? 0, order.totalPrice);
      this.applyDerivedPaymentState(order);

      const orderRepository = transactionManager.getRepository(Order);
      const savedOrder = await orderRepository.save(order);

      await this.recordUpdateSideEffects(
        savedOrder,
        adminUser,
        mutationResult,
        transactionManager,
      );

      const reloadedOrder = await orderRepository.findOne({
        where: { id: savedOrder.id },
        relations: { orderDetails: { product: true } },
      });

      return serializeOrderWithBalance(reloadedOrder ?? savedOrder);
    });
  }

  private async handleCancelOrder(
    order: Order,
    cancelReason: string | undefined,
    adminUser: AuthenticatedAdminUser,
  ): Promise<Order> {
    if (order.state === StateEnum.Cancelled) {
      return order;
    }

    if (order.state === StateEnum.Paid) {
      throw new ConflictException('No se puede cancelar un pedido pagado');
    }

    const previousState = order.state;
    order.state = StateEnum.Cancelled;

    return this.dataSource.transaction(async (transactionManager) => {
      const orderRepository = transactionManager.getRepository(Order);
      const savedOrder = await orderRepository.save(order);

      await this.recordTimelineEvent({
        order: savedOrder,
        type: OrderTimelineEventType.OrderCancelled,
        payload: {
          previousState,
          ...(cancelReason?.trim() && { reason: cancelReason.trim() }),
        },
        createdByUserId: adminUser.id,
        transactionManager,
      });

      const noteText = cancelReason?.trim()
        ? `Pedido cancelado. Motivo: ${cancelReason.trim()}`
        : 'Pedido cancelado.';

      await this.createSystemAdminNote(
        savedOrder,
        noteText,
        adminUser,
        transactionManager,
      );

      return savedOrder;
    });
  }

  private async applyOrderUpdates(
    order: Order,
    updateOrderAdminDto: UpdateOrderAdminDto,
    transactionManager: EntityManager,
  ): Promise<UpdateOrderMutationResult> {
    const previousSnapshot = this.snapshotOrderFields(order);
    const previousDeposit = order.depositAmount ?? 0;
    let productsChanged = false;

    if (updateOrderAdminDto.products !== undefined) {
      const replaceResult = await this.replaceOrderDetails(
        order,
        updateOrderAdminDto.products,
        transactionManager,
      );
      order.orderDetails = replaceResult.orderDetails;
      order.totalPrice = replaceResult.totalPrice;
      productsChanged = true;
    }

    if (updateOrderAdminDto.depositAmount !== undefined) {
      order.depositAmount = updateOrderAdminDto.depositAmount;
    }

    if (updateOrderAdminDto.nameClient !== undefined) {
      order.nameClient = updateOrderAdminDto.nameClient;
    }
    if (updateOrderAdminDto.personalizationName !== undefined) {
      order.personalizationName = updateOrderAdminDto.personalizationName;
    }
    if (updateOrderAdminDto.email !== undefined) {
      order.email = updateOrderAdminDto.email;
    }
    if (updateOrderAdminDto.numCel !== undefined) {
      order.numCel = updateOrderAdminDto.numCel;
    }
    if (updateOrderAdminDto.num2Cel !== undefined) {
      order.num2Cel = updateOrderAdminDto.num2Cel;
    }
    if (updateOrderAdminDto.theme !== undefined) {
      order.theme = updateOrderAdminDto.theme;
    }
    if (updateOrderAdminDto.address !== undefined) {
      order.address = updateOrderAdminDto.address;
    }
    if (updateOrderAdminDto.endOrder !== undefined) {
      order.endOrder = updateOrderAdminDto.endOrder;
    }
    if (updateOrderAdminDto.transactionType !== undefined) {
      order.transactionType = updateOrderAdminDto.transactionType;
    }

    const paymentChanged =
      updateOrderAdminDto.depositAmount !== undefined &&
      updateOrderAdminDto.depositAmount !== previousDeposit;

    const deliveryChanged =
      (updateOrderAdminDto.transactionType !== undefined &&
        updateOrderAdminDto.transactionType !==
          previousSnapshot.transactionType) ||
      (updateOrderAdminDto.address !== undefined &&
        updateOrderAdminDto.address !== previousSnapshot.address);

    const nonDeliveryFieldChanged =
      (updateOrderAdminDto.nameClient !== undefined &&
        updateOrderAdminDto.nameClient !== previousSnapshot.nameClient) ||
      (updateOrderAdminDto.personalizationName !== undefined &&
        updateOrderAdminDto.personalizationName !==
          previousSnapshot.personalizationName) ||
      (updateOrderAdminDto.email !== undefined &&
        updateOrderAdminDto.email !== previousSnapshot.email) ||
      (updateOrderAdminDto.numCel !== undefined &&
        updateOrderAdminDto.numCel !== previousSnapshot.numCel) ||
      (updateOrderAdminDto.num2Cel !== undefined &&
        updateOrderAdminDto.num2Cel !== previousSnapshot.num2Cel) ||
      (updateOrderAdminDto.theme !== undefined &&
        updateOrderAdminDto.theme !== previousSnapshot.theme) ||
      (updateOrderAdminDto.endOrder !== undefined &&
        updateOrderAdminDto.endOrder !== previousSnapshot.endOrder);

    const orderEdited = productsChanged || nonDeliveryFieldChanged || deliveryChanged;
    const deliveryOnlyChanged =
      deliveryChanged && !productsChanged && !nonDeliveryFieldChanged && !paymentChanged;

    return {
      paymentChanged,
      orderEdited: orderEdited && !deliveryOnlyChanged,
      deliveryOnlyChanged,
      productsChanged,
      previousDeposit,
      previousSnapshot,
    };
  }

  private async replaceOrderDetails(
    order: Order,
    products: CreateOrderdetailDto[],
    transactionManager: EntityManager,
  ): Promise<{ orderDetails: Orderdetail[]; totalPrice: number }> {
    const orderDetailRepository = transactionManager.getRepository(Orderdetail);
    await orderDetailRepository.delete({ order: { id: order.id } });

    const orderDetailsList = await Promise.all(
      products.map(async (productItem) =>
        this.orderDetailsService.create(
          productItem,
          order,
          transactionManager,
        ),
      ),
    );

    let orderTotal = 0;
    for (const orderDetail of orderDetailsList) {
      orderTotal += orderDetail.subTotal;
    }

    return { orderDetails: orderDetailsList, totalPrice: orderTotal };
  }

  private validateDepositAgainstTotal(
    depositAmount: number,
    totalPrice: number,
  ): void {
    if (depositAmount < 0 || depositAmount > totalPrice) {
      throw new BadRequestException(
        'depositAmount debe estar entre 0 y el total del pedido',
      );
    }
  }

  private applyDerivedPaymentState(order: Order): void {
    if (order.state === StateEnum.Cancelled) {
      return;
    }

    order.state = derivePaymentState(
      order.depositAmount ?? 0,
      order.totalPrice,
    );
  }

  private snapshotOrderFields(order: Order): OrderFieldSnapshot {
    return {
      nameClient: order.nameClient,
      personalizationName: order.personalizationName,
      email: order.email,
      numCel: order.numCel,
      num2Cel: order.num2Cel,
      theme: order.theme,
      address: order.address,
      endOrder: order.endOrder,
      transactionType: order.transactionType,
      depositAmount: order.depositAmount ?? 0,
      totalPrice: order.totalPrice,
    };
  }

  private async recordUpdateSideEffects(
    order: Order,
    adminUser: AuthenticatedAdminUser,
    mutationResult: UpdateOrderMutationResult,
    transactionManager: EntityManager,
  ): Promise<void> {
    const noteLines: string[] = [];

    if (mutationResult.paymentChanged) {
      const remainingBalance = computeRemainingBalance(
        order.totalPrice,
        order.depositAmount ?? 0,
      );

      await this.recordTimelineEvent({
        order,
        type: OrderTimelineEventType.PaymentUpdated,
        payload: {
          fromDeposit: mutationResult.previousDeposit,
          toDeposit: order.depositAmount ?? 0,
          totalPrice: order.totalPrice,
          remainingBalance,
        },
        createdByUserId: adminUser.id,
        transactionManager,
      });

      noteLines.push(
        `seña $${mutationResult.previousDeposit} → $${order.depositAmount ?? 0}`,
      );
    }

    if (mutationResult.deliveryOnlyChanged) {
      // transaction_changed solo cuando cambian datos de entrega sin otras ediciones (C3).
      const previousSnapshot = mutationResult.previousSnapshot;

      await this.recordTimelineEvent({
        order,
        type: OrderTimelineEventType.TransactionChanged,
        payload: {
          ...(previousSnapshot.transactionType !== order.transactionType && {
            fromTransactionType: previousSnapshot.transactionType,
            toTransactionType: order.transactionType,
          }),
          ...(previousSnapshot.address !== order.address && {
            fromAddress: previousSnapshot.address,
            toAddress: order.address,
          }),
        },
        createdByUserId: adminUser.id,
        transactionManager,
      });

      noteLines.push('datos de entrega actualizados');
    }

    if (mutationResult.orderEdited) {
      const changes = this.buildOrderChanges(
        mutationResult.previousSnapshot,
        order,
      );

      await this.recordTimelineEvent({
        order,
        type: OrderTimelineEventType.OrderEdited,
        payload: {
          fields: Object.keys(changes),
          changes,
          productsChanged: mutationResult.productsChanged,
        },
        createdByUserId: adminUser.id,
        transactionManager,
      });

      if (mutationResult.productsChanged) {
        noteLines.push(
          `productos actualizados (${order.orderDetails?.length ?? 0} ítems)`,
        );
      }

      const editedFieldLabels = Object.keys(changes).filter(
        (fieldName) => fieldName !== 'totalPrice' && fieldName !== 'depositAmount',
      );
      if (editedFieldLabels.length > 0) {
        noteLines.push(`campos: ${editedFieldLabels.join(', ')}`);
      }
    }

    if (noteLines.length > 0) {
      await this.createSystemAdminNote(
        order,
        `Pedido modificado: ${noteLines.join('; ')}.`,
        adminUser,
        transactionManager,
      );
    }
  }

  private buildOrderChanges(
    previousSnapshot: OrderFieldSnapshot,
    order: Order,
  ): Record<string, { from: unknown; to: unknown }> {
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    const trackedFields: Array<keyof OrderFieldSnapshot> = [
      'nameClient',
      'personalizationName',
      'email',
      'numCel',
      'num2Cel',
      'theme',
      'address',
      'endOrder',
      'transactionType',
      'totalPrice',
    ];

    for (const fieldName of trackedFields) {
      const previousValue = previousSnapshot[fieldName];
      const nextValue = order[fieldName as keyof Order];
      if (previousValue !== nextValue) {
        changes[fieldName] = { from: previousValue, to: nextValue };
      }
    }

    return changes;
  }

  private async createSystemAdminNote(
    order: Order,
    noteText: string,
    adminUser: AuthenticatedAdminUser,
    transactionManager: EntityManager,
  ): Promise<void> {
    const adminNoteRepository =
      transactionManager.getRepository(OrderAdminNote);

    const adminNote = adminNoteRepository.create({
      order,
      text: noteText,
      createdByUser: { id: adminUser.id } as User,
    });

    await adminNoteRepository.save(adminNote);
  }

  async addAdminNote(
    orderId: string,
    noteText: string,
    adminUser: AuthenticatedAdminUser,
  ): Promise<{ note: SerializedAdminNote }> {
    const order = await this.loadOrderById(orderId, { allowCancelled: true });

    return this.dataSource.transaction(async (transactionManager) => {
      const adminNoteRepository =
        transactionManager.getRepository(OrderAdminNote);

      const adminNote = adminNoteRepository.create({
        order,
        text: noteText,
        createdByUser: { id: adminUser.id } as User,
      });

      const savedNote = await adminNoteRepository.save(adminNote);
      savedNote.createdByUser = {
        id: adminUser.id,
        email: adminUser.email,
      } as User;

      await this.recordTimelineEvent({
        order,
        type: OrderTimelineEventType.AdminNoteAdded,
        payload: { note: noteText },
        createdByUserId: adminUser.id,
        transactionManager,
      });

      return { note: this.mapAdminNote(savedNote) };
    });
  }

  private async recordTimelineEvent(
    input: RecordTimelineEventInput,
  ): Promise<OrderTimelineEvent> {
    const timelineRepository = input.transactionManager.getRepository(
      OrderTimelineEvent,
    );

    const timelineEvent = timelineRepository.create({
      order: input.order,
      type: input.type,
      payload: input.payload,
      createdByUser: input.createdByUserId
        ? ({ id: input.createdByUserId } as User)
        : null,
    });

    return timelineRepository.save(timelineEvent);
  }

  private mapTimelineEvent(
    timelineEvent: OrderTimelineEvent,
  ): SerializedTimelineEvent {
    const serializedEvent: SerializedTimelineEvent = {
      id: timelineEvent.id,
      type: timelineEvent.type,
      payload: timelineEvent.payload,
      createdAt: timelineEvent.createdAt.toISOString(),
    };

    if (timelineEvent.createdByUser) {
      serializedEvent.createdBy = {
        id: timelineEvent.createdByUser.id,
        email: timelineEvent.createdByUser.email,
      };
    }

    return serializedEvent;
  }

  private mapAdminNote(adminNote: OrderAdminNote): SerializedAdminNote {
    return {
      id: adminNote.id,
      text: adminNote.text,
      createdAt: adminNote.createdAt.toISOString(),
      createdBy: {
        id: adminNote.createdByUser.id,
        email: adminNote.createdByUser.email,
      },
    };
  }

  remove(id: number) {
    return `This action removes a #${id} order`;
  }
}
