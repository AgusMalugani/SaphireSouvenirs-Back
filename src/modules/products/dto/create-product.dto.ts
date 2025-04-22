import { ApiProperty } from "@nestjs/swagger"
import { Transform } from "class-transformer"
import { ArrayMinSize, IsArray, IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min, min, MinLength } from "class-validator"
import { CardsEnum } from "src/enums/cards.enum"

export class CreateProductDto {
    
    @ApiProperty({
        description:"Nombre del producto",
        example:"Llavero hilo de seda con 2 dijes"
    })
    @IsNotEmpty()
    @IsString()
    @MinLength(3)
    @MaxLength(100)
    name:string



    @ApiProperty({
        description:"precio por unidad",
        example:"2500"
    })
    @Transform(({ value }) => Number(value))
    @IsNumber()
    @Min(1)
    @IsNotEmpty()
    price:number



    @ApiProperty({
        description:"Detalle producto",
        example:"Es un llavero echo con hilo de seda"
    })
    @IsNotEmpty()
    @IsString()
    @MinLength(3)
    @MaxLength(250)
    details:string




    @ApiProperty({
            description:"Array con nombre Categorias",
            example:"[{`name`:`SOUVENIRS`}]"
        })
        @IsArray()
        @ArrayMinSize(1)
        @IsString({ each: true })
        @Transform(({ value }) => 
        {
            if (Array.isArray(value)) {
                return value.map((item) => typeof item === 'string' ? item : item.name);
              } else if (typeof value === 'string') {
                return [value]; // convertir string suelto en array
              } else {
                return [];
              }
        }
        )
        categories: string[]




    @IsString()
    img_url:string;


    
}
