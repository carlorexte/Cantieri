/**
 * Parser Cronoprogramma con Google Gemini Vision API
 * Supporta immagini (JPG/PNG/WEBP) e PDF
 *
 * Usa Google Gemini 2.0 Flash (GRATUITO) per analisi vision-based di Gantt chart
 */

// Configuration
const MAX_IMAGE_SIZE_MB = 15;
const API_TIMEOUT_MS = 60000;

// Prompt per Claude Vision
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

/**
 * Converte file in base64
 */
async function convertFileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Impossibile convertire il file in base64'));
        return;
      }
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Chiamata API Gemini Vision tramite Serverless Function
 */
async function callGeminiVision(base64Image, mimeType) {
  // In dev punta direttamente alla produzione (nessun Express locale necessario)
  const apiUrl = import.meta.env.DEV
    ? 'https://rcs.cantieri.pro/api/import-gantt-anthropic'
    : '/api/import-gantt-anthropic';

  console.log('[callGeminiVision] Chiamata Serverless Function...');
  console.log('[callGeminiVision] URL:', apiUrl);
  console.log('[callGeminiVision] Image size:', base64Image.length, 'chars');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    console.log('[callGeminiVision] Invio richiesta...');
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileContent: base64Image,
        mimeType
      }),
      signal: controller.signal
    });

    console.log('[callGeminiVision] Risposta ricevuta. Status:', response.status);

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('[callGeminiVision] Error response:', errorText);

      let errorData = {};
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        // Non è JSON
      }

      // Gestione errori specifici
      if (response.status === 429) {
        throw new Error('Rate limit superato. Attendi qualche minuto e riprova.');
      }
      if (response.status === 500 && errorData.error?.includes('ANTHROPIC_API_KEY')) {
        throw new Error('ANTHROPIC_API_KEY non configurata nelle variabili d\'ambiente Vercel');
      }

      throw new Error(
        `Serverless Function error (${response.status}): ${errorData.error || errorText.substring(0, 200) || 'Unknown error'}`
      );
    }

    const data = await response.json();

    if (!data.responseText) {
      throw new Error('Formato risposta non riconosciuto');
    }

    return data.responseText;

  } catch (error) {
    console.error('[callGeminiVision] Errore caught:', error);

    if (error.name === 'AbortError') {
      throw new Error('Timeout analisi (60s). Riprova con immagine più piccola.');
    }

    // Errore di rete
    if (error.message.includes('Failed to fetch')) {
      throw new Error(
        'Impossibile contattare Serverless Function. ' +
        'Verifica: (1) connessione internet, (2) funzione deployata. ' +
        'Dettagli: ' + error.message
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Valida e trasforma la risposta JSON
 */
function validateAndTransformResponse(responseText) {
  // Estrai JSON dalla risposta (Claude potrebbe aggiungere testo extra)
  let jsonString = responseText.trim();

  // Rimuovi markdown code blocks se presenti
  jsonString = jsonString.replace(/```json\n?/g, '').replace(/```\n?/g, '');

  // Cerca pattern JSON nel testo
  const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonString = jsonMatch[0];
  }

  // Fix per JSON troncato: aggiungi chiusure mancanti
  if (!jsonString.endsWith('}')) {
    console.log('[parseGanttWithVision] JSON troncato rilevato, provo a riparare...');
    // Conta parentesi e aggiungi chiusure mancanti
    const openBraces = (jsonString.match(/\{/g) || []).length;
    const closeBraces = (jsonString.match(/\}/g) || []).length;
    const openBrackets = (jsonString.match(/\[/g) || []).length;
    const closeBrackets = (jsonString.match(/\]/g) || []).length;
    
    // Aggiungi chiusure mancanti
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      jsonString += ']';
    }
    for (let i = 0; i < openBraces - closeBraces; i++) {
      jsonString += '}';
    }
    console.log('[parseGanttWithVision] JSON riparato:', jsonString.substring(0, 200));
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    console.error('[parseGanttWithVision] JSON parsing fallito:', e.message);
    console.error('[parseGanttWithVision] Response text:', responseText.substring(0, 500));
    throw new Error(`Risposta non valida dall'AI. Riprova o usa immagine più chiara.`);
  }

  let rawList = [];
  if (Array.isArray(parsed)) {
    rawList = parsed;
  } else if (parsed && Array.isArray(parsed.attivita)) {
    rawList = parsed.attivita;
  } else {
    throw new Error('Risposta malformata: manca array delle attività');
  }

  if (rawList.length === 0) {
    throw new Error('Nessuna attività trovata nell\'immagine. Verifica che il Gantt sia leggibile.');
  }

  // Pre-process section headers Se abbiamo "macro_area" o "section" nel JSON
  const finalAttivita = [];
  let currentIndex = 1;
  const sezioniViste = new Set();

  rawList.forEach((att) => {
    const descrizioneAttivita = att.task_name || att.descrizione || '';
    const sezione = att.macro_area || att.section || '';

    // Fallback legacy: se il modello restituisce macro_area/section come campo separato
    if (sezione && !sezioniViste.has(sezione)) {
      sezioniViste.add(sezione);
      finalAttivita.push({
        id: `SEC_${sezioniViste.size}`,
        descrizione: sezione.toUpperCase(),
        data_inizio: att.start_date || att.data_inizio || '2026-01-01',
        data_fine: att.end_date || att.data_fine || '2026-01-01',
        durata_giorni: 1,
        tipo_attivita: 'raggruppamento',
        livello: 0,
        parent_id: null,
        isSection: true
      });
      currentIndex++;
    }

    if (descrizioneAttivita) {
      finalAttivita.push({
        ...att,
        descrizione: descrizioneAttivita,
        data_inizio: att.start_date || att.data_inizio || null,
        data_fine: att.end_date || att.data_fine || null,
        durata_giorni: att.duration_days || att.durata_giorni || null,
        livello: att.livello !== undefined ? att.livello : (sezione ? 1 : 0),
        tipo_attivita: att.tipo_attivita || 'task',
        parent_id: att.parent_id || null
      });
      currentIndex++;
    }
  });

  const attivita = finalAttivita.map((att, index) => {
    // Valida descrizione
    if (!att.descrizione || att.descrizione.trim() === '') {
      throw new Error(`Attività ${index + 1}: descrizione vuota`);
    }

    // Normalizza date
    let dInizio = att.data_inizio;
    let dFine = att.data_fine;
    
    if (dInizio && dInizio.split('-').length < 3) dInizio = null; // pulizia noise
    if (dFine && dFine.split('-').length < 3) dFine = null;

    if (!dInizio) dInizio = '2026-01-01';
    if (!dFine) dFine = dInizio;

    const start = new Date(dInizio);
    const end = new Date(dFine);
    if (end < start) dFine = dInizio;

    const finalStart = new Date(dInizio);
    const finalEnd = new Date(dFine);
    const durataCalcolata = Math.max(1, Math.ceil((finalEnd.getTime() - finalStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    return {
      id: att.id || `VIS_${index + 1}`,
      wbs: att.wbs || '',
      wbs_code: att.wbs || '',
      descrizione: att.descrizione.trim().substring(0, 500),
      tipo_attivita: att.tipo_attivita || 'task',
      durata_giorni: att.durata_giorni || durataCalcolata,
      data_inizio: dInizio,
      data_fine: dFine,
      livello: att.livello !== undefined ? att.livello : 1,
      parent_id: att.parent_id || null,
      predecessori: att.predecessori || [],
      colore: att.colore || '#3b82f6',
      percentuale_completamento: 0,
      importo_previsto: 0,
      stato: 'pianificata',
      categoria: 'altro',
      note: 'Importato via AI OCR'
    };
  });

  // Calcola coverage
  const withValidDates = attivita.filter(a => {
    const start = new Date(a.data_inizio);
    const end = new Date(a.data_fine);
    return !isNaN(start.getTime()) && !isNaN(end.getTime());
  }).length;

  const dateCoverage = Math.round((withValidDates / attivita.length) * 100);

  // Calcola range progetto
  const validStarts = attivita.map(a => a.data_inizio).filter(Boolean).sort();
  const validEnds = attivita.map(a => a.data_fine).filter(Boolean).sort();

  return {
    success: true,
    attivita,
    metadata: {
      ...parsed.metadata,
      dateCoverage,
      projectStart: validStarts[0] || null,
      projectEnd: validEnds[validEnds.length - 1] || null,
      metodo: 'gemini_vision',
      model: 'gemini-1.5-flash'
    }
  };
}

/**
 * Funzione principale export
 */
export async function parseGanttWithVision(file, options = {}) {
  const logs = [];

  try {
    // Nota: non serve API key sul frontend, è gestita server-side

    // Verifica dimensione file
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > MAX_IMAGE_SIZE_MB) {
      throw new Error(
        `File troppo grande: ${fileSizeMB.toFixed(1)}MB (max ${MAX_IMAGE_SIZE_MB}MB)`
      );
    }

    // Verifica tipo file
    const mimeType = file.type;
    const isImage = mimeType.startsWith('image/');
    const isPDF = mimeType === 'application/pdf';

    if (!isImage && !isPDF) {
      throw new Error(
        `Formato non supportato: ${mimeType}. Usa JPG, PNG, WEBP o PDF`
      );
    }

    logs.push(`✓ File: ${file.name} (${fileSizeMB.toFixed(1)}MB)`);

    // Converti a base64
    const base64Data = await convertFileToBase64(file);
    logs.push('✓ File caricato');

    // Chiama Gemini Vision API
    logs.push('⏳ Analisi con Gemini Vision...');
    const responseText = await callGeminiVision(base64Data, mimeType);
    logs.push('✓ Risposta ricevuta');

    // Valida e trasforma
    const parseResult = validateAndTransformResponse(responseText);
    logs.push(`✓ ${parseResult.attivita.length} attività estratte`);
    logs.push(`✓ Copertura date: ${parseResult.metadata.dateCoverage}%`);

    return {
      ...parseResult,
      logs
    };

  } catch (error) {
    console.error('[parseGanttWithVision] Errore:', error);

    return {
      success: false,
      error: error.message,
      attivita: [],
      logs: [...logs, `✗ Errore: ${error.message}`],
      metadata: {
        metodo: 'gemini_vision',
        model: 'gemini-2.5-flash'
      }
    };
  }
}

export default parseGanttWithVision;
