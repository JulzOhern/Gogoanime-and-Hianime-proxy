import { CorsOptions } from "cors";
import { config } from "dotenv";

config();

const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
const allowedOrigins = allowedOriginsEnv ? allowedOriginsEnv.split(',').map(o => o.trim()) : [];

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!allowedOriginsEnv) return callback(null, true);
    if (allowedOrigins.includes('*')) return callback(null, true);
    if (origin && allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
};