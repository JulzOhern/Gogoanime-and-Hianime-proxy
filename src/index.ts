import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { router } from './routes/route';
import { cacheRoutes } from "./utils/cache-routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4040;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(cors({ origin: "*" }));
app.use(cacheRoutes());

app.use('/', router);

app.listen(PORT, () => console.log(`http://localhost:${PORT}`));

export default app;
