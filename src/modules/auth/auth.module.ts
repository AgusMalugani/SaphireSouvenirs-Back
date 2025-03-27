import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';

@Module({
  imports:[TypeOrmModule.forFeature([User]),
  ],
  controllers: [AuthController],
  providers: [AuthService,UsersService,JwtService],
  exports:[AuthService]
})
export class AuthModule {}
