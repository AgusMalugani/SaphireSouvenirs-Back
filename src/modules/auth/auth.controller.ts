import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { SigninDto } from './dto/signin.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

 @Post("signup")
 async signup(@Body() createUserDto:CreateUserDto ){
  try {
    const user = await this.authService.signup(createUserDto);  
    return {data:user}
  } catch (error) {
    return {error}
  }
 }

  @Post('signin')
  async signin(@Body() credentials: SigninDto) {
    const response = await this.authService.signin(credentials);
    return {data:response}
  }

}
