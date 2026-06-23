import { Injectable, Logger } from '@nestjs/common';
import { envs } from 'src/config/envs';
import { EmailSender } from '../email-sender.interface';
import { SendOrderConfirmationPayload } from '../send-order-confirmation.payload';

const BREVO_SEND_EMAIL_URL = 'https://api.brevo.com/v3/smtp/email';
const BREVO_FETCH_TIMEOUT_MS = 15_000;

@Injectable()
export class BrevoEmailSender implements EmailSender {
  private readonly logger = new Logger(BrevoEmailSender.name);

  async sendOrderConfirmation(
    payload: SendOrderConfirmationPayload,
  ): Promise<void> {
    try {
      const response = await fetch(BREVO_SEND_EMAIL_URL, {
        method: 'POST',
        headers: {
          'api-key': envs.BREVO_API_KEY,
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'SaphireSouvenirs', email: envs.EMAIL_FROM },
          to: [{ email: payload.to }],
          cc: [{ email: payload.cc }],
          subject: payload.subject,
          htmlContent: payload.html,
        }),
        signal: AbortSignal.timeout(BREVO_FETCH_TIMEOUT_MS),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.warn(
          `Order confirmation email failed for ${payload.orderId}: HTTP ${response.status} ${errorBody}`,
        );
        return;
      }

      const responseBody = (await response.json()) as { messageId?: string };
      this.logger.log(
        `Order confirmation email sent for ${payload.orderId}: ${responseBody.messageId ?? 'ok'}`,
      );
    } catch (error: unknown) {
      this.logger.warn(
        `Order confirmation email failed for ${payload.orderId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
