import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CategoriesService {
constructor(@InjectRepository(Category) private readonly categoryRepository : Repository<Category> ){}

  async create(createCategoryDto: CreateCategoryDto) {
    const{name}=createCategoryDto;
    
    const categoryDb = await this.categoryRepository.findOne({where:{name}})
    if(categoryDb){
      throw new BadRequestException("Ya existe una categoria con ese nombre.")
    }
    const newCategory = this.categoryRepository.create({name : name.toUpperCase()}) //las categorias en mayus
    return this.categoryRepository.save(newCategory);

  }

  async findAll() {
    const categories = await this.categoryRepository.find()
    if(!categories){
      throw new BadRequestException("No hay categorias");
    }
    return categories;
  }

 async findOneById(id: string) {
    const category = await this.categoryRepository.findOne({where:{id}})
    if(!category){
      throw new BadRequestException("No hay categoria con esa id");
    }
    return category;
  }

  async findOneByCategoryName(name: string) {
    const categoryByName = await this.categoryRepository.findOne({where:{name}})
    if(!categoryByName){
      throw new BadRequestException("No hay categoria con ese nombre");
    }
    return categoryByName;
  }




 async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.findOneById(id);
    Object.assign(category,updateCategoryDto);
    return this.categoryRepository.save(category);
  }

  remove(id: number) {
    return `This action removes a #${id} category`;
  }
}
