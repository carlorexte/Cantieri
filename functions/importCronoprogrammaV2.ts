/**
 * Funzione Deno per importazione cronoprogrammi v2.0
 * 
 * NOVITÀ rispetto a importCronoprogrammaIntelligente:
 * - Parsing XLSX deterministico (non AI per le date)
 * - Supporto predecessori esplicito
 * - Mantiene date ESATTE dal file originale
 * - Preserva parallelismo reale tra attività
 * - Validazione e report dettagliato prima dell'import
 * 
 * @platform Base44 + Deno
 * @version 2.0.0
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import * as XLSX from "npm:xlsx@0.18.5";
import { assertSafeSpreadsheetBytes } from "./spreadsheetSafety.ts";

// ============================================================================
// PARSER XLSX (inline per Deno)
// ============================================================================

const COLUMN_MAPPINGS = {
  descrizione: ['descrizione', 'attività', 'lavorazione', 'task', 'description', 'nome', 'voce', 'fase'],
  data_inizio: ['data inizio', 'inizio', 'start', 'dal', 'from', 'start date'],
  data_fine: ['data fine', 'fine', 'end', 'al', 'to', 'finish', 'end date'],
  durata: ['durata', 'giorni', 'days', 'durata gg', 'duration'],
  predecessori: ['predecessori', 'prec', 'preceding', 'depends on', 'predecessors'],
  wbs: ['wbs', 'codice', 'code', 'n.', 'id', 'identificativo'],
  livello: ['livello', 'level', 'indent', 'rientro'],
  tipo: ['tipo', 'type', 'milestone', 'raggruppamento', 'summary'],
  completamento: ['completamento', '% completamento', 'percent complete', 'avanzamento'],
  importo: ['importo', 'costo', 'cost', 'budget', 'importo previsto']
};

function findColumnIndex(headers, possibleNames) {
  if (!headers) return -1;
  const headersLower = headers.map(h => String(h).toLowerCase().trim());
  for (const name of possibleNames) {
    const index = headersLower.findIndex(h => h === name || h.includes(name));
    if (index !== -1) return index;
  }
  return -1;
}

function parseExcelDate(value) {
  if (!value && value !== 0) return null;
  
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return formatToISO(value);
  }
  
  if (typeof value === 'number' && value > 1000 && value < 100000) {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    if (!isNaN(date.getTime())) return formatToISO(date);
  }
  
  if (typeof value === 'string') {
    const trimmed = value.trim();
    
    // DD/MM/YYYY
    const ddmmyyyy = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
    if (ddmmyyyy) {
      let [, d, m, y] = ddmmyyyy;
      let year = parseInt(y);
      if (year < 100) year += 2000;
      
      let day = parseInt(d);
      let month = parseInt(m);
      
      if (month > 12) [day, month] = [month, day];
      
      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime())) return formatToISO(date);
    }
    
    // ISO YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
  }
  
  return null;
}

function formatToISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parsePredecessors(value) {
  if (!value) return [];
  const str = String(value).trim();
  if (!str) return [];
  
  const predecessors = [];
  const parts = str.split(/[;,]/).filter(p => p.trim());
  
  for (const part of parts) {
    const trimmed = part.trim();
    const match = trimmed.match(/^([a-zA-Z0-9_-]+)(?:([aA-zZ]{2}))?(?:([+-]?\d+))?$/);
    
    if (match) {
      const [, id, tipo = 'FS', lagStr = '0'] = match;
      predecessors.push({
        attivita_id: id,
        tipo_dipendenza: tipo.toUpperCase(),
        lag_giorni: parseInt(lagStr, 10) || 0
      });
    } else {
      predecessors.push({
        attivita_id: trimmed,
        tipo_dipendenza: 'FS',
        lag_giorni: 0
      });
    }
  }
  
  return predecessors;
}

// ============================================================================
// FUNZIONE PRINCIPALE
// ============================================================================

Deno.serve(async (req) => {
  console.log("\n🚀 =================================================");
  console.log("🚀 IMPORT CRONOPROGRAMMA v2.0 - DETERMINISTICO");
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
    const { file_url, cantiere_id, opzioni = {} } = body;

    console.log(`  - file_url: ${file_url}`);
    console.log(`  - cantiere_id: ${cantiere_id}`);
    console.log(`  - opzioni: ${JSON.stringify(opzioni)}`);

    if (!file_url || !cantiere_id) {
      return Response.json({ success: false, error: 'Parametri mancanti' }, { status: 400 });
    }

    console.log("\n🏗️ Step 3: Verifica cantiere...");
    const cantiere = await base44.asServiceRole.entities.Cantiere.get(cantiere_id);

    if (!cantiere) {
      return Response.json({ success: false, error: 'Cantiere non trovato' }, { status: 404 });
    }

    console.log(`✓ Cantiere: ${cantiere.denominazione || cantiere.oggetto_lavori}`);

    console.log("\n📥 Step 4: Download file...");
    const fileResponse = await fetch(file_url);

    if (!fileResponse.ok) {
      throw new Error(`Download fallito: ${fileResponse.statusText}`);
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const fileExtension = file_url.split('.').pop().toLowerCase();

    console.log(`✓ File: ${fileBuffer.byteLength} bytes, .${fileExtension}`);

    if (!['xlsx', 'xls'].includes(fileExtension)) {
      return Response.json({ 
        success: false, 
        error: 'Tipo file non supportato. Usa XLSX o XLS.' 
      }, { status: 400 });
    }

    console.log("\n📊 Step 5: Parsing XLSX...");
    
    // Leggi workbook
    const spreadsheetBytes = new Uint8Array(fileBuffer);
    assertSafeSpreadsheetBytes(spreadsheetBytes);
    const workbook = XLSX.read(spreadsheetBytes, { 
      type: 'array', 
      cellDates: true,
      dateNF: 'yyyy-mm-dd'
    });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error("Il file Excel non contiene fogli di lavoro.");
    }

    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });

    if (rawData.length === 0) {
      throw new Error('Foglio vuoto');
    }

    console.log(`✓ Righe totali: ${rawData.length}`);

    // Trova intestazioni
    let headerRowIndex = 0;
    let headers = rawData[headerRowIndex];

    for (let i = 0; i < Math.min(5, rawData.length); i++) {
      const nonEmpty = rawData[i].filter(c => c && String(c).trim()).length;
      if (nonEmpty > (headers?.filter(c => c && String(c).trim()).length || 0)) {
        headers = rawData[i];
        headerRowIndex = i;
      }
    }

    console.log(`✓ Intestazioni a riga ${headerRowIndex + 1}`);

    // Mappa colonne
    const columnMap = {};
    const logs = [];
    
    for (const [key, possibleNames] of Object.entries(COLUMN_MAPPINGS)) {
      const index = findColumnIndex(headers, possibleNames);
      if (index !== -1) {
        columnMap[key] = index;
        logs.push(`  - ${key}: "${headers[index]}"`);
      }
    }

    console.log("Colonne trovate:");
    logs.forEach(log => console.log(log));

    if (!columnMap.descrizione) {
      return Response.json({
        success: false,
        error: 'Colonna "Descrizione" non trovata. Verifica che il file abbia intestazioni chiare.',
        logs
      }, { status: 400 });
    }

    // Parse attività
    console.log("\n📋 Step 6: Estrazione attività...");
    
    const attivita = [];
    const dataRows = rawData.slice(headerRowIndex + 1);

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];

      if (!row || row.every(c => !c || !String(c).trim())) continue;

      const descrizione = row[columnMap.descrizione];
      if (!descrizione || !String(descrizione).trim()) continue;

      const descrizioneTrimmed = String(descrizione).trim();

      // Salta totali
      if (descrizioneTrimmed.toLowerCase().startsWith('totale') ||
          descrizioneTrimmed.toLowerCase().startsWith('summary')) {
        continue;
      }

      const dataInizio = parseExcelDate(row[columnMap.data_inizio]);
      const dataFine = parseExcelDate(row[columnMap.data_fine]);

      let durata = parseInt(row[columnMap.durata], 10);
      if (isNaN(durata) && dataInizio && dataFine) {
        const start = new Date(dataInizio + 'T12:00:00');
        const end = new Date(dataFine + 'T12:00:00');
        durata = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      }
      if (isNaN(durata) || durata <= 0) durata = 1;

      const predecessori = parsePredecessors(row[columnMap.predecessori]);
      const wbs = row[columnMap.wbs] ? String(row[columnMap.wbs]).trim() : '';
      const livello = parseInt(row[columnMap.livello], 10) || 0;

      const id = wbs || `ACT_${attivita.length + 1}`;

      attivita.push({
        id,
        wbs,
        wbs_code: wbs,
        livello,
        descrizione: descrizioneTrimmed,
        tipo_attivita: livello === 0 ? 'raggruppamento' : 'task',
        data_inizio: dataInizio,
        data_fine: dataFine,
        durata_giorni: durata,
        predecessori,
        percentuale_completamento: parseFloat(row[columnMap.completamento]) || 0,
        importo_previsto: parseFloat(row[columnMap.importo]) || 0,
        colore: '#3b82f6',
        stato: 'pianificata',
        categoria: 'altro'
      });
    }

    console.log(`✓ Attività estratte: ${attivita.length}`);

    // Risolvi predecessori
    const idSet = new Set(attivita.map(a => a.id));
    let predecessoriRisolti = 0;

    for (const att of attivita) {
      for (const pred of att.predecessori) {
        if (!idSet.has(pred.attivita_id)) {
          const found = attivita.find(a => a.wbs === pred.attivita_id);
          if (found) {
            pred.attivita_id = found.id;
            predecessoriRisolti++;
          }
        } else {
          predecessoriRisolti++;
        }
      }
    }

    console.log(`✓ Predecessori risolti: ${predecessoriRisolti}`);

    // Se modalità "anteprima", ritorna ora
    if (opzioni.anteprima) {
      return Response.json({
        success: true,
        anteprima: true,
        attivita: attivita.slice(0, 20),
        totale: attivita.length,
        logs,
        metadata: {
          haPredecessori: attivita.some(a => a.predecessori.length > 0),
          haDate: attivita.some(a => a.data_inizio && a.data_fine)
        }
      });
    }

    console.log("\n💾 Step 7: Salvataggio database...");
    
    const attivitaDaInserire = attivita.map((att) => ({
      cantiere_id: cantiere_id,
      wbs_code: att.wbs,
      livello: att.livello,
      gruppo_fase: '',
      descrizione: att.descrizione,
      data_inizio: att.data_inizio,
      data_fine: att.data_fine,
      durata_giorni: att.durata_giorni,
      predecessori: att.predecessori,
      percentuale_completamento: att.percentuale_completamento,
      importo_previsto: att.importo_previsto,
      colore: att.colore,
      categoria: att.categoria,
      responsabile: '',
      note: '',
      stato: 'pianificata',
      tipo_attivita: att.tipo_attivita
    }));

    const attivitaInserite = await base44.asServiceRole.entities.Attivita.bulkCreate(attivitaDaInserire);

    console.log(`✓ ${attivitaInserite.length} attività salvate`);

    // Calcola range temporale
    const dateInizio = attivita.map(a => a.data_inizio).filter(Boolean).sort();
    const dateFine = attivita.map(a => a.data_fine).filter(Boolean).sort();

    const rangeTemporale = {
      data_inizio: dateInizio[0],
      data_fine: dateFine[dateFine.length - 1]
    };

    console.log("\n✅ =================================================");
    console.log("✅ IMPORT COMPLETATO CON SUCCESSO");
    console.log("✅ =================================================\n");

    return Response.json({
      success: true,
      message: `Importazione completata! ${attivitaInserite.length} attività importate.`,
      attivita_importate: attivitaInserite.length,
      range_temporale: rangeTemporale,
      dettagli: {
        cantiere: cantiere.denominazione || cantiere.oggetto_lavori,
        file_tipo: fileExtension,
        ha_predecessori: attivita.some(a => a.predecessori.length > 0),
        ha_date: attivita.some(a => a.data_inizio && a.data_fine),
        metodo: 'Parsing deterministico v2.0'
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
