const VISION_PROMPT = `Analizza questo Gantt chart ed estrai le attività principali.

IMPORTANTE: Devi rispondere SOLO con JSON valido. NIENTE altro testo.

Struttura JSON richiesta:
{
  "attivita": [
    {
      "descrizione": "Nome attività",
      "data_inizio": "2026-01-15",
      "data_fine": "2026-01-30",
      "durata_giorni": 16,
      "tipo_attivita": "task",
      "livello": 1
    }
  ]
}

REGOLE:
- Estrai SOLO le attività principali (max 20 attività)
- Date in formato YYYY-MM-DD
- tipo_attivita: "task", "milestone", o "raggruppamento"
- livello: 0 (fasi principali), 1 (attività normali)
- Se data illeggibile: usa "2026-01-01"
- Chiudi SEMPRE il JSON correttamente

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

export default async function (req, res) {
  applyCors(req, res);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    console.log('[analyze-gantt] Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('[analyze-gantt] Request body:', JSON.stringify({ base64Image: req.body.base64Image?.substring(0, 50) + '...', mimeType: req.body.mimeType }));
  console.log('[analyze-gantt] API Key presente:', process.env.GOOGLE_API_KEY ? 'Sì (lunghezza: ' + process.env.GOOGLE_API_KEY.length + ')' : 'No');

  try {
    const { base64Image, mimeType } = req.body;

    if (!base64Image || !mimeType) {
      console.log('[analyze-gantt] Missing parameters');
      return res.status(400).json({ error: 'Missing base64Image or mimeType' });
    }

    // Get Google API key from environment
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.log('[analyze-gantt] API Key non configurata');
      return res.status(500).json({
        error: 'GOOGLE_API_KEY not configured in Vercel environment variables'
      });
    }

    console.log('[analyze-gantt] Calling Google Gemini API...');
    console.log('[analyze-gantt] Image size:', base64Image.length, 'chars');

    // Gemini API URL - gemini-2.5-flash è il modello più recente
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    console.log('[analyze-gantt] Gemini URL:', GEMINI_API_URL.replace(apiKey, '***'));

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
        maxOutputTokens: 16000
      }
    };

    console.log('[analyze-gantt] Invio richiesta a Gemini...');
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

    console.log('[analyze-gantt] Gemini response:', JSON.stringify(data).substring(0, 500));

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

    console.log('[analyze-gantt] Raw response (first 1000 chars):', responseText.substring(0, 1000));

    // Pulizia della risposta: rimuovi markdown code blocks
    let cleanedText = responseText.trim();
    
    // Rimuovi eventuali code blocks markdown
    cleanedText = cleanedText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Rimuovi eventuali spiegazioni testuali prima/dopo il JSON
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedText = jsonMatch[0];
    }
    
    console.log('[analyze-gantt] Cleaned response (first 500 chars):', cleanedText.substring(0, 500));

    // Validazione JSON
    try {
      JSON.parse(cleanedText);
      console.log('[analyze-gantt] JSON valido!');
    } catch (e) {
      console.error('[analyze-gantt] JSON non valido:', e.message);
      console.error('[analyze-gantt] Response problematic:', cleanedText.substring(0, 500));
    }

    return res.status(200).json({ responseText: cleanedText });

  } catch (error) {
    console.error('[analyze-gantt] Error:', error);

    return res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};
export const maxDuration = 60;
