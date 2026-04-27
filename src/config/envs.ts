import 'dotenv/config';
import { z } from 'zod';

const envsSchema = z.object({
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
