import { ApiProperty } from "@nestjs/swagger"
import { ArrayMinSize, IsArray, IsDateString, IsEmail, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, MinLength } from "class-validator"
import { TransactionTypeEnum } from "src/enums/transactionType.enum"
import { CreateOrderdetailDto } from "src/modules/orderdetails/dto/create-orderdetail.dto"

export class CreateOrderDto {
    @ApiProperty({
        description:"Fecha entrega",
        example:"2025-09-15"
    })
    @IsDateString()
    @IsNotEmpty()
    endOrder:string // ord

    @ApiProperty({
        description:"Envio o retiro en local",
        example:"withdraw"
    })
    @IsEnum(TransactionTypeEnum)
    transactionType:TransactionTypeEnum //ord
    

    @ApiProperty({
        description:"Dirrecion envio",
        example:"Calle falsa 123"
    })
    @IsNotEmpty()
    @IsString()
    @MinLength(3)
    @MaxLength(100)
    address:string;

    @ApiProperty({
        description:"Tema para la tarjeta",
        example:"Harry Potter"
    })
    @IsNotEmpty()
    @IsString()
    @MinLength(10)
    @MaxLength(250)
    theme:string

    @ApiProperty({
        description:"Nombre Comprador",
        example:"David Smith"
    })
    @IsNotEmpty()
    @IsString()
    @MinLength(3)
    @MaxLength(100)
    nameClient:string

    @ApiProperty({
        description:"Nombre para la tarjeta",
        example:"Martin"
    })
    @IsNotEmpty()
    @IsString()
    @MinLength(3)
    @MaxLength(100)
    nameForCard:string

    @ApiProperty({
        description:"Numero celular para comunicarnos",
        example:"3413123348"
    })
    @IsNotEmpty()
    @IsString()
    @MinLength(10)
    @MaxLength(15)
    numCel:string

    @ApiProperty({
        description:"Segundo numero para comunicarnos",
        example:"34135499876"
    })
    @IsNotEmpty()
    @IsString()
    @MinLength(10)
    @MaxLength(15)
    num2Cel:string


    @ApiProperty({
        description:"Email envio comprobante de orden",
        example:"davidsmith123@gmail.com"
    })
    @IsEmail()
    @IsNotEmpty()
    email:string

    @ApiProperty({
        description:"Lista de id de los productos",
        example:"[{`cuantity`:2,`idProduct`:`123-asd1-product`}]"
    })
    @IsArray()
    @ArrayMinSize(1)
    products:CreateOrderdetailDto[] // aca debo mandar prod + cantidad

}
