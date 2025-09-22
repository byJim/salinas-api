import dotenv from "dotenv";
import { z } from "zod";

const environment = process.env.NODE_ENV || "development";

dotenv.config({ path: [".env", `.env.${environment}`] });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  APP_JWT_PRIVATE_KEY: z.string(),
  APP_JWT_PUBLIC_KEY: z.string(),
  APP_PORT: z.string()
});

export const env = envSchema.parse(process.env);
