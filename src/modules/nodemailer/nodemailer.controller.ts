import { Controller, Get, Param } from '@nestjs/common';
import { NodemailerService } from './nodemailer.service';

@Controller('nodemailer')
export class NodemailerController {
  constructor(private readonly nodemailerService: NodemailerService) {  }

  
@Get(":email")
async sendEmail(@Param("email") email:string ){
  console.log(email);
  
const response = await this.nodemailerService.sendEmail(email);
return response

}


}
