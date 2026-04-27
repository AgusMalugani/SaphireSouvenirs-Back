import { ConflictException, Injectable } from '@nestjs/common';

import * as nodemailer from "nodemailer"
import { envs } from 'src/config/envs';



@Injectable()
export class NodemailerService {
private transporter : nodemailer.Transporter;
constructor(){
    this.transporter= nodemailer.createTransport({
       service:"gmail",
        auth: {
          user:envs.NODEMAILER_USER,
          pass:envs.NODEMAILER_PASS,
        },
    })
    
}

async sendEmail(email: string,  htmlContent: string) {
  try {
      const info = await this.transporter.sendMail({
          from: `"SaphireSouvenirs" <${envs.NODEMAILER_FROM}>`,
          to: [email, envs.NODEMAILER_CC],
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
