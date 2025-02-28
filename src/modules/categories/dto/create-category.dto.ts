import { IsString } from "class-validate";

export class CreateCategoryDto {
    @IsString()
    category:string
}
