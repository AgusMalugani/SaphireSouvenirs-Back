import { Controller, Get, Post, Body, Patch, Param, Delete, Put, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileUploadService } from '../file-upload/file-upload.service';

@ApiTags("Products")
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService,
    private readonly fileUploadService: FileUploadService
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor("file"))
  create(@UploadedFile() file : Express.Multer.File , @Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto,file);
  }

  @Get()
  async findAll() {
    return await this.productsService.findAll();
  }

  @Get(':id')
  async findOneById(@Param('id') id: string) {
    return await this.productsService.findOneById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return await this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(+id);
  }


@Post("upload/:id")
  @UseInterceptors(FileInterceptor("file"))
 async uploadImage(@Param("id")id:string, @UploadedFile() file : Express.Multer.File) {

 const img= await this.fileUploadService.uploadFile({
    buffer:file.buffer,
    fieldName:file.fieldname,
    mimeType:file.mimetype,
    originalName:file.originalname,
    size:file.size
  });

 await this.productsService.update(id,{img_url:img})
  return {img:img};
  }


}
