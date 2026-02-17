/**
 * Funzione Deno per l'importazione intelligente di cronoprogrammi
 * Supporta file XLSX e PDF con layout variabili
 *
 * @author Base44 Backend Function
 * @version 2.0.0 - AI POWERED
 * @platform Base44 + Deno
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
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
      if (year < 2020 || year > 2030) {
        console.warn(`⚠️ Anno sospetto in formato ISO: ${year} per valore "${trimmed}"`);
        return null;
      }
      return trimmed;
    }

    // Formato DD/MM/YYYY o DD-MM-YYYY (ITALIANO - priorità)
    const ddmmyyyy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyy) {
      const [, part1, part2, year] = ddmmyyyy;
      
      // Validazione anno
      if (parseInt(year) < 2020 || parseInt(year) > 2030) {
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
      
      if (parseInt(year) < 2020 || parseInt(year) > 2030) {
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

// ============================================================================
// PARSING AI-POWERED PER XLSX E PDF E IMMAGINI
// ============================================================================

async function parseImage(fileUrl, base44) {
  console.log("🖼️ Inizio parsing IMMAGINE con AI Vision...");
  
  try {
    const prompt = `
      Sei un esperto Project Manager. Analizza questa IMMAGINE di un cronoprogramma lavori (Gantt) o tabella di pianificazione.
      
      Il tuo compito è estrarre le attività e le loro date ESATTE visibili nell'immagine.
      
      REGOLE CRITICHE:
      1. LEGGI LE DATE REALI: Non inventare date sequenziali. Leggi attentamente le colonne delle date (Inizio/Fine) o la posizione delle barre nel grafico temporale.
      2. PARALLELISMO: Molte attività in un cantiere iniziano lo stesso giorno o si sovrappongono. Rispetta questa concorrenza. Non metterle una dopo l'altra se l'immagine mostra che sono parallele.
      3. GERARCHIA: Distingui tra Fasi (grassetto/maiuscolo) e Attività (livello indentato).
      
      Restituisci un JSON con:
      {
        "attivita": [
          {
            "descrizione": "string",
            "data_inizio": "YYYY-MM-DD" (null se illegibile),
            "data_fine": "YYYY-MM-DD" (null se illegibile),
            "durata_giorni": number (calcola da date o leggi colonna durata),
            "importo_previsto": number,
            "livello": number (0=Fase, 1=Attività)
          }
        ],
        "note_ai": "string"
      }
    `;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      file_urls: [fileUrl], // Passiamo direttamente l'URL dell'immagine per Vision
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
    
    // Validazione base
    const attivitaProcessed = response.attivita.map(att => ({
        ...att,
        descrizione: formatTextoProfessionale(att.descrizione),
        durata_giorni: att.durata_giorni || 1
    })).filter(a => a.descrizione);

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
    console.log("\n📄 TESTO COMPLETO DEL PDF:");
    console.log("=".repeat(80));
    console.log(text);
    console.log("=".repeat(80));

    console.log("\n🧠 Chiamata a InvokeLLM per interpretare il PDF (estrazione attività, durate e date se presenti)...");

    const llmPrompt = `
Analizza il testo estratto da un cronoprogramma (PDF/OCR).
OBIETTIVO: Estrarre attività e DATE REALI.

REGOLE TASSATIVE (pena fallimento):
1. SE NON VEDI UNA DATA ESPLICITA (es. 12/05/2024, Gennaio 2025) ACCANTO ALL'ATTIVITÀ, RESTITUISCI NULL nei campi data. 
   - È VIETATO inventare date sequenziali.
   - È VIETATO assumere che l'attività N inizi quando finisce la N-1.
2. Se un gruppo di attività è sotto un'intestazione temporale (es. "Fase 1 - Marzo 2024"), usa quella data per tutte (PARALLELISMO).
3. Riporta SOLO ciò che leggi. Se leggi solo "Scavi" e "5 giorni", restituisci date=null. Ci penserà il sistema a posizionarla.

Output JSON:
{
  "attivita": [
    {
      "descrizione": "string",
      "durata_giorni": number (default 1 se non trovato),
      "gruppo_fase": "string",
      "data_inizio": "YYYY-MM-DD" (o null),
      "data_fine": "YYYY-MM-DD" (o null),
      "livello": number (0=Fase, 1=Attività)
    }
  ],
  "note_ai": "Dichiara esplicitamente se hai trovato date nel testo o no."
}

Testo PDF:
"""
${text}
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

    // STAIRCASE DETECTION (Rilevamento Sequenze Inventate)
    // Se l'AI restituisce una sequenza perfetta (Fine A = Inizio B) per troppe attività consecutive,
    // è probabile che stia inventando le date.
    let sequentialCount = 0;
    const SUSPICIOUS_SEQUENCE_THRESHOLD = 3; // Se 3 attività sono perfettamente sequenziali, sospettiamo

    const attivitaProcessed = llmResult.attivita.map((att, idx, arr) => {
        // Usa la durata fornita dall'AI, altrimenti cerca nel testo o default a 1
        const durata = att.durata_giorni && att.durata_giorni > 0 ? att.durata_giorni : estraiDurataGiorni(att.descrizione) || 1;

        let dataInizio = parseDate(att.data_inizio);
        let dataFine = parseDate(att.data_fine);

        // CONTROLLO SEQUENZIALITÀ SOSPITTA
        if (idx > 0 && dataInizio && arr[idx-1].data_fine) {
            const prevEnd = parseDate(arr[idx-1].data_fine);
            if (prevEnd) {
                const d1 = new Date(dataInizio);
                const dPrev = new Date(prevEnd);
                const diff = (d1 - dPrev) / (1000 * 60 * 60 * 24);
                
                // Se inizia esattamente il giorno dopo o lo stesso giorno della fine precedente
                if (diff >= 0 && diff <= 1) {
                    sequentialCount++;
                } else {
                    sequentialCount = 0;
                }
            }
        }

        // Se abbiamo rilevato una sequenza sospetta lunga, invalidiamo le date per costringere il ricalcolo parallelo
        // Ma solo se non ci sono "prove" nel testo (difficile da dire qui, ma assumiamo l'inventiva dell'AI)
        // Per ora siamo conservativi: se l'AI è troppo "pulita", probabilmente mente.
        if (sequentialCount >= SUSPICIOUS_SEQUENCE_THRESHOLD) {
             console.log(`⚠️ Rilevata sequenza artificiale all'indice ${idx}. Invalidazione date per "${att.descrizione}"`);
             dataInizio = null;
             dataFine = null;
        }

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
  console.log("📊 Inizio parsing file XLSX con AI...");

  try {
    console.log("📖 Lettura file Excel...");

    // IMPORTANTE: Convertiamo ArrayBuffer in Uint8Array per XLSX
    const uint8Array = new Uint8Array(fileBuffer);
    const workbook = XLSX.read(uint8Array, { type: 'array', cellDates: true, dateNF: 'yyyy-mm-dd' });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error("Il file Excel non contiene fogli di lavoro.");
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    console.log(`✓ Foglio "${firstSheetName}" caricato`);

    console.log("🔄 Conversione foglio in CSV...");
    const csvText = XLSX.utils.sheet_to_csv(worksheet);

    console.log(`✓ CSV generato (${csvText.length} caratteri)`);
    console.log("📝 Prime 1000 caratteri:");
    console.log(csvText.substring(0, 1000));

    console.log("\n🧠 Chiamata a InvokeLLM per interpretare il CSV...");

    const llmPrompt = `
Analizza il seguente CSV da Excel.
OBIETTIVO: Estrarre attività e DATE REALI.

ISTRUZIONI CRITICHE:
1. CERCA COLONNE DATE: Identifica le colonne che contengono date (es. Inizio, Fine, Start, End, o valori tipo 2024-01-01).
2. PARALLELISMO REALE: Riporta le date ESATTE che trovi. NON creare sequenze a cascata se le date nel file sono uguali (parallele).
3. Se molte attività hanno la stessa data di inizio, è corretto.
4. Se trovi colonne "Durata" usa quelle.

Output JSON:
{
  "attivita": [
    {
      "descrizione": "string",
      "durata_giorni": number,
      "gruppo_fase": "string",
      "data_inizio": "YYYY-MM-DD",
      "data_fine": "YYYY-MM-DD",
      "livello": number (0=Fase, 1=Attività)
    }
  ],
  "note_ai": "Indica quali colonne hai identificato come date."
}

CSV:
"""
${csvText}
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
                            data_inizio: { type: "string" },
                            data_fine: { type: "string" }
                        },
                        required: ["descrizione"]
                    }
                },
                note_ai: { type: "string" }
            },
            required: ["attivita"]
        }
    });

    console.log(`✓ InvokeLLM ha risposto!`);
    console.log(`  - Attività suggerite dall'AI: ${llmResult.attivita.length}`);
    console.log(`  - Note AI: ${llmResult.note_ai || 'Nessuna'}`);

    // Log delle prime 5 attività raw dall'AI
    console.log("\n📋 Prime 5 attività dall'AI (raw):");
    llmResult.attivita.slice(0, 5).forEach((att, idx) => {
      console.log(`  ${idx + 1}. "${att.descrizione}"`);
      console.log(`     - Gruppo: ${att.gruppo_fase || 'N/A'}`);
      console.log(`     - Durata: ${att.durata_giorni || 'N/A'} giorni`);
      console.log(`     - Inizio: ${att.data_inizio || 'N/A'}`);
      console.log(`     - Fine: ${att.data_fine || 'N/A'}`);
    });

    console.log("\n🔄 Validazione e parsing date/durate...");
    const attivitaProcessed = llmResult.attivita.map((att, idx) => {
        const dataInizio = parseDate(att.data_inizio);
        const dataFine = parseDate(att.data_fine);

        let durataGiorniCalculated = att.durata_giorni;
        if (!durataGiorniCalculated && dataInizio && dataFine) {
          durataGiorniCalculated = calcolaDurataGiorni(dataInizio, dataFine);
        } else if (!durataGiorniCalculated) {
          durataGiorniCalculated = 1; // Default duration
        }
        // Ensure duration is at least 1
        durataGiorniCalculated = Math.max(1, durataGiorniCalculated);


        if (!dataInizio || !dataFine) {
          console.log(`  ⚠️ Attenzione: Date mancanti per attività "${att.descrizione}"`);
          console.log(`     - data_inizio raw: "${att.data_inizio}" → parsed: ${dataInizio || 'FALLITO'}`);
          console.log(`     - data_fine raw: "${att.data_fine}" → parsed: ${dataFine || 'FALLITO'}`);
        }

        // FORMATTAZIONE PROFESSIONALE
        const descrizioneFormattata = formatTextoProfessionale(att.descrizione);
        const gruppoFaseFormattato = att.gruppo_fase ? formatTextoProfessionale(att.gruppo_fase) : null;

        return {
            descrizione: descrizioneFormattata,
            gruppo_fase: gruppoFaseFormattato,
            data_inizio: dataInizio,
            data_fine: dataFine,
            durata_giorni: durataGiorniCalculated
        };
    }).filter((att) => att.descrizione && att.durata_giorni > 0); // Filter for description and valid duration

    console.log(`✓ ${attivitaProcessed.length} attività valide dopo validazione`);

    if (attivitaProcessed.length === 0) {
      console.error("❌ Nessuna attività valida trovata!");
      console.error("   Possibili cause:");
      console.error("   - L'AI non ha trovato attività, date o durate nel file");
      console.error("   - Le date sono in un formato non riconosciuto da parseDate()");
      console.error("   - Il file non contiene un cronoprogramma valido");
      throw new Error("L'AI non è riuscita a estrarre attività valide. Verifica il file.");
    }

    // Log delle prime 3 attività valide
    console.log("\n✅ Prime 3 attività valide:");
    attivitaProcessed.slice(0, 3).forEach((att, idx) => {
      console.log(`  ${idx + 1}. "${att.descrizione}"`);
      console.log(`     - Inizio: ${att.data_inizio}, Fine: ${att.data_fine}, Durata: ${att.durata_giorni} giorni`);
    });

    return {
        attivita: attivitaProcessed,
        note: llmResult.note_ai || "Parsing completato con AI."
    };

  } catch (error) {
    console.error("❌ Errore parsing XLSX:", error);
    throw new Error(`Errore parsing XLSX con AI: ${error.message}`);
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

      // CALCOLO DATE ASSISTITO (CON LOGICA DI PARALLELISMO AGGRESSIVO)
      // Se l'AI non ha trovato date (o le abbiamo invalidate perché sospette),
      // raggruppiamo le attività in "blocchi" paralleli.
      
      let ultimaDataInizio = new Date(dataInizioBase);
      
      attivita = attivita.map((att, idx) => {
        // Se l'attività ha date valide, usale e aggiorna il cursore temporale
        if (att.data_inizio) {
           try { 
               ultimaDataInizio = new Date(att.data_inizio); 
           } catch(e){}
           return att;
        }

        // SE NON HA DATE:
        // Usa l'ultima data di inizio conosciuta (quindi inizia INSIEME all'attività precedente che aveva una data, o all'inizio del progetto)
        // Questo crea un effetto "a grappolo": tutte le attività senza data iniziano allo stesso punto dell'ultima data nota.
        
        const dataInizio = new Date(ultimaDataInizio);
        const durata = att.durata_giorni || 1;
        const dataFine = new Date(dataInizio);
        dataFine.setDate(dataFine.getDate() + durata);

        const formatData = (d) => d.toISOString().split('T')[0];
        
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

    const rangeTemporale = {
      data_inizio: dateInizio[0],
      data_fine: dateFine[dateFine.length - 1]
    };

    console.log(`✓ Range: ${rangeTemporale.data_inizio} → ${rangeTemporale.data_fine}`);

    console.log("\n💾 Step 8: Preparazione dati per il database...");
    const attivitaDaInserire = attivita.map((att) => ({
      cantiere_id: cantiere_id,
      gruppo_fase: att.gruppo_fase || '',
      descrizione: att.descrizione,
      data_inizio: att.data_inizio,
      data_fine: att.data_fine,
      durata_giorni: att.durata_giorni,
      percentuale_completamento: 0,
      colore: '#3b82f6',
      categoria: 'altro',
      predecessori: [],
      responsabile: '',
      note: '',
      stato: 'pianificata'
    }));

    console.log(`✓ ${attivitaDaInserire.length} attività pronte`);

    console.log("\n💾 Step 9: Salvataggio database...");
    const attivitaInserite = await base44.asServiceRole.entities.Attivita.bulkCreate(attivitaDaInserire);

    console.log(`✓ ${attivitaInserite.length} attività salvate`);

    console.log("\n✅ =================================================");
    console.log("✅ IMPORTAZIONE COMPLETATA CON SUCCESSO");
    console.log("✅ =================================================\n");

    return Response.json({
      success: true,
      message: `Importazione completata! ${attivitaInserite.length} attività importate.`,
      attivita_importate: attivitaInserite.length,
      range_temporale: rangeTemporale,
      note_importazione: modalita === 'assistita'
        ? `${note}\n\n⚠️ NOTA: Le date sono state calcolate automaticamente assumendo attività sequenziali. Puoi modificarle nel Gantt.`
        : note,
      dettagli: {
        cantiere: cantiere.denominazione || cantiere.oggetto_lavori,
        file_tipo: fileExtension,
        metodo_parsing: modalita === 'assistita' ? 'AI Assistita (calcolo date automatico)' : 'AI Standard',
        modalita: modalita
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