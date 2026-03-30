import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const CLAUDE_MODEL = 'claude-sonnet-4-20250514'

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

Rispondi SOLO con JSON valido, senza markdown o altri testi.`

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
