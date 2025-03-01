import { IsArray, IsDateString, IsEnum, IsNumber, IsString } from "class-validator"
import { TransactionTypeEnum } from "src/enums/transactionType.enum"
import { CreateOrderdetailDto } from "src/modules/orderdetails/dto/create-orderdetail.dto"
import { Product } from "src/modules/products/entities/product.entity"

export class CreateOrderDto {
    @IsDateString()
    endOrder:string // ord
    @IsEnum(TransactionTypeEnum)
    transactionType:TransactionTypeEnum //ord
    @IsString()
    theme:string
    @IsString()
    nameClient:string
    @IsString()
    nameForCard:string
    @IsString()
    numCel:string
    @IsString()
    num2Cel:string
    @IsArray()
    products:CreateOrderdetailDto[] // aca debo mandar prod + cantidad

}
