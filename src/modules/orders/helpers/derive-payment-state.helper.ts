import { StateEnum } from 'src/enums/states.enum';

export function derivePaymentState(
  depositAmount: number,
  totalPrice: number,
): StateEnum.InProcess | StateEnum.PartialPayment | StateEnum.Paid {
  if (depositAmount <= 0) {
    return StateEnum.InProcess;
  }

  if (depositAmount >= totalPrice) {
    return StateEnum.Paid;
  }

  return StateEnum.PartialPayment;
}

export function computeRemainingBalance(
  totalPrice: number,
  depositAmount: number,
): number {
  return Math.max(0, totalPrice - depositAmount);
}
