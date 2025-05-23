import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Repository } from 'typeorm';
import { CategoriesService } from './../categories/categories.service';
import { Category } from '../categories/entities/category.entity';
import { CardsEnum } from 'src/enums/cards.enum';
import { FileUploadService } from '../file-upload/file-upload.service';

@Injectable()
export class ProductsService {
constructor( @InjectRepository(Product) private readonly productRepository : Repository<Product>,
private readonly categoriesService:CategoriesService,
private readonly fileUploadService:FileUploadService ){}


  async create(createProductDto: CreateProductDto, file : Express.Multer.File) :Promise<Product> {
    const {categories,details,name,price} = createProductDto;
    const img= await this.fileUploadService.uploadFile({
      buffer:file.buffer,
      fieldName:file.fieldname,
      mimeType:file.mimetype,
      originalName:file.originalname,
      size:file.size
    });
  
      const categoriesBd : Category[] = await Promise.all(categories.map(async cat=> await this.categoriesService.findOneByCategoryName(cat.toUpperCase())) ) //array string
      const product = this.productRepository.create({name,price,details,categories:categoriesBd,img_url:img});    
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
    const prod = await this.productRepository.findOne({where:{id},relations:{categories:true}})
    if(!prod){ 
      throw new BadRequestException("No hay productos con esa id");
    }
    return prod;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const prod = await this.findOneById(id);
    const catExistProd = prod.categories.map(cat => cat.name)
        
    if(Array.isArray(updateProductDto.categories) && updateProductDto.categories !== catExistProd){
      const categoriesBd : Category[] = await Promise.all(updateProductDto.categories?.map(async cat=> await this.categoriesService.findOneByCategoryName(cat)) ) //array string
      console.log("entro al if de cat distintas");
      Object.assign(prod,{...updateProductDto,categories:categoriesBd})
    }else{
      Object.assign(prod,updateProductDto)
    }

    return this.productRepository.save(prod);

  }

  remove(id: number) {
    return `This action removes a #${id} product`;
  }
}
