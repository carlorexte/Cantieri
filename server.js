// Server locale per sviluppo - simula le API Vercel
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: join(__dirname, '.env.local') });
dotenv.config({ path: join(__dirname, '.env') });

const app = express();
app.use(express.json());

app.all('/api/:handler', async (req, res) => {
  try {
    const mod = await import(`./api/${req.params.handler}.js`);
    const handler = mod.default;
    if (!handler) return res.status(404).json({ error: `Handler non trovato` });
    handler(req, res);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`[API Server] In ascolto su http://localhost:${PORT}`);
});
