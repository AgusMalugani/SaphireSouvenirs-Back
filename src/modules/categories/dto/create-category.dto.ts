import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";

export class CreateCategoryDto {

    @ApiProperty({
        description:"Nombre categoria",
        example:"souvenirs",
    })

    @IsString()
    @MinLength(3)
    @MaxLength(20)
    name:string
}
