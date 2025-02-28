import { IsArray, IsEnum, IsNumber, IsOptional, IsString } from "class-validator"
import { CardsEnum } from "src/enums/cards.enum"

export class CreateProductDto {
    @IsString()
    name:string
    @IsNumber()
    price:number
    @IsString()
    details:string
    @IsNumber()
    stock:number
    @IsArray()
    categories:string[]
}
