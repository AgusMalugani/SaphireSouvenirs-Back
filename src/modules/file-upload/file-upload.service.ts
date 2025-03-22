import { Injectable } from '@nestjs/common';
import { CloudinaryService } from '../../services/cloudinary/cloudinary.service';
import { FileUploadDTO } from './dto/file-upload.dto';

@Injectable()
export class FileUploadService {
    constructor(private readonly cloudinaryService: CloudinaryService){}

async uploadFile( file:FileUploadDTO ) :Promise<string> {
    const url = await this.cloudinaryService.uploadFile(file.buffer,file.originalName);
    return url;
    }

    async getUrl(publicId:string){
        return this.cloudinaryService.getUrl(publicId);
    }

}