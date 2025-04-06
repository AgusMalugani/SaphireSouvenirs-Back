import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { SigninDto } from './dto/signin.dto';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from '../users/dto/create-user.dto';
import * as bcrypt from "bcryptjs"
import { ResponseUserDto } from '../users/dto/response-use.dto';



@Injectable()
export class AuthService {
 constructor(private readonly usersService:UsersService,
  private readonly jwtService : JwtService
 ){}



async signup(createUserDto : CreateUserDto){
  
const{email,name,password} =createUserDto
const userDb =await this.usersService.findOneByEmail(email)
if(userDb){
  throw new BadRequestException("Ya existe un usuario con ese email!");
}

const passwordHash = bcrypt.hashSync(password,10)
const user = await this.usersService.create({...createUserDto,password:passwordHash});

return user
  
}



async signin(credentials : SigninDto){
  const{email,password}=credentials
const user = await this.usersService.findOneByEmail(email);
if(!user){
  throw new BadRequestException("Credenciales incorrectas!");
}

const matchPassword = bcrypt.compareSync(password, user.password)

if(!matchPassword){
throw new BadRequestException("Credenciales incorrectas!");
}

const payload = {
  sub:user.id,
  id:user.id,
  email:user.email
}

const token =  this.jwtService.sign(payload,{secret: process.env.JWT_SECRET,expiresIn:"60m"})
const responseUser = new ResponseUserDto(user);
return {token, user:responseUser};
}


}
