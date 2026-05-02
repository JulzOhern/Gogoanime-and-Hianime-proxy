import express, { ErrorRequestHandler } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { router } from './routes/route';
import { cacheRoutes } from "./utils/cache-routes";

dotenv.config();

const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
const allowedOrigins = allowedOriginsEnv ? allowedOriginsEnv.split(',').map(o => o.trim()) : [];
const app = express();
const PORT = process.env.PORT || 4040;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!allowedOriginsEnv) return callback(null, true);
    if (allowedOrigins.includes('*')) return callback(null, true);
    if (origin && allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
};

app.use(cors(corsOptions));
app.use(cacheRoutes());
app.use('/', router);

const corsErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (err?.message === 'Not allowed by CORS') {
    res.status(403).json({ success: false, message: 'Origin not allowed' });
    return;
  }
  res.status(500).json({ success: false, message: 'Internal Server Error' });
};

app.use(corsErrorHandler);

app.listen(PORT, () => console.log(`http://localhost:${PORT}`));

export default app;
