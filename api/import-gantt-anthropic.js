const SYSTEM_PROMPT = `Sei un esperto di pianificazione edile. Analizza il documento fornito ed estrai TUTTE le righe del cronoprogramma, rispettando la gerarchia esatta.

IMPORTANTE: Rispondi SOLO con JSON valido. NESSUN altro testo.

Struttura JSON richiesta:
{
  "attivita": [
    {
      "id": "1",
      "wbs": "1",
      "parent_id": null,
      "descrizione": "ALLESTIMENTO DEL CANTIERE",
      "tipo_attivita": "raggruppamento",
      "data_inizio": "2026-01-13",
      "data_fine": "2026-02-11",
      "durata_giorni": 30
    },
    {
      "id": "1.1",
      "wbs": "1.1",
      "parent_id": "1",
      "descrizione": "Realizzazione impianto elettrico",
      "tipo_attivita": "task",
      "data_inizio": "2026-01-13",
      "data_fine": "2026-01-14",
      "durata_giorni": 2
    }
  ]
}

REGOLE FONDAMENTALI:
- Estrai TUTTE le righe senza eccezioni, nessun limite numerico
- "id" e "wbs": codice WBS della riga (es. "1", "1.1", "1.2.3") o numero ID visibile
- "parent_id": id del nodo padre diretto; null solo per nodi radice
- "tipo_attivita": "raggruppamento" per fasi/gruppi con figli, "task" per attività con durata, "milestone" per durata 0
- Date in formato YYYY-MM-DD; se illeggibile usa "2026-01-01"
- "durata_giorni": numero intero di giorni
- Rispetta la gerarchia: ogni figlio deve avere parent_id che punta all'id del suo gruppo padre

Rispondi SOLO con il JSON, niente spiegazioni.`;

function applyCors(req, res) {
  const origin = req.headers.origin;
  const allowedOrigins = [
    process.env.ALLOWED_ORIGINS || '',
    process.env.APP_URL || '',
    process.env.VITE_APP_URL || '',
    process.env.VITE_SITE_URL || '',
    process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '',
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
  ]
    .join(',')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push('http://localhost:5173', 'http://localhost:4173');
  }

  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
}

export default async function handler(req, res) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY non configurata nelle variabili d\'ambiente' });
  }

  try {
    const { fileContent, mimeType, fileName } = req.body;

    if (!fileContent || !mimeType) {
      return res.status(400).json({ error: 'Parametri mancanti: fileContent e mimeType sono obbligatori' });
    }

    const isImage = mimeType.startsWith('image/');
    const isPdf = mimeType === 'application/pdf';
    const isText = mimeType === 'text/plain' || mimeType === 'text/csv';

    let messageContent;

    if (isImage || isPdf) {
      messageContent = [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mimeType,
            data: fileContent,
          },
        },
        {
          type: 'text',
          text: `Analizza questo documento (${fileName || 'file'}) ed estrai il cronoprogramma dei lavori edili.`,
        },
      ];
    } else {
      // Testo CSV o contenuto testuale
      messageContent = [
        {
          type: 'text',
          text: `Analizza questo cronoprogramma (${fileName || 'file'}) ed estrai le attività:\n\n${fileContent}`,
        },
      ];
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8096,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: messageContent }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[import-gantt-anthropic] Anthropic API error:', errorText);
      return res.status(response.status).json({
        error: `Anthropic API error (${response.status})`,
        details: errorText,
      });
    }

    const data = await response.json();
    let responseText = data.content?.[0]?.text || '';

    // Pulizia markdown code blocks
    responseText = responseText.trim().replace(/```json\s*/g, '').replace(/```\s*/g, '');
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) responseText = jsonMatch[0];

    // Valida JSON prima di restituire
    try {
      JSON.parse(responseText);
    } catch (e) {
      console.error('[import-gantt-anthropic] JSON non valido:', e.message);
      return res.status(500).json({ error: 'Risposta AI non in formato JSON valido', raw: responseText.substring(0, 500) });
    }

    // Restituisce responseText grezzo — stesso formato di /api/analyze-gantt
    return res.status(200).json({ responseText });
  } catch (error) {
    console.error('[import-gantt-anthropic] Error:', error);
    return res.status(500).json({ error: error.message || 'Errore interno del server' });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
};
export const maxDuration = 60;
