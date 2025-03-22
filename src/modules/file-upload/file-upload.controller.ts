import { Controller, HttpCode, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileUploadService } from './file-upload.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('files')
export class FileUploadController {
  constructor(
    private readonly fileUploadService: FileUploadService
  ) {}

  @Post("uploadImage/:id")
  @UseInterceptors(FileInterceptor("file"))
  @HttpCode(200)
 async uploadImage(@Param("id")id:string, @UploadedFile() file : Express.Multer.File) {
 const img= await this.fileUploadService.uploadFile({
    buffer:file.buffer,
    fieldName:file.fieldname,
    mimeType:file.mimetype,
    originalName:file.originalname,
    size:file.size
  });


  return {img:img,id:id};
  }

}
