import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Category } from "src/modules/categories/entities/category.entity";
import { Repository } from "typeorm";
import { categories } from "./categories.mock";


@Injectable()
export class CategoriesSeed{
constructor(@InjectRepository(Category) private readonly categoryRepository:Repository<Category>){};

async seed(){
    const categoriasExistentes = await this.categoryRepository.find();

for (const nombreCategoria of categories) { //me recorre cada elemento del mock
    if(!categoriasExistentes.some(category => category.name === nombreCategoria )){ // ve si coincide ese nombre con alguno de los existentes
        const categoria = new Category();
        categoria.name = nombreCategoria;
       await this.categoryRepository.save(categoria);
    }
}


}



}