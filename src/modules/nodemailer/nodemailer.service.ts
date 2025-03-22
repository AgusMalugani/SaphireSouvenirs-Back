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
async sendEmail(email:string,urlOrder:string){
    try {
        const info = await this.transporter.sendMail({
            from: '"SaphireSouvenirs 👻"hogwarts.back.henry@gmail.com', // sender address
            to: email, // list of receivers
            subject: "Hello ✔", // Subject line
            text: "Hello world?", // plain text body
            html: `
            <b>Compra realizada</b>
           <b> ${urlOrder} </b>
            
            `

            , // html body
          });
          console.log("Message sent: %s", info.messageId);      
          return info   
    } catch (error) {
        console.error('Error sending email:', error);
        throw new ConflictException('Error sending email');
      }   
    }


    
}
