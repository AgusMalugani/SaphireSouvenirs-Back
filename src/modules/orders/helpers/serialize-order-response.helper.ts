import { Order } from '../entities/order.entity';
import { computeRemainingBalance } from './derive-payment-state.helper';

export type OrderWithRemainingBalance = Order & { remainingBalance: number };

export function serializeOrderWithBalance(
  order: Order,
): OrderWithRemainingBalance {
  const depositAmount = order.depositAmount ?? 0;

  return {
    ...order,
    depositAmount,
    remainingBalance: computeRemainingBalance(order.totalPrice, depositAmount),
  };
}
