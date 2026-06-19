export interface SendOrderConfirmationPayload {
  to: string;
  cc: string;
  subject: string;
  html: string;
  orderId: string;
}
