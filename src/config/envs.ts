import 'dotenv/config';
import { z } from 'zod';
import { resolveRuntimeConfig } from './resolveRuntimeConfig';

const optionalEnvBooleanSchema = z.enum(['true', 'false']).optional();

const envsSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production']).default('development'),
    DB_SYNCHRONIZE: optionalEnvBooleanSchema,
    SEED_ON_STARTUP: optionalEnvBooleanSchema,
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z.string().min(1),
    CLOUDINARY_CLOUD_NAME: z.string().min(1),
    CLOUDINARY_CLOUD_API_KEY: z.string().min(1),
    CLOUDINARY_CLOUD_API_SECRET: z.string().min(1),
    NODEMAILER_USER: z.string().min(1),
    NODEMAILER_PASS: z.string().min(1),
    NODEMAILER_FROM: z.string().min(1),
    NODEMAILER_CC: z.string().min(1),
    URL_CLIENT: z.string().min(1),
    SEED_ADMIN_EMAIL: z.string().email(),
    SEED_ADMIN_PASSWORD: z.string().min(1),
  })
  .transform((rawEnvs) => {
    const dbSynchronizeDefault = rawEnvs.NODE_ENV === 'development';
    const dbSynchronize =
      rawEnvs.DB_SYNCHRONIZE === undefined
        ? dbSynchronizeDefault
        : rawEnvs.DB_SYNCHRONIZE === 'true';
    const seedOnStartup =
      rawEnvs.SEED_ON_STARTUP === undefined
        ? false
        : rawEnvs.SEED_ON_STARTUP === 'true';

    return {
      ...rawEnvs,
      DB_SYNCHRONIZE: dbSynchronize,
      SEED_ON_STARTUP: seedOnStartup,
    };
  });

const parsedEnvs = envsSchema.safeParse(process.env);

if (!parsedEnvs.success) {
  const validationIssues = parsedEnvs.error.issues.map((issue) => {
    return `- ${issue.path.join('.')}: ${issue.message}`;
  });

  console.error('\nError: variables de entorno faltantes o invalidas.');
  console.error(validationIssues.join('\n'));
  process.exit(1);
}

export const envs = parsedEnvs.data;

export const effectiveRuntimeConfig = resolveRuntimeConfig({
  nodeEnvironment: envs.NODE_ENV,
  dbSynchronize: envs.DB_SYNCHRONIZE,
  seedOnStartup: envs.SEED_ON_STARTUP,
});
