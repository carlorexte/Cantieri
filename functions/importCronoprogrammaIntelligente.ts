/**
 * Funzione Deno per l'importazione intelligente di cronoprogrammi
 * Supporta file XLSX e PDF con layout variabili
 *
 * @author Base44 Backend Function
 * @version 2.1.0 - AI POWERED (Optimized)
 * @platform Base44 + Deno
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import * as XLSX from "npm:xlsx@0.18.5";
import pdfParse from "npm:pdf-parse@1.1.1";

// ============================================================================
// UTILITÀ PER LA FORMATTAZIONE DEL TESTO
// ============================================================================

function formatTextoProfessionale(text) {
  if (!text || typeof text !== 'string') return '';

  // Trim spazi bianchi
  text = text.trim();
  if (!text) return '';

  // Converti tutto in minuscolo
  text = text.toLowerCase();

  // Capitalizza la prima lettera
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// ============================================================================
// UTILITÀ PER IL PARSING DELLE DATE E DURATE
// ============================================================================

function excelSerialToDate(serial) {
  try {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + serial * 86400000);

    if (isNaN(date.getTime())) return null;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  } catch (e) {
    console.error("Errore conversione seriale Excel:", e);
    return null;
  }
}

function parseDate(value) {
  if (!value) return null;

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  if (typeof value === 'number' && value > 1000 && value < 100000) {
    return excelSerialToDate(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    // Mappa mesi italiani
    const mesi = {
      'gennaio': '01', 'febbraio': '02', 'marzo': '03', 'aprile': '04', 'maggio': '05', 'giugno': '06',
      'luglio': '07', 'agosto': '08', 'settembre': '09', 'ottobre': '10', 'novembre': '11', 'dicembre': '12',
      'gen': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'mag': '05', 'giu': '06',
      'lug': '07', 'ago': '08', 'set': '09', 'ott': '10', 'nov': '11', 'dic': '12'
    };

    // Tentativo di parsing date testuali (es. "12 Gennaio 2024" o "12 Gen 2024")
    const textDateMatch = trimmed.toLowerCase().match(/^(\d{1,2})[\s\/\-](\w+)[\s\/\-](\d{4})$/);
    if (textDateMatch) {
      const [, day, monthStr, year] = textDateMatch;
      const month = mesi[monthStr];
      if (month) {
        return `${year}-${month}-${day.padStart(2, '0')}`;
      }
    }

    // Formato ISO YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [year, month, day] = trimmed.split('-').map(Number);
      // Validazione: anno ragionevole
      if (year < 1990 || year > 2100) {
        console.warn(`⚠️ Anno sospetto in formato ISO: ${year} per valore "${trimmed}"`);
        return null;
      }
      return trimmed;
    }

    // Formato DD/MM/YYYY o DD-MM-YYYY o DD.MM.YY (ITALIANO - priorità)
    // Supporta separatori / - . e anni a 2 o 4 cifre
    const ddmmyyyy = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
    if (ddmmyyyy) {
      let [, part1, part2, yearStr] = ddmmyyyy;
      
      // Gestione anno a 2 cifre (es. 26 -> 2026)
      let year = parseInt(yearStr);
      if (year < 100) {
        year += 2000;
      }

      // Validazione anno
      if (year < 1990 || year > 2100) {
        console.warn(`⚠️ Anno sospetto: ${year} per valore "${trimmed}"`);
        return null;
      }
      
      // Assume formato italiano DD/MM/YYYY
      const day = String(part1).padStart(2, '0');
      const month = String(part2).padStart(2, '0');
      
      // Validazione giorno e mese
      const dayNum = parseInt(day);
      const monthNum = parseInt(month);
      
      if (monthNum < 1 || monthNum > 12) {
        console.warn(`⚠️ Mese non valido: ${month} per valore "${trimmed}"`);
        return null;
      }
      
      if (dayNum < 1 || dayNum > 31) {
        console.warn(`⚠️ Giorno non valido: ${day} per valore "${trimmed}"`);
        return null;
      }
      
      // Verifica validità della data creandola
      const testDate = new Date(`${year}-${month}-${day}T12:00:00`);
      if (isNaN(testDate.getTime())) {
        console.warn(`⚠️ Data non valida: ${year}-${month}-${day} per valore "${trimmed}"`);
        return null;
      }
      
      return `${year}-${month}-${day}`;
    }

    // Formato YYYY/MM/DD
    const yyyymmdd = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (yyyymmdd) {
      const [, year, month, day] = yyyymmdd;
      
      if (parseInt(year) < 1990 || parseInt(year) > 2100) {
        console.warn(`⚠️ Anno sospetto in formato YYYY: ${year} per valore "${trimmed}"`);
        return null;
      }
      
      const d = String(day).padStart(2, '0');
      const m = String(month).padStart(2, '0');
      return `${year}-${m}-${d}`;
    }
  }

  console.warn(`⚠️ Impossibile parsare la data: "${value}"`);
  return null;
}

function calcolaDurataGiorni(dataInizio, dataFine) {
  try {
    const inizio = new Date(dataInizio);
    const fine = new Date(dataFine);
    const diff = fine.getTime() - inizio.getTime();
    return Math.round(diff / (1000 * 60 * 60 * 24)) + 1;
  } catch (e) {
    return 0;
  }
}

// NUOVA FUNZIONE: Estrae durata da stringhe come "15 g", "36 giorni", "2g"
function estraiDurataGiorni(durataString) {
  if (!durataString) return null;

  const str = String(durataString).toLowerCase().trim();

  // Pattern: "15 g", "15g", "15 giorni", "15 gg"
  const match = str.match(/(\d+)\s*(g|gg|giorni|giorno)?/);
  if (match) {
    return parseInt(match[1], 10);
  }

  return null;
}

function aggiungiGiorni(dataIso, giorni) {
  const d = new Date(dataIso);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + giorni);
  return d.toISOString().split('T')[0];
}

function normalizzaHeader(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizzaValoreTesto(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseImporto(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number' && !isNaN(value)) return value;

  const cleaned = String(value)
    .replace(/[€\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');

  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function trovaIndiceColonna(headers, aliases) {
  for (const alias of aliases) {
    const idx = headers.findIndex((h) => h.includes(alias));
    if (idx !== -1) return idx;
  }
  return -1;
}

function trovaRigaHeader(sheetRows) {
  const maxRows = Math.min(sheetRows.length, 20);
  let bestIndex = 0;
  let bestScore = -1;

  const keywords = ['descr', 'attivit', 'lavor', 'inizio', 'fine', 'start', 'end', 'durata', 'giorni'];
  for (let i = 0; i < maxRows; i++) {
    const row = sheetRows[i] || [];
    const normalizedCells = row.map((cell) => normalizzaHeader(cell));
    const score = normalizedCells.reduce((acc, cell) => {
      if (!cell) return acc;
      return acc + (keywords.some((k) => cell.includes(k)) ? 1 : 0);
    }, 0);

    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return bestIndex;
}

// ============================================================================
// PARSING AI-POWERED PER XLSX E PDF E IMMAGINI
// ============================================================================

async function parseImage(fileUrl, base44) {
  console.log("🖼️ Inizio parsing IMMAGINE con AI Vision...");
  
  try {
    const prompt = `
Analizza questa IMMAGINE di un cronoprogramma lavori (può essere un Gantt, una tabella, un foglio Excel fotografato).

OBIETTIVO: Estrarre TUTTE le righe/attività visibili con le loro date e durate.

REGOLE FONDAMENTALI:
1. LEGGI LE DATE DAL FILE: Cerca colonne "Inizio", "Fine", "Start", "End", "Data inizio", "Data fine" oppure leggi le intestazioni del Gantt.
2. CONVERTI IN YYYY-MM-DD: Qualunque formato di data trovi (2.2.26, 02/02/2026, "2 feb 2026"), convertila SEMPRE in YYYY-MM-DD.
3. NULL SE NON VISIBILE: Se per una riga non vedi una data leggibile, usa null. NON inventare date.
4. DATE UGUALI OK: Se più attività iniziano lo stesso giorno (parallele), riportale con la stessa data. È corretto.
5. BARRE GANTT: La posizione e lunghezza delle barre indica le date. Cerca le date sulle intestazioni dell'asse temporale.
6. FASI: Righe in grassetto/maiuscolo o con rientro maggiore sono Fasi (livello 0). Le altre sono Attività (livello 1).
7. IMPORTO: Se vedi colonne con valori in € o prezzi, estraili come importo_previsto (numero intero, 0 se non presente).

Restituisci JSON:
{
  "attivita": [
    {
      "descrizione": "Nome attività (esattamente come nel file)",
      "data_inizio": "YYYY-MM-DD (null se non leggibile)",
      "data_fine": "YYYY-MM-DD (null se non leggibile)",
      "durata_giorni": 10,
      "importo_previsto": 0,
      "livello": 1
    }
  ],
  "note_ai": "Descrivi la struttura dell'immagine e come hai interpretato le date."
}
    `;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      file_urls: [fileUrl], 
      response_json_schema: {
        type: "object",
        properties: {
          attivita: {
            type: "array",
            items: {
              type: "object",
              properties: {
                descrizione: { type: "string" },
                data_inizio: { type: ["string", "null"] },
                data_fine: { type: ["string", "null"] },
                durata_giorni: { type: "number" },
                importo_previsto: { type: "number" },
                livello: { type: "number" }
              },
              required: ["descrizione", "livello"]
            }
          },
          note_ai: { type: "string" }
        },
        required: ["attivita"]
      }
    });

    console.log(`✓ Vision AI ha risposto con ${response.attivita.length} attività.`);

    const attivitaProcessed = response.attivita.map((att) => {
        const dataInizio = parseDate(att.data_inizio);
        const dataFine = parseDate(att.data_fine);

        return {
            ...att,
            descrizione: formatTextoProfessionale(att.descrizione),
            durata_giorni: att.durata_giorni || 1,
            data_inizio: dataInizio,
            data_fine: dataFine
        };
    }).filter(a => a.descrizione);

    return {
        attivita: attivitaProcessed,
        note: response.note_ai || "Parsing Immagine completato."
    };

  } catch (error) {
    console.error("❌ Errore parsing Immagine:", error);
    throw new Error(`Errore parsing Immagine con AI: ${error.message}`);
  }
}

async function parsePDF(fileBuffer, cantiereId, base44) {
  console.log("📄 Inizio parsing file PDF con AI (modalità assistita abilitata)...");

  try {
    const uint8Array = new Uint8Array(fileBuffer);
    const data = await pdfParse(uint8Array);
    const text = data.text;

    console.log(`✓ Testo estratto (${text.length} caratteri)`);
    console.log("📝 Prime 500 caratteri:", text.substring(0, 500));
    // RIMOSSO LOG TESTO COMPLETO PER EVITARE OVERFLOW LOGS

    console.log("\n🧠 Chiamata a InvokeLLM per interpretare il PDF (estrazione attività, durate e date se presenti)...");

    // TRONCAMENTO TESTO PER EVITARE LIMITI TOKEN/PAYLOAD
    const MAX_TEXT_LENGTH = 15000;
    const truncatedText = text.length > MAX_TEXT_LENGTH 
        ? text.substring(0, MAX_TEXT_LENGTH) + "\n...[TESTO TRONCATO PER LIMITI AI]..." 
        : text;

    const llmPrompt = `
Analizza il testo estratto da un cronoprogramma lavori (probabilmente una tabella con colonne allineate).
OBIETTIVO: Estrarre TUTTE le attività con le DATE REALI di inizio e fine.

👀 CERCA COLONNE SPECIFICHE:
- Descrizione attività / Lavorazione / Voce
- "Inizio" / "Start" / "Data inizio" (es. 2.2.26, 12.02.2026, 2026-02-02)
- "Fine" / "End" / "Data fine" (es. 19.2.26)
- "Durata gg" / "Durata" / "Days" / "Giorni" (es. 18, 148, 5)

⚠️ REGOLE FONDAMENTALI (rispettale SEMPRE):
1. CONVERTI DATE in formato YYYY-MM-DD: "2.2.26" → "2026-02-02", "12/02/2026" → "2026-02-12", "12 febbraio 2026" → "2026-02-12"
2. NULL se non trovi una data reale: NON inventare mai date. Se la colonna è vuota per una riga, usa null.
3. DATE UGUALI sono CORRETTE: Se più attività iniziano lo stesso giorno, riporta la stessa data per tutte - non creare sequenze artificiali.
4. FASI/RAGGRUPPAMENTI: Righe in MAIUSCOLO, con totali o senza durata specifica sono Fasi (livello 0). Attività specifiche sono livello 1.
5. DURATA: Se trovi una colonna durata, usala. Se non c'è, calcolala come giorni tra data_inizio e data_fine (inclusi). Se mancano entrambe, usa null.
6. IGNORA righe di intestazione, totali, righe vuote.

FORMATO OUTPUT (OBBLIGATORIO - usa SEMPRE YYYY-MM-DD per le date):
{
  "attivita": [
    {
      "descrizione": "Nome attività",
      "durata_giorni": 10,
      "gruppo_fase": "Nome fase/categoria (o null)",
      "data_inizio": "2026-02-02",
      "data_fine": "2026-02-12",
      "livello": 1
    }
  ],
  "note_ai": "Quali colonne hai trovato? Come hai interpretato le date?"
}

Testo PDF estratto (primi ${MAX_TEXT_LENGTH} caratteri):
"""
${truncatedText}
"""
`;

    const llmResult = await base44.integrations.Core.InvokeLLM({
        prompt: llmPrompt,
        response_json_schema: {
            type: "object",
            properties: {
                attivita: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            descrizione: { type: "string" },
                            durata_giorni: { type: "number", nullable: true }, // Allow null duration
                            gruppo_fase: { type: "string", nullable: true },
                            data_inizio: { type: "string", nullable: true }, // Allow null date
                            data_fine: { type: "string", nullable: true }   // Allow null date
                        },
                        required: ["descrizione"]
                    }
                },
                note_ai: { type: "string" }
            },
            required: ["attivita", "note_ai"]
        }
    });

    console.log(`✓ InvokeLLM ha risposto. ${llmResult.attivita.length} attività suggerite.`);
    console.log(`  - Note AI: ${llmResult.note_ai || 'Nessuna'}`);

    // LOG DETTAGLIATO: Prime 5 attività raw dall'AI
    console.log("\n📋 Prime 5 attività dall'AI (raw):");
    llmResult.attivita.slice(0, 5).forEach((att, idx) => {
      console.log(`  ${idx + 1}. "${att.descrizione}"`);
      console.log(`     - Gruppo: ${att.gruppo_fase || 'N/A'}`);
      console.log(`     - Durata: ${att.durata_giorni || 'N/A'} giorni`);
      console.log(`     - Inizio: ${att.data_inizio || 'N/A'}`);
      console.log(`     - Fine: ${att.data_fine || 'N/A'}`);
    });

    // Validazione e parsing date e durate
    console.log("\n🔄 Validazione e parsing date/durate...");

    const attivitaProcessed = llmResult.attivita.map((att, idx) => {
        // Usa la durata fornita dall'AI, altrimenti cerca nel testo o default a 1
        const durata = att.durata_giorni && att.durata_giorni > 0 ? att.durata_giorni : estraiDurataGiorni(att.descrizione) || 1;

        const dataInizio = parseDate(att.data_inizio);
        const dataFine = parseDate(att.data_fine);

        // Se la durata è 0 o negativa, la imposto a 1 per evitare problemi nel calcolo delle date
        const finalDurata = Math.max(1, durata);

        // Log dettagliato per debug
        if (finalDurata === 1 && durata !== 1) { // Se è stata defaultata
          console.log(`  ⚠️ Durata defaultata a 1 per attività "${att.descrizione}" (AI raw: ${att.durata_giorni}, extracted: ${estraiDurataGiorni(att.descrizione)})`);
        }

        // FORMATTAZIONE PROFESSIONALE
        const descrizioneFormattata = formatTextoProfessionale(att.descrizione);
        const gruppoFaseFormattato = att.gruppo_fase ? formatTextoProfessionale(att.gruppo_fase) : null;

        return {
            descrizione: descrizioneFormattata,
            gruppo_fase: gruppoFaseFormattato,
            durata_giorni: finalDurata,
            data_inizio: dataInizio,
            data_fine: dataFine
        };
    }).filter((att) => att.descrizione && att.durata_giorni > 0); // Filtra attività senza descrizione o durata valida

    console.log(`✓ ${attivitaProcessed.length} attività valide processate.`);

    if (attivitaProcessed.length === 0) {
      console.error("❌ Nessuna attività valida (con descrizione e durata) trovata!");
      console.error(`   Note dall'AI: ${llmResult.note_ai}`);
      throw new Error("L'AI non è riuscita a estrarre attività valide (con descrizione e durata) dal PDF. Verifica il file.");
    }

    // LOG DETTAGLIATO: Prime 3 attività valide
    console.log("\n✅ Prime 3 attività valide:");
    attivitaProcessed.slice(0, 3).forEach((att, idx) => {
      console.log(`  ${idx + 1}. "${att.descrizione}"`);
      console.log(`     - Inizio: ${att.data_inizio || 'N/A'}, Fine: ${att.data_fine || 'N/A'}, Durata: ${att.durata_giorni} giorni`);
    });

    return {
        attivita: attivitaProcessed,
        note: llmResult.note_ai || "Parsing PDF completato con AI (modalità assistita)."
    };

  } catch (error) {
    console.error("❌ Errore parsing PDF:", error);
    throw new Error(`Errore parsing PDF con AI: ${error.message}`);
  }
}

async function parseXLSX(fileBuffer, cantiereId, base44) {
  console.log("📊 Inizio parsing file XLSX (strutturato + fallback AI)...");

  try {
    console.log("📖 Lettura file Excel...");
    const uint8Array = new Uint8Array(fileBuffer);
    const workbook = XLSX.read(uint8Array, { type: 'array', cellDates: true, dateNF: 'yyyy-mm-dd' });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error("Il file Excel non contiene fogli di lavoro.");
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    console.log(`✓ Foglio "${firstSheetName}" caricato`);

    const sheetRows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: true,
      defval: null,
      blankrows: false
    });

    if (!sheetRows.length) {
      throw new Error("Il foglio Excel è vuoto.");
    }

    const headerRowIndex = trovaRigaHeader(sheetRows);
    const headerRaw = (sheetRows[headerRowIndex] || []).map((cell) => normalizzaValoreTesto(cell));
    const headerNorm = headerRaw.map((h) => normalizzaHeader(h));

    const colDescrizione = trovaIndiceColonna(headerNorm, ['descrizion', 'attivita', 'lavorazione', 'lavori', 'voce', 'nome']);
    const colInizio = trovaIndiceColonna(headerNorm, ['data inizio', 'inizio', 'start', 'dal']);
    const colFine = trovaIndiceColonna(headerNorm, ['data fine', 'fine', 'end', 'al']);
    const colDurata = trovaIndiceColonna(headerNorm, ['durata', 'giorni', 'gg', 'days']);
    const colFase = trovaIndiceColonna(headerNorm, ['fase', 'gruppo', 'categoria', 'wbs']);
    const colImporto = trovaIndiceColonna(headerNorm, ['importo', 'totale', 'euro', 'costo', 'valore', 'budget']);

    console.log("🧭 Mapping colonne rilevato:", {
      colDescrizione,
      colInizio,
      colFine,
      colDurata,
      colFase,
      colImporto
    });

    const structuredAttivita = [];
    let structuredConDate = 0;

    for (let i = headerRowIndex + 1; i < sheetRows.length; i++) {
      const row = sheetRows[i] || [];
      if (!row || row.every((cell) => cell === null || String(cell).trim() === '')) continue;

      const descrizioneRaw = colDescrizione >= 0 ? row[colDescrizione] : row[0];
      const descrizione = normalizzaValoreTesto(descrizioneRaw);
      if (!descrizione || descrizione.length < 3 || /^\d+([.,]\d+)?$/.test(descrizione)) continue;

      const inizioRaw = colInizio >= 0 ? row[colInizio] : null;
      const fineRaw = colFine >= 0 ? row[colFine] : null;
      const durataRaw = colDurata >= 0 ? row[colDurata] : null;
      const faseRaw = colFase >= 0 ? row[colFase] : null;
      const importoRaw = colImporto >= 0 ? row[colImporto] : null;

      let dataInizio = parseDate(inizioRaw);
      let dataFine = parseDate(fineRaw);
      let durata = typeof durataRaw === 'number' ? durataRaw : estraiDurataGiorni(durataRaw);
      if (!durata) durata = estraiDurataGiorni(descrizione);

      if (!durata && dataInizio && dataFine) {
        durata = calcolaDurataGiorni(dataInizio, dataFine);
      }
      if (!durata || durata < 1) durata = 1;

      if (dataInizio && !dataFine) {
        dataFine = aggiungiGiorni(dataInizio, durata - 1);
      } else if (!dataInizio && dataFine) {
        dataInizio = aggiungiGiorni(dataFine, -(durata - 1));
      }

      if (dataInizio || dataFine) structuredConDate++;

      structuredAttivita.push({
        descrizione: formatTextoProfessionale(descrizione),
        gruppo_fase: faseRaw ? formatTextoProfessionale(normalizzaValoreTesto(faseRaw)) : null,
        data_inizio: dataInizio,
        data_fine: dataFine,
        durata_giorni: Math.max(1, Math.round(durata)),
        importo_previsto: parseImporto(importoRaw)
      });
    }

    const dateCoverage = structuredAttivita.length > 0
      ? structuredConDate / structuredAttivita.length
      : 0;

    if (structuredAttivita.length >= 3 || (structuredAttivita.length > 0 && dateCoverage >= 0.4)) {
      console.log(`✅ Parser strutturato completato: ${structuredAttivita.length} attività, copertura date ${(dateCoverage * 100).toFixed(0)}%`);
      return {
        attivita: structuredAttivita,
        note: `Parsing Excel strutturato completato (${structuredAttivita.length} attività).`
      };
    }

    console.log("⚠️ Parsing strutturato non affidabile, attivo fallback AI...");

    const rowsForAI = XLSX.utils.sheet_to_json(worksheet, {
      raw: false,
      dateNF: 'yyyy-mm-dd',
      defval: ''
    });

    const csvFallback = rowsForAI.length === 0 ? XLSX.utils.sheet_to_csv(worksheet) : '';
    const datiStrutturati = rowsForAI.length > 0
      ? JSON.stringify(rowsForAI.slice(0, 200), null, 2)
      : csvFallback;
    const formatoInput = rowsForAI.length > 0 ? 'JSON (righe strutturate)' : 'CSV (fallback)';

    const llmPrompt = `
Analizza i seguenti dati estratti da un file Excel (formato ${formatoInput}).
OBIETTIVO: Estrarre attività con DATE REALI di inizio e fine.

ISTRUZIONI CRITICHE:
1. CERCA COLONNE DATE: Identifica colonne con date (es. "Inizio", "Fine", "Start", "End", "Data inizio", "Data fine").
2. CERCA COLONNE DURATA: "Durata", "Durata gg", "Giorni", "Days".
3. RIPORTA DATE ESATTE: non creare sequenze artificiali, mantieni le date uguali quando presenti.
4. FORMATO OUTPUT DATE: YYYY-MM-DD.
5. Ignora righe vuote o non descrittive.

Output JSON:
{
  "attivita": [
    {
      "descrizione": "string",
      "durata_giorni": number,
      "gruppo_fase": "string o null",
      "data_inizio": "YYYY-MM-DD o null",
      "data_fine": "YYYY-MM-DD o null"
    }
  ],
  "note_ai": "Descrivi quali colonne hai trovato."
}

DATI EXCEL:
"""
${datiStrutturati}
"""
    `;

    const llmResult = await base44.integrations.Core.InvokeLLM({
        prompt: llmPrompt,
        response_json_schema: {
            type: "object",
            properties: {
                attivita: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            descrizione: { type: "string" },
                            durata_giorni: { type: "number", nullable: true },
                            gruppo_fase: { type: "string", nullable: true },
                            data_inizio: { type: "string", nullable: true },
                            data_fine: { type: "string", nullable: true }
                        },
                        required: ["descrizione"]
                    }
                },
                note_ai: { type: "string" }
            },
            required: ["attivita"]
        }
    });

    console.log(`✓ InvokeLLM ha risposto con ${llmResult.attivita.length} attività.`);

    const attivitaProcessed = llmResult.attivita.map((att) => {
        const dataInizio = parseDate(att.data_inizio);
        const dataFine = parseDate(att.data_fine);

        let durataGiorniCalculated = att.durata_giorni;
        if (!durataGiorniCalculated && dataInizio && dataFine) {
          durataGiorniCalculated = calcolaDurataGiorni(dataInizio, dataFine);
        } else if (!durataGiorniCalculated) {
          durataGiorniCalculated = 1;
        }
        durataGiorniCalculated = Math.max(1, durataGiorniCalculated);

        const descrizioneFormattata = formatTextoProfessionale(att.descrizione);
        const gruppoFaseFormattato = att.gruppo_fase ? formatTextoProfessionale(att.gruppo_fase) : null;

        return {
            descrizione: descrizioneFormattata,
            gruppo_fase: gruppoFaseFormattato,
            data_inizio: dataInizio,
            data_fine: dataFine,
            durata_giorni: durataGiorniCalculated
        };
    }).filter((att) => att.descrizione && att.durata_giorni > 0);

    console.log(`✓ ${attivitaProcessed.length} attività valide dopo fallback AI`);

    if (attivitaProcessed.length === 0) {
      console.error("❌ Nessuna attività valida trovata!");
      console.error("   Possibili cause:");
      console.error("   - L'AI non ha trovato attività, date o durate nel file");
      console.error("   - Le date sono in un formato non riconosciuto da parseDate()");
      console.error("   - Il file non contiene un cronoprogramma valido");
      throw new Error("L'AI non è riuscita a estrarre attività valide. Verifica il file.");
    }

    return {
        attivita: attivitaProcessed,
        note: llmResult.note_ai || "Parsing Excel completato con fallback AI."
    };

  } catch (error) {
    console.error("❌ Errore parsing XLSX:", error);
    throw new Error(`Errore parsing XLSX: ${error.message}`);
  }
}

// ============================================================================
// FUNZIONE PRINCIPALE
// ============================================================================

Deno.serve(async (req) => {
  console.log("\n🚀 =================================================");
  console.log("🚀 IMPORTAZIONE CRONOPROGRAMMA AI-POWERED v2.1");
  console.log("🚀 =================================================\n");

  const base44 = createClientFromRequest(req);

  try {
    console.log("🔐 Step 1: Autenticazione...");
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ success: false, error: 'Non autorizzato' }, { status: 401 });
    }

    console.log(`✓ Utente: ${user.email}`);

    console.log("\n📦 Step 2: Parametri...");
    const body = await req.json();
    const { file_url, cantiere_id, data_inizio_progetto } = body;

    console.log(`  - file_url: ${file_url}`);
    console.log(`  - cantiere_id: ${cantiere_id}`);
    console.log(`  - data_inizio_progetto (input): ${data_inizio_progetto || 'NON FORNITA'}`);

    if (!file_url || !cantiere_id) {
      return Response.json({ success: false, error: 'Parametri mancanti' }, { status: 400 });
    }

    console.log("\n🏗️ Step 3: Verifica cantiere...");
    const cantiere = await base44.asServiceRole.entities.Cantiere.get(cantiere_id);

    if (!cantiere) {
      return Response.json({ success: false, error: 'Cantiere non trovato' }, { status: 404 });
    }

    console.log(`✓ Cantiere: ${cantiere.denominazione || cantiere.id}`);

    console.log("\n📥 Step 4: Download file...");
    const fileResponse = await fetch(file_url);

    if (!fileResponse.ok) {
      throw new Error(`Download fallito: ${fileResponse.statusText}`);
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const fileExtension = file_url.split('.').pop().toLowerCase();

    console.log(`✓ File: ${fileBuffer.byteLength} bytes, .${fileExtension}`);

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (fileBuffer.byteLength > MAX_FILE_SIZE) {
        return Response.json({ success: false, error: `File troppo grande (${(fileBuffer.byteLength / 1024 / 1024).toFixed(2)}MB). Limite: 10MB.` }, { status: 413 });
    }

    if (!['xlsx', 'xls', 'pdf', 'jpg', 'jpeg', 'png'].includes(fileExtension)) {
      return Response.json({ success: false, error: 'Tipo file non supportato. Usa PDF, Excel o Immagini.' }, { status: 400 });
    }

    console.log("\n🧠 Step 5: Parsing AI...");
    let risultatoParser;

    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      risultatoParser = await parseXLSX(fileBuffer, cantiere_id, base44);
    } else if (['jpg', 'jpeg', 'png'].includes(fileExtension)) {
      // Per le immagini passiamo l'URL direttamente all'LLM (Vision)
      risultatoParser = await parseImage(file_url, base44);
    } else { // PDF
      risultatoParser = await parsePDF(fileBuffer, cantiere_id, base44);
    }

    let { attivita, note } = risultatoParser;
    let modalita = 'standard';

    if (!attivita || attivita.length === 0) {
      return Response.json({ success: false, error: 'Nessuna attività trovata' }, { status: 400 });
    }

    // Check if any activity is missing dates to determine if assisted mode is needed
    const hasMissingDates = attivita.some(att => !att.data_inizio || !att.data_fine);

    if (hasMissingDates) {
      modalita = 'assistita';
      console.log(`✓ Modalità: ${modalita} (trovate attività con date mancanti)`);

      console.log("\n📅 Step 6: Calcolo automatico date (modalità assistita)...");

      // Determina data inizio base per il calcolo
      let dataInizioBase;
      if (data_inizio_progetto) {
        dataInizioBase = new Date(data_inizio_progetto);
        console.log(`✓ Data inizio base fornita dall'utente: ${data_inizio_progetto}`);
      } else if (cantiere.data_inizio) {
        dataInizioBase = new Date(cantiere.data_inizio);
        console.log(`✓ Data inizio base dal cantiere: ${cantiere.data_inizio}`);
      } else {
        dataInizioBase = new Date();
        console.log(`⚠️ Nessuna data inizio base fornita, uso oggi: ${dataInizioBase.toISOString().split('T')[0]}`);
      }
      // Ensure dataInizioBase is valid
      if (isNaN(dataInizioBase.getTime())) {
         throw new Error("Impossibile determinare una data di inizio valida per il progetto.");
      }

      // CALCOLO DATE ASSISTITO (PIANIFICAZIONE SEQUENZIALE)
      // Per le attività senza date, le pianifichiamo sequenzialmente
      // dopo l'ultima attività con data nota (o dalla data base del progetto).

      const formatData = (d) => d.toISOString().split('T')[0];
      let cursoreData = new Date(dataInizioBase);

      attivita = attivita.map((att, idx) => {
        // Se l'attività ha entrambe le date valide, usale e sposta il cursore
        if (att.data_inizio && att.data_fine) {
           try {
               const dataFineAtt = new Date(att.data_fine);
               // Aggiorna il cursore al giorno lavorativo successivo alla fine
               const giornoDopo = new Date(dataFineAtt);
               giornoDopo.setDate(giornoDopo.getDate() + 1);
               if (giornoDopo > cursoreData) cursoreData = giornoDopo;
           } catch(e){}
           return att;
        }

        // Se ha solo data_inizio ma non data_fine, calcola la fine dalla durata
        if (att.data_inizio && !att.data_fine) {
          const dataInizioAtt = new Date(att.data_inizio);
          const durata = att.durata_giorni || 1;
          const dataFineAtt = new Date(dataInizioAtt);
          dataFineAtt.setDate(dataFineAtt.getDate() + durata - 1);
          const giornoDopo = new Date(dataFineAtt);
          giornoDopo.setDate(giornoDopo.getDate() + 1);
          if (giornoDopo > cursoreData) cursoreData = giornoDopo;
          return {
            ...att,
            data_fine: formatData(dataFineAtt),
            durata_giorni: durata
          };
        }

        // SE NON HA DATE: pianifica sequenzialmente dal cursore corrente
        const dataInizio = new Date(cursoreData);
        const durata = att.durata_giorni || 1;
        const dataFine = new Date(dataInizio);
        // Durata 1 = stessa data inizio/fine; durata N = inizio + (N-1) giorni
        dataFine.setDate(dataFine.getDate() + durata - 1);

        // Avanza il cursore al giorno successivo alla fine di questa attività
        cursoreData = new Date(dataFine);
        cursoreData.setDate(cursoreData.getDate() + 1);

        return {
          ...att,
          data_inizio: formatData(dataInizio),
          data_fine: formatData(dataFine)
        };
      });

      console.log(`✓ Date calcolate per ${attivita.length} attività`);
      console.log(`  - Prima attività (calcolata): ${attivita[0].data_inizio}`);
      console.log(`  - Ultima attività (calcolata): ${attivita[attivita.length - 1].data_fine}`);
    } else {
      console.log(`✓ Modalità: ${modalita} (tutte le attività hanno date esplicite)`);
    }

    console.log(`✓ Attività estratte: ${attivita.length}`);

    console.log("\n📅 Step 7: Range temporale complessivo...");
    const dateInizio = attivita.map(a => a.data_inizio).filter(Boolean).sort();
    const dateFine = attivita.map(a => a.data_fine).filter(Boolean).sort();
    const todayIso = new Date().toISOString().split('T')[0];

    const rangeTemporale = {
      data_inizio: dateInizio[0] || todayIso,
      data_fine: dateFine[dateFine.length - 1] || dateInizio[0] || todayIso
    };

    console.log(`✓ Range: ${rangeTemporale.data_inizio} → ${rangeTemporale.data_fine}`);

    console.log("\n💾 Step 8: Preparazione dati per il database...");

    const gruppiMap = new Map();
    for (const att of attivita) {
      const gruppo = (att.gruppo_fase || '').trim();
      if (!gruppo) continue;
      if (!gruppiMap.has(gruppo)) {
        gruppiMap.set(gruppo, {
          descrizione: gruppo,
          data_inizio: att.data_inizio,
          data_fine: att.data_fine
        });
      } else {
        const curr = gruppiMap.get(gruppo);
        if (att.data_inizio && (!curr.data_inizio || att.data_inizio < curr.data_inizio)) {
          curr.data_inizio = att.data_inizio;
        }
        if (att.data_fine && (!curr.data_fine || att.data_fine > curr.data_fine)) {
          curr.data_fine = att.data_fine;
        }
      }
    }

    const gruppiDaInserire = Array.from(gruppiMap.values()).map((gruppo) => {
      const dataInizio = gruppo.data_inizio || rangeTemporale.data_inizio;
      const dataFine = gruppo.data_fine || dataInizio;
      return {
        cantiere_id: cantiere_id,
        gruppo_fase: '',
        descrizione: gruppo.descrizione,
        tipo_attivita: 'raggruppamento',
        parent_id: null,
        data_inizio: dataInizio,
        data_fine: dataFine,
        durata_giorni: calcolaDurataGiorni(dataInizio, dataFine) || 1,
        percentuale_completamento: 0,
        importo_previsto: 0,
        colore: '#1e293b',
        categoria: 'altro',
        predecessori: [],
        responsabile: '',
        note: 'Creato automaticamente da importazione',
        stato: 'pianificata'
      };
    });

    let gruppiInseriti = [];
    if (gruppiDaInserire.length > 0) {
      gruppiInseriti = await base44.asServiceRole.entities.Attivita.bulkCreate(gruppiDaInserire);
    }

    const gruppoIdByDescrizione = gruppiInseriti.reduce((acc, gruppo) => {
      acc[gruppo.descrizione] = gruppo.id;
      return acc;
    }, {});

    const attivitaDaInserire = attivita.map((att) => ({
      cantiere_id: cantiere_id,
      gruppo_fase: att.gruppo_fase || '',
      descrizione: att.descrizione,
      tipo_attivita: att.livello === 0 ? 'raggruppamento' : 'task',
      parent_id: att.gruppo_fase ? (gruppoIdByDescrizione[att.gruppo_fase] || null) : null,
      data_inizio: att.data_inizio,
      data_fine: att.data_fine,
      durata_giorni: att.durata_giorni,
      percentuale_completamento: 0,
      importo_previsto: att.importo_previsto || 0,
      colore: '#3b82f6',
      categoria: 'altro',
      predecessori: [],
      responsabile: '',
      note: '',
      stato: 'pianificata'
    }));

    console.log(`✓ ${attivitaDaInserire.length} attività pronte (+${gruppiDaInserire.length} gruppi WBS)`);

    console.log("\n💾 Step 9: Salvataggio database...");
    const attivitaInserite = await base44.asServiceRole.entities.Attivita.bulkCreate(attivitaDaInserire);
    const totaleInserite = attivitaInserite.length + gruppiInseriti.length;

    console.log(`✓ ${totaleInserite} record salvati (${attivitaInserite.length} attività, ${gruppiInseriti.length} gruppi)`);

    console.log("\n✅ =================================================");
    console.log("✅ IMPORTAZIONE COMPLETATA CON SUCCESSO");
    console.log("✅ =================================================\n");

    return Response.json({
      success: true,
      message: `Importazione completata! ${attivitaInserite.length} attività importate.`,
      attivita_importate: attivitaInserite.length,
      range_temporale: rangeTemporale,
      note_importazione: modalita === 'assistita'
        ? `${note}\n\n⚠️ NOTA: Alcune attività non avevano date esplicite nel file. Le date sono state calcolate automaticamente in sequenza a partire dalla data di inizio progetto. Puoi modificarle nel Gantt.`
        : note,
      dettagli: {
        cantiere: cantiere.denominazione || cantiere.oggetto_lavori,
        file_tipo: fileExtension,
        metodo_parsing: modalita === 'assistita' ? 'Assistita (calcolo date automatico)' : 'Standard',
        modalita: modalita,
        gruppi_wbs_creati: gruppiInseriti.length
      }
    });

  } catch (error) {
    console.error("\n❌ =================================================");
    console.error("❌ ERRORE");
    console.error("❌ =================================================");
    console.error("Errore:", error);
    console.error("Stack:", error.stack);

    return Response.json(
      {
        success: false,
        error: error.message || 'Errore sconosciuto',
        dettagli: error.stack
      },
      { status: 500 }
    );
  }
});