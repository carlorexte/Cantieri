const VISION_PROMPT = `Analizza questo documento di Computo Metrico ed estrai le voci di elenco prezzi.

IMPORTANTE: Devi rispondere SOLO con JSON valido. NIENTE altro testo.

Struttura JSON richiesta:
{
  "items": [
    {
      "codice_elenco_prezzi": "01.A02.B010",
      "descrizione": "Descrizione estesa della voce del computo",
      "unita_misura": "mc",
      "quantita_prevista": 150.5,
      "prezzo_unitario": 25.40,
      "categoria": "Scavi e rinterri"
    }
  ]
}

REGOLE:
- Estrai il maggior numero possibile di voci (fino a un massimo di 50)
- Assicurati che quantita_prevista e prezzo_unitario siano numeri (non stringhe con simboli €)
- Se un valore non è presente, usa null o 0
- La descrizione deve essere il più completa possibile
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

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'GOOGLE_API_KEY not configured'
      });
    }

    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    
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

    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        error: `Gemini API error (${response.status})`,
        details: errorText
      });
    }

    const data = await response.json();
    let responseText = '';
    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      responseText = data.candidates[0].content.parts[0].text;
    }

    if (!responseText) {
      return res.status(500).json({
        error: 'No text content in Gemini response'
      });
    }

    let cleanedText = responseText.trim();
    cleanedText = cleanedText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedText = jsonMatch[0];
    }

    return res.status(200).json({ responseText: cleanedText });

  } catch (error) {
    console.error('[analyze-computo] Error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
}
