import { IsString } from "class-validator";

export class CreateCategoryDto {
    @IsString()
    category:string
}
