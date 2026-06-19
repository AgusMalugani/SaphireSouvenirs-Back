import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { envs } from 'src/config/envs';
import { EmailSender } from '../email/email-sender.interface';
import { SendOrderConfirmationPayload } from '../email/send-order-confirmation.payload';

@Injectable()
export class NodemailerEmailSender implements EmailSender {
  private readonly logger = new Logger(NodemailerEmailSender.name);
  private readonly transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: envs.NODEMAILER_USER,
        pass: envs.NODEMAILER_PASS,
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }

  async sendOrderConfirmation(
    payload: SendOrderConfirmationPayload,
  ): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: `"SaphireSouvenirs" <${envs.NODEMAILER_FROM}>`,
        to: [payload.to, payload.cc],
        subject: payload.subject,
        html: payload.html,
      });

      this.logger.log(
        `Order confirmation email sent for ${payload.orderId}: ${info.messageId}`,
      );
    } catch (error: unknown) {
      this.logger.warn(
        `Order confirmation email failed for ${payload.orderId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
