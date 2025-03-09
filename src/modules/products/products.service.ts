import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Repository } from 'typeorm';
import { CategoriesService } from './../categories/categories.service';
import { Category } from '../categories/entities/category.entity';
import { CardsEnum } from 'src/enums/cards.enum';

@Injectable()
export class ProductsService {
constructor( @InjectRepository(Product) private readonly productRepository : Repository<Product>,
private readonly categoriesService:CategoriesService ){}


  async create(createProductDto: CreateProductDto) :Promise<Product> {
    const {categories,details,name,price} = createProductDto;
    console.log(createProductDto);
    
      const categoriesBd : Category[] = await Promise.all(categories.map(async cat=> await this.categoriesService.findOneByCategoryName(cat.toUpperCase())) ) //array string
      const product = this.productRepository.create({name,price,details,categories:categoriesBd});    
      return this.productRepository.save(product);
    
  }

  async findAll() : Promise<Product[]> {
    const products = await this.productRepository.find({relations:{categories:true}});
    if(!products){
      throw new BadRequestException("No hay productos");
    }
    return products;
  }

  async findOneById(id: string) : Promise<Product>{
    const prod = await this.productRepository.findOne({where:{id}})
    if(!prod){ 
      throw new BadRequestException("No hay productos con esa id");
    }
    return prod;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const prod = await this.findOneById(id);
    Object.assign(prod,updateProductDto)
    return this.productRepository.save(prod);

  }

  remove(id: number) {
    return `This action removes a #${id} product`;
  }
}
