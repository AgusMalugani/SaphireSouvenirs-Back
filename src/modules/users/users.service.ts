import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UsersService {
constructor(@InjectRepository(User) private readonly usersRepository : Repository<User>){}

  create(createUserDto: CreateUserDto) {
   const user = this.usersRepository.create(createUserDto);
    return this.usersRepository.save(user);;
  }

  async findAll() {
    return await this.usersRepository.find();
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }

  async findOneByEmail(email:string){
    const user = await this.usersRepository.findOne({where:{email}})

  return user;
  }
}
