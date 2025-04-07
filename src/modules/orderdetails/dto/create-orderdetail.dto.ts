import { ApiProperty } from "@nestjs/swagger"
import { Transform } from "class-transformer"
import { IsArray, IsNotEmpty, IsNumber, IsString } from "class-validator"
import { Product } from "src/modules/products/entities/product.entity"

export class CreateOrderdetailDto {
        @ApiProperty({
            description:"Cantidad producto",
            example:10
        })
        @IsNotEmpty()
        @Transform(({ value }) => Number(value))
        @IsNumber()
        cuantity:number
        

        @ApiProperty({
            description:"id de los productos seleccionados",
            example:"123-id-producto"
        })
        @IsNotEmpty()
        @IsString()
        productId:string 
    
    }
    
