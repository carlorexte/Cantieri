// Server locale per sviluppo - simula le API Vercel
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Carica .env dalla root del progetto
dotenv.config({ path: join(__dirname, '.env') });
dotenv.config({ path: join(__dirname, '.env.local') });

console.log('[Server] GOOGLE_API_KEY configurata:', process.env.GOOGLE_API_KEY ? '✅ Sì' : '❌ No');
console.log('[Server] Directory corrente:', __dirname);

const app = express();
app.use(express.json({ limit: '10mb' }));

app.all('/api/:handler', async (req, res) => {
  console.log(`[Server] Richiesta ricevuta: ${req.method} ${req.path}`);
  try {
    const mod = await import(`./api/${req.params.handler}.js`);
    const handler = mod.default;
    if (!handler) return res.status(404).json({ error: `Handler non trovato` });
    handler(req, res);
  } catch (e) {
    console.error('[Server] Errore handler:', e.message);
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[API Server] In ascolto su http://localhost:${PORT}`);
});
