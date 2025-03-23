import { BadRequestException, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import * as dayjs from "dayjs"

@Injectable()
export class ValidateEndOrderMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
const{endOrder} = req.body;

    if(!dayjs(endOrder,"YYYY-MM-DD",true).isValid()){ //fecha de la fiesta
      throw new BadRequestException("El formato de la fecha esta mal, debe ser YYYY-MM-DD");
    }

    if(dayjs().isSame(endOrder, 'day') || dayjs().isAfter(endOrder,"day") ){
      throw new BadRequestException("Los pedidos deben programarse con anticipación")
    } // ni el mismo ni antes

    if (dayjs(endOrder).isBefore(dayjs().add(7, 'day'), 'day')) {
      throw new BadRequestException("La fecha de entrega debe ser al menos 7 días después de hoy");
  } // verifica q la fecha de entrega sea almenos 7 dias desp de hoy

  next();
  }
}
