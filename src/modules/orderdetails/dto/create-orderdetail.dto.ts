import { IsArray, IsNumber, IsString } from "class-validator"
import { Product } from "src/modules/products/entities/product.entity"

export class CreateOrderdetailDto {
        @IsNumber()
        quantity:number  
        @IsString()
        productId:string 
    
    }
    
