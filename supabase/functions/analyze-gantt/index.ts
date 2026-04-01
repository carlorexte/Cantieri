import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const CLAUDE_MODEL = 'claude-sonnet-4-20250514'

const VISION_PROMPT = `Ruolo: Agisci come un Data Engineer senior specializzato in sistemi ERP per l'edilizia. Il tuo compito è trasformare stream OCR sporchi e immagini di cronoprogrammi in oggetti JSON strutturati e validati.

Contesto Operativo:
Stai processando il documento "Gantt_Giugliano_rev.pdf". Il testo contiene errori di scansione (es. "11301,28", "3gdom", "hm") e date che fluttuano tra il 2025 e il 2026.

Direttive di Parsing (Strict):

Normalizzazione Date: - Tutte le date devono essere in formato YYYY-MM-DD.
Se l'OCR riporta "25" ma il contesto del progetto è chiaramente il 2026 (come per il fine cantiere al 30/06/2026), correggi l'anno in 2026.
Esempio: "30 mar" diventa 2026-03-30.

Gerarchia Task: - Identifica le macro-aree in MAIUSCOLO (es. "ALLESTIMENTO DEL CANTIERE", "RESTAURO ARTISTICO", "OPERE ARCHITETTONICHE", "OPERE STRUTTURALI").
Associa ogni sotto-task alla sua macro-area di appartenenza.

Calcolo Durata: - Estrai il valore numerico dalla stringa di durata (es. "10g" -> 10).
Se end_date è illeggibile, calcolala come start_date + duration_days.

Pulizia Stringhe: - Rimuovi residui OCR dai nomi dei task (es. "Reasons impianto elettric" -> "Revisione impianto elettrico").

Schema di Output (JSON):
Restituisci esclusivamente un array di oggetti:

[
{
  "macro_area": "string",
  "task_name": "string",
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD",
  "duration_days": 10,
  "data_integrity_score": 0.95
}
]`;

function buildCorsHeaders(req: Request) {
  const allowedOrigins = [
    Deno.env.get('ALLOWED_ORIGINS') || '',
    Deno.env.get('APP_URL') || '',
    Deno.env.get('VITE_APP_URL') || '',
    Deno.env.get('VITE_SITE_URL') || '',
  ]
    .join(',')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  const origin = req.headers.get('origin')

  if ((Deno.env.get('ENVIRONMENT') || '').toLowerCase() !== 'production') {
    allowedOrigins.push('http://localhost:5173', 'http://localhost:4173')
  }

  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }

  if (origin && allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }

  return headers
}

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { base64Image, mimeType } = await req.json()

    if (!base64Image || !mimeType) {
      return new Response(
        JSON.stringify({ error: 'Missing base64Image or mimeType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get API key from environment
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured in Supabase secrets' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[analyze-gantt] Calling Claude API...')
    console.log('[analyze-gantt] Image size:', base64Image.length, 'chars')

    // Call Claude API
    const requestBody = {
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      temperature: 0,
      messages: [{
        role: "user",
        content: [
          {
            type: mimeType === 'application/pdf' ? 'document' : 'image',
            source: {
              type: "base64",
              media_type: mimeType,
              data: base64Image
            }
          },
          {
            type: "text",
            text: VISION_PROMPT
          }
        ]
      }]
    }

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    console.log('[analyze-gantt] Claude API response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[analyze-gantt] Claude API error:', errorText)

      return new Response(
        JSON.stringify({
          error: `Claude API error (${response.status})`,
          details: errorText
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()

    // Extract text from Claude response
    let responseText = ''
    if (data.content && Array.isArray(data.content)) {
      const textContent = data.content.find((c: any) => c.type === 'text')
      if (textContent) {
        responseText = textContent.text
      }
    }

    if (!responseText) {
      return new Response(
        JSON.stringify({ error: 'No text content in Claude response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[analyze-gantt] Success! Response length:', responseText.length)

    return new Response(
      JSON.stringify({ responseText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('[analyze-gantt] Error:', error)

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
