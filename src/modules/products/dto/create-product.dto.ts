import { IsEnum, IsNumber, IsOptional, IsString } from "class-validate"
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
    @IsEnum(CardsEnum)
    @IsOptional()
    card?:CardsEnum
    @IsString()
    categories:string[]
}
