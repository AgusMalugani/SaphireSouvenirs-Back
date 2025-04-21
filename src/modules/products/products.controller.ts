import { Controller, Get, Post, Body, Patch, Param, Delete, Put, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileUploadService } from '../file-upload/file-upload.service';
import { Roles } from 'src/decorators/roles.decorator';
import { AuthGuard } from 'src/guards/auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';

@ApiTags("Products")
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService,
    private readonly fileUploadService: FileUploadService
  ) {}

  @UseGuards(AuthGuard,RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()  
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


  @UseGuards(AuthGuard,RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()  
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    const product = await this.productsService.update(id, updateProductDto);
    return product
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(+id);
  }


  @UseGuards(AuthGuard,RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()  
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
console.log(img);

 await this.productsService.update(id,{img_url:img})
  return {img:img};
  }


}
