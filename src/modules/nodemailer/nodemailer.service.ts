import { ConflictException, Injectable } from '@nestjs/common';

import * as nodemailer from "nodemailer"



@Injectable()
export class NodemailerService {
private transporter : nodemailer.Transporter;
constructor(){
    this.transporter= nodemailer.createTransport({
       service:"gmail",
        auth: {
          user:process.env.NODEMAILER_USER,
          pass:process.env.NODEMAILER_PASS,
        },
    })
    
}

async sendEmail(email: string,  htmlContent: string) {
    console.log(process.env.NODEMAILER_USER);
    console.log(process.env.NODEMAILER_PASS);
  try {
      const info = await this.transporter.sendMail({
          from: '"SaphireSouvenirs" <hogwarts.back.henry@gmail.com>', //CAMBIAR MAIL
          to: [email, "agusmalugani97@gmail.com"], //CAMBIAR MAIL
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
