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
  console.log('NODEMAILER_PASS:', process.env.NODEMAILER_PASS ? '✅' : '❌ No password');
  try {
      const info = await this.transporter.sendMail({
          from: '"SaphireSouvenirs" <hogwarts.back.henry@gmail.com>', //CAMBIAR MAIL
          to: [email, "agusmalugani97@gmail.com"], //CAMBIAR MAIL
          subject: "Confirmación de Pedido ✔",
          html: htmlContent,
      });

      console.log("Message sent: %s", info.messageId);
      console.log("Info completo:", JSON.stringify(info, null, 2));

      return info; 
  } catch (error) {
    
    console.error('❌ Error enviando el email:');
      console.error(error);
      throw new ConflictException('Error sending email');
  }
}

    
}
