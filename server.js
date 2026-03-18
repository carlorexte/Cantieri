// Server locale per sviluppo - simula le API Vercel
import express from 'express';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Carica .env.local poi .env
dotenv.config({ path: join(__dirname, '.env.local') });
dotenv.config({ path: join(__dirname, '.env') });

const require = createRequire(import.meta.url);

const app = express();
app.use(express.json());

// Carica dinamicamente i handler dalla cartella api/
const handlers = {
  'invite-user': require('./api/invite-user.js'),
  'analyze-gantt': require('./api/analyze-gantt.js'),
};

app.all('/api/:handler', (req, res) => {
  const handler = handlers[req.params.handler];
  if (!handler) {
    return res.status(404).json({ error: `Handler "${req.params.handler}" non trovato` });
  }
  handler(req, res);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`[API Server] In ascolto su http://localhost:${PORT}`);
});
