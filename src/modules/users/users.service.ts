import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { ResponseUserDto } from './dto/response-use.dto';

@Injectable()
export class UsersService {
constructor(@InjectRepository(User) private readonly usersRepository : Repository<User>){}

  create(createUserDto: CreateUserDto) {
   const user = this.usersRepository.create(createUserDto);
    return this.usersRepository.save(user);;
  }

  async findAll() {
    const users = await this.usersRepository.find();
    const responseUsers = users.map(user=> {  return new ResponseUserDto(user);})
    return responseUsers;
  }

   async findOneByEmail(email:string){
    const user = await this.usersRepository.findOne({where:{email}})

  return user;
  }
}
