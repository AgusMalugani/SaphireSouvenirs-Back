import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import {config as dotenvConfig} from 'dotenv';


dotenvConfig({ path: '.env' });


export const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
  username: process.env.DATABASE_USER || 'postgres',
  password: String(process.env.DATABASE_PASSWORD).trim(),
  database: process.env.DATABASE_NAME || 'hogwarts_bar',
  autoLoadEntities:true,
  entities: [__dirname + '/../**/*.entity.{js,ts}'], // entities : [ 'dist/**/*.entity{.ts,.js}' ]
  migrations: ['dist/migrations/*{.js,.ts}'],
  synchronize: true,
  //dropSchema: true,
  //logging: true,
    //ssl: { 
     // rejectUnauthorized: false, // Render requiere esto para conexiones seguras
    //}
}