import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Product } from "src/modules/products/entities/product.entity";
import { Repository } from "typeorm";
import { products } from "./products.mock"; 
import { Category } from "src/modules/categories/entities/category.entity";

@Injectable()
export class ProductsSeed{
    constructor(@InjectRepository(Product)private readonly productRepository:Repository<Product>,
    @InjectRepository(Category)private readonly categoryRepository:Repository<Category>){};



async seed(){
const productos = await this.productRepository.find();
const NombreProductos = productos.map(prod => prod.name);

for (const product of products) {
    if(!NombreProductos.includes(product.name)){
        const categorias = await this.findCategoriesByName(product.categories);

        const newProduct = new Product();
        newProduct.name = product.name;
        newProduct.details=product.details;
        newProduct.stock = product.stock;
        newProduct.price = product.price;
        newProduct.img_url = product.img_url;
        newProduct.categories = categorias

        await this.productRepository.save(newProduct);
    }
}

}

async findCategoriesByName(categories:string[]){
    const categorias = await this.categoryRepository.find();
    const NombreCategorias = categorias.map(cate => cate.name);

    for (const cat of categories) {
        if(!NombreCategorias.includes(cat)){
            throw new BadRequestException(`La categoria ${cat} ingresada no se encuentra `);
        }
    }
    return categorias;
}



}