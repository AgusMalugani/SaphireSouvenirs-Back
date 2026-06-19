import { SendOrderConfirmationPayload } from './send-order-confirmation.payload';

export interface EmailSender {
  sendOrderConfirmation(payload: SendOrderConfirmationPayload): Promise<void>;
}
