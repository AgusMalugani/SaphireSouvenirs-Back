import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "src/modules/users/entities/user.entity";
import { Repository } from "typeorm";
import * as bcrypt from "bcryptjs"
@Injectable()
export class UsersSeed{

    constructor(@InjectRepository(User)private readonly usersRepository : Repository<User>){}


    async seed(){
        const user =await this.usersRepository.findOne({where:{email:"admin@admin.com"}});
    if(!user){
        const newUser = new User();
        newUser.name = "Admin";
        newUser.email = "admin@admin.com";
        newUser.password = bcrypt.hashSync("Prueba123!",10);
    await this.usersRepository.save(newUser);
    }
    }
}