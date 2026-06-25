import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { effectiveRuntimeConfig, envs } from './envs';

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  url: envs.DATABASE_URL,
  autoLoadEntities: true,
  dropSchema: effectiveRuntimeConfig.dropSchema,
  synchronize: effectiveRuntimeConfig.synchronize,
  ssl: {
    rejectUnauthorized: false,
  },
};
