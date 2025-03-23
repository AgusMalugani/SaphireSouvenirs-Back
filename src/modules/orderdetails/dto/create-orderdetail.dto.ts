import { ApiProperty } from "@nestjs/swagger"
import { IsArray, IsNotEmpty, IsNumber, IsString } from "class-validator"
import { Product } from "src/modules/products/entities/product.entity"

export class CreateOrderdetailDto {
        @ApiProperty({
            description:"Cantidad producto",
            example:10
        })
        @IsNotEmpty()
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
    
