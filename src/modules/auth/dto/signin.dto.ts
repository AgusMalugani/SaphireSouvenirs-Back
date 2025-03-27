import { IsEmail, IsNotEmpty, IsStrongPassword } from "class-validator";

export class SigninDto{
    @IsEmail()
    @IsNotEmpty()
    email:string

    @IsStrongPassword()
    @IsNotEmpty()
    password:string
}