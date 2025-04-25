import { ConflictException, Injectable } from '@nestjs/common';

import * as nodemailer from "nodemailer"

@Injectable()
export class NodemailerService {
private transporter : nodemailer.Transporter;
constructor(){
    this.transporter= nodemailer.createTransport({
       service:"gmail",
        auth: {
          user: "hogwarts.back.henry@gmail.com",
          pass: "bwxm wlhe ndil dnsq",
        },
    })
}

async sendEmail(email: string,  htmlContent: string) {
  try {
      const info = await this.transporter.sendMail({
          from: '"SaphireSouvenirs 👻" <hogwarts.back.henry@gmail.com>',
          to: email,
          subject: "Confirmación de Pedido ✔",
          html: htmlContent,
      });

      console.log("Message sent: %s", info.messageId);
      return info;
  } catch (error) {
      console.error('Error sending email:', error);
      throw new ConflictException('Error sending email');
  }
}

    
}
