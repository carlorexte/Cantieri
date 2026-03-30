const VISION_PROMPT = `Sei un esperto in project management e cronoprogrammi edilizi.
Analizza questa immagine di Gantt chart e estrai TUTTE le attività visibili.

REGOLE CRITICHE:
1. Date in formato ISO: YYYY-MM-DD (esempio: 2025-03-15)
2. data_fine deve essere >= data_inizio SEMPRE
3. Descrizione obbligatoria per ogni attività, mai vuota
4. Se vedi date relative come "Q1 2025", convertile: Q1=01/01-03/31, Q2=04/01-06/30, etc.
5. Se mancano date precise, stimale dalla posizione visiva delle barre colorate

TIPI DI ATTIVITÀ:
- "task": attività normale con durata >1 giorno
- "milestone": evento puntuale, durata 1 giorno, simbolo rombo/stella
- "raggruppamento": fase/categoria (testo spesso MAIUSCOLO, durata >10 giorni)

GERARCHIA (livello):
- 0: Fasi principali (es: "FONDAZIONI")
- 1: Attività standard (es: "Scavo fondazioni")
- 2: Sotto-attività (es: "Scavo manuale zona A")

ESTRAI per ogni attività:
1. descrizione: testo esatto dell'attività
2. data_inizio: data inizio formato YYYY-MM-DD
3. data_fine: data fine formato YYYY-MM-DD
4. durata_giorni: numero giorni (calcolato da fine-inizio+1)
5. tipo_attivita: task/milestone/raggruppamento
6. livello: 0, 1 o 2 in base a indentazione/gerarchia
7. wbs: codice WBS se presente (es: "1.2.3")
8. colore: colore barra in hex (es: "#3b82f6")

Rispondi in JSON con questa struttura:
{
  "attivita": [
    {
      "descrizione": "Nome attività",
      "data_inizio": "2025-04-01",
      "data_fine": "2025-04-15",
      "durata_giorni": 15,
      "tipo_attivita": "task",
      "livello": 1,
      "wbs": "1.1",
      "colore": "#3b82f6"
    }
  ],
  "metadata": {
    "ganttType": "horizontal",
    "confidence": "high",
    "totalActivities": 10
  }
}

Rispondi SOLO con JSON valido, senza markdown o altri testi.`;

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
    .map((item) => item.trim())
    .filter(Boolean);

  if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push('http://localhost:5173', 'http://localhost:4173');
  }

  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
}

module.exports = async (req, res) => {
  applyCors(req, res);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { base64Image, mimeType } = req.body;

    if (!base64Image || !mimeType) {
      return res.status(400).json({ error: 'Missing base64Image or mimeType' });
    }

    // Get Google API key from environment
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'GOOGLE_API_KEY not configured in Vercel environment variables'
      });
    }

    console.log('[analyze-gantt] Calling Google Gemini API...');
    console.log('[analyze-gantt] Image size:', base64Image.length, 'chars');

    // Gemini API URL - gemini-1.5-pro supporta vision e text
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [{
        parts: [
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Image
            }
          },
          {
            text: VISION_PROMPT
          }
        ]
      }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 4000
      }
    };

    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('[analyze-gantt] Gemini API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[analyze-gantt] Gemini API error:', errorText);

      return res.status(response.status).json({
        error: `Gemini API error (${response.status})`,
        details: errorText
      });
    }

    const data = await response.json();

    // Extract text from Gemini response
    let responseText = '';
    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      responseText = data.candidates[0].content.parts[0].text;
    }

    if (!responseText) {
      console.error('[analyze-gantt] Unexpected response format:', JSON.stringify(data));
      return res.status(500).json({
        error: 'No text content in Gemini response',
        response: data
      });
    }

    console.log('[analyze-gantt] Success! Response length:', responseText.length);

    return res.status(200).json({ responseText });

  } catch (error) {
    console.error('[analyze-gantt] Error:', error);

    return res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
};

module.exports.config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};
module.exports.maxDuration = 60;
