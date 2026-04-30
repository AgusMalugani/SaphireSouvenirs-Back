import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { envs } from './envs';

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  url: envs.DATABASE_URL,
  autoLoadEntities: true,
  dropSchema: true,
  synchronize: true,
  ssl: {
    rejectUnauthorized: false,
  },
};
