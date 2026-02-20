import dotenv from "dotenv";
import { z } from "zod";
dotenv.config();

const envSchema = z.object({
    NODE_ENV: z.union([z.undefined(), z.enum(["development", "production"])]),
    POSTGRES_HOST: z.union([z.undefined(), z.string()]),
    POSTGRES_PORT: z
        .string()
        .regex(/^[0-9]+$/)
        .transform((value) => parseInt(value)),
    POSTGRES_DB: z.string(),
    POSTGRES_USER: z.string(),
    POSTGRES_PASSWORD: z.string(),
    APP_PORT: z.union([
        z.undefined(),
        z
            .string()
            .regex(/^[0-9]+$/)
            .transform((value) => parseInt(value)),
    ]),
    WB_API_TOKEN: z.string(),
    WB_API_BASE_URL: z.union([z.undefined(), z.string().url()]),
    SYNC_INTERVAL_MINUTES: z.union([
        z.undefined(),
        z
            .string()
            .regex(/^[0-9]+$/)
            .transform((value) => parseInt(value)),
    ]),
    WB_REQUEST_TIMEOUT_MS: z.union([
        z.undefined(),
        z
            .string()
            .regex(/^[0-9]+$/)
            .transform((value) => parseInt(value)),
    ]),
    WB_REQUEST_RETRIES: z.union([
        z.undefined(),
        z
            .string()
            .regex(/^[0-9]+$/)
            .transform((value) => parseInt(value)),
    ]),
    GOOGLE_CREDENTIALS_PATH: z.union([z.undefined(), z.string()]),
    GOOGLE_SPREADSHEET_IDS: z.union([z.undefined(), z.string()]),
    GOOGLE_SHEET_NAME: z.union([z.undefined(), z.string()]),
});

const env = envSchema.parse({
    POSTGRES_HOST: process.env.POSTGRES_HOST,
    POSTGRES_PORT: process.env.POSTGRES_PORT,
    POSTGRES_DB: process.env.POSTGRES_DB,
    POSTGRES_USER: process.env.POSTGRES_USER,
    POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,
    NODE_ENV: process.env.NODE_ENV,
    APP_PORT: process.env.APP_PORT,
    WB_API_TOKEN: process.env.WB_API_TOKEN,
    WB_API_BASE_URL: process.env.WB_API_BASE_URL,
    SYNC_INTERVAL_MINUTES: process.env.SYNC_INTERVAL_MINUTES,
    WB_REQUEST_TIMEOUT_MS: process.env.WB_REQUEST_TIMEOUT_MS,
    WB_REQUEST_RETRIES: process.env.WB_REQUEST_RETRIES,
    GOOGLE_CREDENTIALS_PATH: process.env.GOOGLE_CREDENTIALS_PATH,
    GOOGLE_SPREADSHEET_IDS: process.env.GOOGLE_SPREADSHEET_IDS,
    GOOGLE_SHEET_NAME: process.env.GOOGLE_SHEET_NAME,
});

export default env;
