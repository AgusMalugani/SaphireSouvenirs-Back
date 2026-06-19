import { Module } from '@nestjs/common';
import { EMAIL_SENDER } from '../email/email-sender.token';
import { NodemailerEmailSender } from './nodemailer-email.sender';

@Module({
  providers: [
    {
      provide: EMAIL_SENDER,
      useClass: NodemailerEmailSender,
    },
  ],
  exports: [EMAIL_SENDER],
})
export class NodemailerModule {}
