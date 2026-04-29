import 'dotenv/config';
import express from 'express';
import cors from 'cors';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}

if (process.env.NODE_ENV !== 'test') {
  const port = Number(process.env.PORT) || 3001;
  const app = createApp();
  app.listen(port, () => {
    console.log(`ChainAchieve backend listening on :${port}`);
  });
}
