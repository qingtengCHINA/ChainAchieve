import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDb } from './db.js';
import type { DB } from './db.js';
import { tokensRouter } from './routes/tokens.js';
import { coursesRouter } from './routes/courses.js';
import { tasksRouter } from './routes/tasks.js';
import { feesRouter } from './routes/fees.js';

export function createApp(testDb?: DB) {
  const db = testDb ?? initDb();
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.use('/api/tokens', tokensRouter(db));
  app.use('/api', coursesRouter(db));
  app.use('/api', tasksRouter(db));
  app.use('/api/fees', feesRouter());

  return app;
}

if (process.env.NODE_ENV !== 'test') {
  const port = Number(process.env.PORT) || 3001;
  const app = createApp();
  app.listen(port, () => console.log(`ChainAchieve backend listening on :${port}`));
}
