import { Module } from '@nestjs/common';
import { EMAIL_SENDER } from './email-sender.token';
import { BrevoEmailSender } from './brevo/brevo-email.sender';

@Module({
  providers: [
    {
      provide: EMAIL_SENDER,
      useClass: BrevoEmailSender,
    },
  ],
  exports: [EMAIL_SENDER],
})
export class EmailModule {}
