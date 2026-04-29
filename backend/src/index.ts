import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDb } from './db.js';
import { tokensRouter } from './routes/tokens.js';

export function createApp() {
  const db = initDb();
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.use('/api/tokens', tokensRouter(db));

  return app;
}

if (process.env.NODE_ENV !== 'test') {
  const port = Number(process.env.PORT) || 3001;
  const app = createApp();
  app.listen(port, () => console.log(`ChainAchieve backend listening on :${port}`));
}
