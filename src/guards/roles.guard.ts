import { BadRequestException, CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor( private readonly reflector : Reflector ){}
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
const rolesRequeridos = this.reflector.getAllAndOverride<string[]>("roles",[context.getHandler(),context.getClass()])
    const request = context.switchToHttp().getRequest();
    const user = request.user;
if(!user || !user.roles ){
throw new BadRequestException("No existe usuario en la request con roles")
}

const tieneRol= ()=>rolesRequeridos?.some(role => user?.roles?.includes(role) ) 

const valid = user && user.roles && tieneRol();

if(!valid){
  throw new ForbiddenException("No tiene el rol necesario para ingresar a este endpoint");
}


    return valid;
  }
}
