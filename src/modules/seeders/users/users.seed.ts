import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "src/modules/users/entities/user.entity";
import { Repository } from "typeorm";
import * as bcrypt from "bcryptjs"
import { envs } from "src/config/envs";
@Injectable()
export class UsersSeed{

    constructor(@InjectRepository(User)private readonly usersRepository : Repository<User>){}


    async seed(){
        const adminEmail = envs.SEED_ADMIN_EMAIL;
        const adminPassword = envs.SEED_ADMIN_PASSWORD;

        const user = await this.usersRepository.findOne({ where: { email: adminEmail } });
        if (!user) {
            const newUser = new User();
            newUser.name = "Admin";
            newUser.email = adminEmail;
            newUser.password = bcrypt.hashSync(adminPassword, 10);
            await this.usersRepository.save(newUser);
        }
    }
}