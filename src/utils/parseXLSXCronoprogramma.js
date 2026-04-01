/**
 * Parser XLSX Deterministico per Cronoprogrammi
 * 
 * A differenza dell'approccio AI-based, questo parser:
 * - Estrae dati in modo deterministico (senza interpretazione)
 * - Mantiene le date ESATTE dal file originale
 * - Preserva i predecessori se presenti
 * - Supporta formati Excel standard e MS Project
 * 
 * @version 1.0.0
 */

import * as XLSX from 'xlsx';
import { assertSafeSpreadsheetBuffer } from './safeSpreadsheet';

// ============================================================================
// COSTANTI E CONFIGURAZIONE
// ============================================================================

const COLUMN_MAPPINGS = {
  descrizione: [
    'descrizione', 'descrizione attività', 'descrizione lavori', 'attività', 'lavorazione', 'task',
    'description', 'name', 'nome', 'voce', 'fase', 'item', 'oggetto',
    'dettaglio', 'intervento', 'capitolo', 'voce di spesa', 'lavori', 'opera',
    'lavori', 'descrizione'
  ],
  id: [
    'id', 'codice', 'n.', 'numero', 'n', 'nr', 'num', 'rif', 'progressivo', '#', 'wbs'
  ],
  durata: [
    'durata', 'giorni', 'days', 'durata gg', 'durata giorni', 'duration',
    'durata prevista', 'planned duration', 'work days', 'gg', 'durate', 'dur', 'g'
  ],
  importo: [
    'importo', 'costo', 'cost', 'budget', 'importo previsto', 'planned cost',
    'budgeted cost', 'valore', 'prezzo', 'ricavo', 'spesa', 'euro', '€', '€uro', 'imp'
  ],
  data_inizio: [
    'data inizio', 'inizio', 'start', 'dal', 'from', 'data inizio prevista',
    'start date', 'planned start', 'early start', 'data inizio early',
    'data inzio', 'data i', 'inizio lavori', 'cominciato', 'al'
  ],
  data_fine: [
    'data fine', 'fine', 'end', 'al', 'to', 'data fine prevista',
    'finish', 'end date', 'planned finish', 'early finish', 'data fine early',
    'completato', 'termine', 'scadenza', 'entro'
  ],
  predecessori: [
    'predecessori', 'prec', 'preceding', 'depends on', 'dependencies',
    'predecessors', 'attività precedenti', 'propedeuticità', 'legami',
    'dipendenze', 'precedenza', 'codependenze', 'prop'
  ],
  wbs: [
    'wbs', 'codice', 'code', 'n.', 'numero', 'id', 'identificativo',
    'wbs code', 'activity id', 'codice wbs', 'n', 'nr', 'num', 'rif'
  ],
  livello: [
    'livello', 'level', 'indent', 'rientro', 'outline level', 'hierarchy',
    'grado', 'liv', 'indentazione'
  ],
  tipo: [
    'tipo', 'type', 'tipo attività', 'activity type', 'milestone',
    'raggruppamento', 'summary', 'task type', 'categoria', 'fase', 'macro'
  ],
  completamento: [
    'completamento', '% completamento', 'percent complete', 'avanzamento',
    'progress', '% complete', 'percentuale', 'completion', 'stato avanzamento',
    'sal', '%', 'avanz', 'prog'
  ],
  risorse: [
    'risorse', 'resources', 'assegnatario', 'assigned to', 'responsabile',
    'resource names', 'team', 'addetto', 'incaricato', 'impresa', 'ditta', 'chi'
  ]
};

const TIPO_DIPENDENZA_MAP = {
  'fs': 'FS', 'finish-to-start': 'FS', 'fine-inizio': 'FS',
  'ss': 'SS', 'start-to-start': 'SS', 'inizio-inizio': 'SS',
  'ff': 'FF', 'finish-to-finish': 'FF', 'fine-fine': 'FF',
  'sf': 'SF', 'start-to-finish': 'SF', 'inizio-fine': 'SF'
};

// ============================================================================
// FUNZIONI UTILITY
// ============================================================================

/**
 * Trova la colonna corrispondente in una riga di intestazioni
 */
function findColumnIndex(headers, possibleNames) {
  if (!headers || !Array.isArray(headers)) return -1;

  const headersLower = headers.map(h => {
    if (h === null || h === undefined) return '';
    return String(h).toLowerCase().trim();
  });

  for (const name of possibleNames) {
    const index = headersLower.findIndex(h => {
      if (!h) return false;
      return h === name || h.includes(name) || name.includes(h);
    });
    if (index !== -1) return index;
  }

  return -1;
}

/**
 * Parse di una data da vari formati Excel
 */
function parseExcelDate(value) {
  if (!value && value !== 0) return null;
  
  // Se è già un oggetto Date
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return formatToISO(value);
  }
  
  // Se è un numero seriale Excel
  if (typeof value === 'number') {
    if (value > 1000 && value < 100000) {
      // Serial date Excel
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + value * 86400000);
      if (!isNaN(date.getTime())) {
        return formatToISO(date);
      }
    }
    return null;
  }
  
  // Se è una stringa
  if (typeof value === 'string') {
    const trimmed = value.trim();
    
    // Prova a parsare come numero (potrebbe essere seriale)
    const numValue = parseFloat(trimmed);
    if (!isNaN(numValue) && numValue > 1000 && numValue < 100000) {
      return parseExcelDate(numValue);
    }
    
    // Formati comuni italiani
    const patterns = [
      // DD/MM/YYYY
      /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/,
      // DD-MM-YYYY
      /^(\d{1,2})-(\d{1,2})-(\d{2,4})$/,
      // DD.MM.YY
      /^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/,
      // YYYY-MM-DD (ISO)
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
      // DD MMM YYYY (es. "12 Gen 2024")
      /^(\d{1,2})\s+([a-zA-Zà-ù]+)\s+(\d{4})$/
    ];
    
    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match) {
        const date = parseDateFromMatch(match, pattern);
        if (date) return formatToISO(date);
      }
    }
    
    // Fallback solo per formati non ambigui, per evitare inversioni giorno/mese.
    if (/^\d{4}-\d{1,2}-\d{1,2}(?:[ T].*)?$/.test(trimmed)) {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        return formatToISO(date);
      }
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

function parseDateFromMatch(match, pattern) {
  const [, part1, part2, part3] = match;
  
  // YYYY-MM-DD
  if (pattern.source.includes('^\\d{4}')) {
    return new Date(parseInt(part1), parseInt(part2) - 1, parseInt(part3));
  }
  
  // DD/MM/YYYY o simili
  let day = parseInt(part1);
  let month = parseInt(part2);
  let year = parseInt(part3);
  
  // Anno a 2 cifre
  if (year < 100) {
    year += year < 50 ? 2000 : 1900;
  }
  
  // Controlla se è formato MM/DD/YYYY (americano)
  // Mese testuale
  if (isNaN(month)) {
    const monthNames = {
      'gen': 0, 'gennaio': 0, 'jan': 0, 'january': 0,
      'feb': 1, 'febbraio': 1, 'february': 1,
      'mar': 2, 'marzo': 2, 'march': 2,
      'apr': 3, 'aprile': 3, 'april': 3,
      'mag': 4, 'maggio': 4, 'may': 4,
      'giu': 5, 'giugno': 5, 'jun': 5, 'june': 5,
      'lug': 6, 'luglio': 6, 'jul': 6, 'july': 6,
      'ago': 7, 'agosto': 7, 'aug': 7, 'august': 7,
      'set': 8, 'settembre': 8, 'sep': 8, 'september': 8,
      'ott': 9, 'ottobre': 9, 'oct': 9, 'october': 9,
      'nov': 10, 'novembre': 10, 'november': 10,
      'dic': 11, 'dicembre': 11, 'dec': 11, 'december': 11
    };
    month = monthNames[part2.toLowerCase()] || 0;
  }
  
  const date = new Date(year, month, day);
  if (isNaN(date.getTime())) return null;
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }
  return date;
}

/**
 * Parse predecessori da stringa Excel
 * Supporta formati: "1,2,3" o "1FS,2SS+2" o "A1,A2,A3"
 */
function parsePredecessors(value) {
  if (!value) return [];
  
  const str = String(value).trim();
  if (!str) return [];
  
  const predecessors = [];
  
  // Dividi per virgola o punto e virgola
  const parts = str.split(/[;,]/).filter(p => p.trim());
  
  for (const part of parts) {
    const trimmed = part.trim();
    
    // Pattern: ID + Tipo + Lag
    // Es: "1FS+2", "A1SS-1", "5FF"
    const match = trimmed.match(/^([a-zA-Z0-9_-]+)(?:([aA-zZ]{2}))?(?:([+-]?\d+))?$/);
    
    if (match) {
      const [, id, tipo = 'FS', lagStr = '0'] = match;
      
      const tipoNorm = TIPO_DIPENDENZA_MAP[tipo.toLowerCase()] || 'FS';
      const lag = parseInt(lagStr, 10) || 0;
      
      predecessors.push({
        attivita_id: id,
        tipo_dipendenza: tipoNorm,
        lag_giorni: lag
      });
    } else {
      // Solo ID, assume FS con lag 0
      predecessors.push({
        attivita_id: trimmed,
        tipo_dipendenza: 'FS',
        lag_giorni: 0
      });
    }
  }
  
  return predecessors;
}

/**
 * Normalizza il tipo di attività
 */
function normalizeTipoAttivita(value, isSummary = false) {
  if (!value) {
    return isSummary ? 'raggruppamento' : 'task';
  }
  
  const str = String(value).toLowerCase().trim();
  
  if (str.includes('milestone') || str.includes('scadenza') || str.includes('evento')) {
    return 'milestone';
  }
  
  if (str.includes('raggruppamento') || str.includes('fase') || str.includes('summary') || str.includes('wbs')) {
    return 'raggruppamento';
  }
  
  return 'task';
}

/**
 * Controlla se una stringa sembra essere una data
 */
function isValidDateColumn(str) {
  // Pattern per date nel formato DD/M/YYYY o DD/MM/YYYY
  const datePattern = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/;
  return datePattern.test(str.trim());
}

/**
 * Parse un Gantt orizzontale (date come colonne)
 */
function parseHorizontalGantt(rawData, headerRowIndex, dateColumns, dataInizioDefault) {
  const logs = [];
  const headers = rawData[headerRowIndex];
  const attivita = [];
  
  logs.push(`Parsing Gantt orizzontale con ${dateColumns.length} colonne data`);
  
  // Usa le mappature standard per trovare le colonne
  const columnMap = {};
  
  for (const [key, possibleNames] of Object.entries(COLUMN_MAPPINGS)) {
    for (let i = 0; i < headers.length; i++) {
      if (dateColumns.find(dc => dc.index === i)) continue; // Salta colonne data
      
      const h = String(headers[i] || '').toLowerCase().trim();
      if (!h) continue;
      
      // Controlla se l'intestazione corrisponde a uno dei nomi possibili
      for (const name of possibleNames) {
        if (h === name || h.includes(name) || name.includes(h)) {
          if (!columnMap[key]) {
            columnMap[key] = i;
            logs.push(`✓ ${key}: colonna ${i + 1} ("${headers[i]}")`);
          }
          break;
        }
      }
    }
  }
  
  // Trova la colonna descrizione (la prima non data se non trovata)
  if (!columnMap.descrizione) {
    for (let i = 0; i < headers.length; i++) {
      if (!dateColumns.find(dc => dc.index === i)) {
        columnMap.descrizione = i;
        logs.push(`⚠️ Descrizione non trovata, uso colonna ${i + 1} ("${headers[i]}")`);
        break;
      }
    }
  }
  
  logs.push(`Colonne mappate: ${Object.keys(columnMap).join(', ')}`);
  
  // Parse attività
  const dataRows = rawData.slice(headerRowIndex + 1);
  
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    
    // Salta righe vuote o intestazioni
    if (!row || row.every(c => !c || !String(c).trim())) continue;
    
    const descrizione = row[columnMap.descrizione];
    if (!descrizione || !String(descrizione).trim()) continue;
    
    const descrizioneTrimmed = String(descrizione).trim();
    
    // Salta righe di titolo/intestazione
    if (descrizioneTrimmed.toUpperCase().includes('COMUNE') || 
        descrizioneTrimmed.toUpperCase().includes('LOTTO') ||
        descrizioneTrimmed.toUpperCase().includes('LAVORI DI') ||
        descrizioneTrimmed === '-' ||
        descrizioneTrimmed.length > 150 ||
        descrizioneTrimmed.match(/^\d+$/)) { // Salta righe che sono solo numeri
      continue;
    }
    
    // Estrai durata
    let durata = 1;
    if (columnMap.durata >= 0 && row[columnMap.durata]) {
      const durataVal = parseInt(row[columnMap.durata], 10);
      if (!isNaN(durataVal) && durataVal > 0) {
        durata = durataVal;
      }
    }
    
    // Estrai ID
    const idRaw = columnMap.id >= 0 && row[columnMap.id] ? String(row[columnMap.id]) : null;
    const id = idRaw && !idRaw.match(/^\d+$/) ? idRaw : `ACT_${attivita.length + 1}`;
    
    // Estrai importo se presente
    let importo = 0;
    if (columnMap.importo >= 0 && row[columnMap.importo]) {
      const impStr = String(row[columnMap.importo]).replace(/[€,\s]/g, '');
      const impVal = parseFloat(impStr);
      if (!isNaN(impVal)) {
        importo = impVal;
      }
    }
    
    // Trova data inizio e fine dalle celle del Gantt
    let firstActiveCol = -1;
    let lastActiveCol = -1;
    
    for (const col of dateColumns) {
      const cellValue = row[col.index];
      if (cellValue !== null && cellValue !== undefined && String(cellValue).trim() !== '') {
        const strVal = String(cellValue).trim().toLowerCase();
        if (strVal !== '0' && strVal !== '' && strVal !== '-') {
          if (firstActiveCol === -1) {
            firstActiveCol = col.index;
          }
          lastActiveCol = col.index;
        }
      }
    }
    
    // Calcola date dalle colonne attive
    let dataInizio = null;
    let dataFine = null;
    
    if (firstActiveCol >= 0 && lastActiveCol >= 0) {
      const firstCol = dateColumns.find(c => c.index === firstActiveCol);
      const lastCol = dateColumns.find(c => c.index === lastActiveCol);
      
      if (firstCol && firstCol.date) dataInizio = firstCol.date;
      if (lastCol && lastCol.date) dataFine = lastCol.date;
    }
    
    // Se non ho trovato date dalle celle, calcolale dalla durata
    if (!dataInizio && dataInizioDefault) {
      dataInizio = dataInizioDefault;
      if (dataInizio && durata) {
        const startDate = new Date(dataInizio + 'T12:00:00');
        const endDate = new Date(startDate.getTime() + (durata - 1) * 86400000);
        dataFine = formatToISO(endDate);
      }
    }
    
    // Salta attività senza data e senza durata significativa
    if (!dataInizio && !dataFine && durata <= 1) {
      continue;
    }
    
    // Determina tipo di attività in base alla durata
    let tipoAttivita = 'task';
    if (durata >= 100) tipoAttivita = 'raggruppamento';
    if (durata === 1 || durata === 0) tipoAttivita = 'milestone';
    
    attivita.push({
      id: id || `ACT_${attivita.length + 1}`,
      wbs: idRaw || '',
      wbs_code: idRaw || '',
      livello: 0,
      parent_id: null,
      descrizione: descrizioneTrimmed,
      tipo_attivita: tipoAttivita,
      data_inizio: dataInizio,
      data_fine: dataFine,
      durata_giorni: durata,
      predecessori: [],
      percentuale_completamento: 0,
      importo_previsto: importo,
      colore: tipoAttivita === 'raggruppamento' ? '#64748b' : 
              tipoAttivita === 'milestone' ? '#f59e0b' : '#3b82f6',
      stato: 'pianificata',
      categoria: 'altro',
      note: ''
    });
  }
  
  logs.push(`✓ Attività estratte: ${attivita.length}`);
  
  return {
    success: true,
    attivita,
    logs,
    metadata: {
      sheetName: '',
      righeTotali: dataRows.length,
      attivitaEstratte: attivita.length,
      colonneTrovate: dateColumns.length,
      haPredecessori: false,
      formato: 'gantt_orizzontale'
    }
  };
}

// ============================================================================
// PARSER PRINCIPALE
// ============================================================================

/**
 * Parse un file XLSX e restituisce attività strutturate
 * 
 * @param {ArrayBuffer|Uint8Array} fileBuffer - Buffer del file XLSX
 * @param {Object} options - Opzioni di parsing
 * @returns {Object} Risultato del parsing
 */
export function parseXLSXCronoprogramma(fileBuffer, options = {}) {
  const {
    sheetIndex = 0,
    skipRows = 0,
    dataInizioDefault = null,
    logDetails = false
  } = options;
  
  const logs = [];
  
  try {
    assertSafeSpreadsheetBuffer(fileBuffer);

    // Leggi workbook
    const workbook = XLSX.read(fileBuffer, { 
      type: 'array', 
      cellDates: true,
      dateNF: 'yyyy-mm-dd'
    });
    
    logs.push(`✓ Workbook caricato: ${workbook.SheetNames.length} fogli`);
    
    // Seleziona foglio
    const sheetName = workbook.SheetNames[sheetIndex];
    if (!sheetName) {
      throw new Error(`Foglio ${sheetIndex} non trovato`);
    }
    
    logs.push(`✓ Foglio selezionato: "${sheetName}"`);
    
    const worksheet = workbook.Sheets[sheetName];
    
    // Converti in array di array per analisi intestazioni
    const rawData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      raw: false,
      dateNF: 'yyyy-mm-dd'
    });
    
    if (rawData.length === 0) {
      throw new Error('Foglio vuoto');
    }
    
    logs.push(`✓ Righe totali: ${rawData.length}`);
    
    // Trova riga di intestazione
    let headerRowIndex = skipRows;
    let headers = rawData[headerRowIndex];
    
    // Cerca la riga con più colonne non vuote
    for (let i = skipRows; i < Math.min(skipRows + 5, rawData.length); i++) {
      const nonEmpty = rawData[i].filter(c => c && String(c).trim()).length;
      if (nonEmpty > (headers?.filter(c => c && String(c).trim()).length || 0)) {
        headers = rawData[i];
        headerRowIndex = i;
      }
    }
    
    logs.push(`✓ Intestazioni trovate a riga ${headerRowIndex + 1}`);
    
    if (logDetails) {
      console.log('Intestazioni:', headers);
    }
    
    // Mappa colonne
    const columnMap = {};
    for (const [key, possibleNames] of Object.entries(COLUMN_MAPPINGS)) {
      const index = findColumnIndex(headers, possibleNames);
      if (index !== -1) {
        columnMap[key] = index;
        logs.push(`  - ${key}: colonna ${index + 1} ("${headers[index]}")`);
      }
    }

    // Rileva formato Gantt orizzontale (date come colonne)
    const dateColumns = [];
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i];
      if (h && isValidDateColumn(String(h))) {
        dateColumns.push({ index: i, date: parseExcelDate(h) });
      }
    }

    const isHorizontalGantt = dateColumns.length > 10;
    logs.push(`Formato rilevato: ${isHorizontalGantt ? 'Gantt orizzontale' : 'Tabella verticale'} (${dateColumns.length} colonne data)`);

    if (!columnMap.descrizione && !isHorizontalGantt) {
      // Mostra tutte le colonne trovate per aiutare il debug
      const foundColumns = headers
        .filter(h => h !== null && h !== undefined && String(h).trim() !== '')
        .map((h, i) => `  ${i + 1}. "${h}"`)
        .join('\n');

      const suggestedNames = COLUMN_MAPPINGS.descrizione.slice(0, 5).join(', ');

      throw new Error(
        `Colonna "Descrizione" non trovata. Impossibile continuare.\n\n` +
        `Colonne trovate nel file (${headers.length}):\n${foundColumns}\n\n` +
        `Nomi suggeriti per la colonna descrizione: ${suggestedNames}...\n\n` +
        `Suggerimento: Il file sembra essere un Gantt con date come colonne. ` +
        `Assicurati che la prima colonna contenga i nomi delle attività.`
      );
    }

    // Se è un Gantt orizzontale, usa un parser speciale
    if (isHorizontalGantt) {
      return parseHorizontalGantt(rawData, headerRowIndex, dateColumns, dataInizioDefault);
    }
    
    // Parse attività
    const attivita = [];
    const dataRows = rawData.slice(headerRowIndex + 1);
    
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      
      // Salta righe vuote
      if (!row || row.every(c => !c || !String(c).trim())) continue;
      
      const descrizione = row[columnMap.descrizione];
      if (!descrizione || !String(descrizione).trim()) continue;
      
      const descrizioneTrimmed = String(descrizione).trim();
      
      // Salta totali e righe speciali
      if (descrizioneTrimmed.toLowerCase().startsWith('totale') ||
          descrizioneTrimmed.toLowerCase().startsWith('summary') ||
          descrizioneTrimmed === '-') {
        continue;
      }
      
      // Estrai dati
      const dataInizio = parseExcelDate(row[columnMap.data_inizio]);
      const dataFine = parseExcelDate(row[columnMap.data_fine]);
      
      let durata = parseInt(row[columnMap.durata], 10);
      if (isNaN(durata) && dataInizio && dataFine) {
        // Calcola durata dalle date
        const start = new Date(dataInizio + 'T12:00:00');
        const end = new Date(dataFine + 'T12:00:00');
        durata = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      }
      if (isNaN(durata) || durata <= 0) durata = 1;
      
      const predecessori = parsePredecessors(row[columnMap.predecessori]);
      const wbs = row[columnMap.wbs] ? String(row[columnMap.wbs]).trim() : '';
      const livello = parseInt(row[columnMap.livello], 10) || 0;
      const tipoAttivita = normalizeTipoAttivita(row[columnMap.tipo], livello === 0);
      const completamento = parseFloat(row[columnMap.completamento]) || 0;
      const importo = parseFloat(row[columnMap.importo]) || 0;
      
      // Determina parent dalla WBS
      let parentId = null;
      if (wbs) {
        const wbsParts = wbs.split(/[.-]/);
        if (wbsParts.length > 1) {
          const parentWBS = wbsParts.slice(0, -1).join('.');
          // Cerca attività con questa WBS
          const parent = attivita.find(a => a.wbs === parentWBS);
          if (parent) {
            parentId = parent.id;
          }
        }
      }
      
      // Genera ID univoco
      const id = wbs || `ACT_${attivita.length + 1}`;
      
      attivita.push({
        id,
        wbs,
        wbs_code: wbs,
        livello,
        parent_id: parentId,
        descrizione: descrizioneTrimmed,
        tipo_attivita: tipoAttivita,
        data_inizio: dataInizio,
        data_fine: dataFine,
        durata_giorni: durata,
        predecessori,
        percentuale_completamento: completamento,
        importo_previsto: importo,
        colore: tipoAttivita === 'milestone' ? '#f59e0b' : 
                tipoAttivita === 'raggruppamento' ? '#64748b' : '#3b82f6',
        stato: 'pianificata',
        categoria: 'altro',
        note: ''
      });
    }
    
    logs.push(`✓ Attività estratte: ${attivita.length}`);
    
    // Risolvi riferimenti predecessori
    const idSet = new Set(attivita.map(a => a.id));
    let predecessoriRisolti = 0;
    
    for (const att of attivita) {
      if (att.predecessori.length > 0) {
        for (const pred of att.predecessori) {
          // Se l'ID non esiste, prova a trovare per WBS o descrizione
          if (!idSet.has(pred.attivita_id)) {
            // Cerca per WBS
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
    }
    
    logs.push(`✓ Predecessori risolti: ${predecessoriRisolti}`);
    
    // Calcola date mancanti se specificato
    if (dataInizioDefault) {
      let cursor = new Date(dataInizioDefault + 'T12:00:00');
      let dateCalcolate = 0;
      
      for (const att of attivita) {
        if (!att.data_inizio) {
          att.data_inizio = formatToISO(cursor);
          att.data_fine = formatToISO(new Date(cursor.getTime() + (att.durata_giorni - 1) * 86400000));
          cursor = new Date(cursor.getTime() + att.durata_giorni * 86400000);
          dateCalcolate++;
        }
      }
      
      logs.push(`✓ Date calcolate: ${dateCalcolate}`);
    }
    
    return {
      success: true,
      attivita,
      logs,
      metadata: {
        sheetName,
        righeTotali: rawData.length,
        attivitaEstratte: attivita.length,
        colonneTrovate: Object.keys(columnMap).length,
        haPredecessori: attivita.some(a => a.predecessori.length > 0)
      }
    };
    
  } catch (error) {
    logs.push(`✗ Errore: ${error.message}`);
    
    return {
      success: false,
      error: error.message,
      logs,
      attivita: []
    };
  }
}

/**
 * Esporta attività in formato XLSX
 */
export function exportToXLSX(attivita, options = {}) {
  const {
    includePredecessors = true,
    includeWBS = true,
    includeCosti = true
  } = options;
  
  // Prepara dati per Excel
  const headers = [
    'WBS',
    'Descrizione',
    'Tipo',
    'Durata (gg)',
    'Data Inizio',
    'Data Fine'
  ];
  
  if (includePredecessors) {
    headers.push('Predecessori');
  }
  
  if (includeCosti) {
    headers.push('Importo (€)', '% Completamento');
  }
  
  const rows = [headers];
  
  for (const att of attivita) {
    const row = [
      att.wbs || '',
      att.descrizione,
      att.tipo_attivita || 'task',
      att.durata_giorni || 0,
      att.data_inizio || '',
      att.data_fine || ''
    ];
    
    if (includePredecessors && att.predecessori) {
      const predStr = att.predecessori
        .map(p => `${p.attivita_id}${p.tipo_dipendenza || 'FS'}${p.lag_giorni ? (p.lag_giorni > 0 ? '+' : '') + p.lag_giorni : ''}`)
        .join('; ');
      row.push(predStr);
    }
    
    if (includeCosti) {
      row.push(att.importo_previsto || 0, att.percentuale_completamento || 0);
    }
    
    rows.push(row);
  }
  
  // Crea worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  
  // Imposta larghezze colonne
  worksheet['!cols'] = [
    { wch: 15 }, // WBS
    { wch: 50 }, // Descrizione
    { wch: 15 }, // Tipo
    { wch: 12 }, // Durata
    { wch: 15 }, // Data Inizio
    { wch: 15 }, // Data Fine
  ];
  
  if (includePredecessors) {
    worksheet['!cols'].push({ wch: 20 });
  }
  
  if (includeCosti) {
    worksheet['!cols'].push({ wch: 15 }, { wch: 12 });
  }
  
  // Crea workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Cronoprogramma');
  
  return workbook;
}

/**
 * Valida un cronoprogramma importato
 */
export function validaCronoprogramma(attivita) {
  const problemi = [];
  const warnings = [];
  
  const idSet = new Set();
  
  for (const att of attivita) {
    // ID duplicati
    if (idSet.has(att.id)) {
      problemi.push(`ID duplicato: ${att.id}`);
    }
    idSet.add(att.id);
    
    // Descrizione mancante
    if (!att.descrizione) {
      problemi.push(`Attività ${att.id}: descrizione mancante`);
    }
    
    // Durata non valida
    if (!att.durata_giorni || att.durata_giorni <= 0) {
      problemi.push(`Attività ${att.id}: durata non valida`);
    }
    
    // Date incoerenti
    if (att.data_inizio && att.data_fine) {
      const start = new Date(att.data_inizio);
      const end = new Date(att.data_fine);
      
      if (end < start) {
        problemi.push(`Attività ${att.id}: data fine precedente a data inizio`);
      }
    }
    
    // Predecessori inesistenti
    if (att.predecessori) {
      for (const pred of att.predecessori) {
        if (!attivita.find(a => a.id === pred.attivita_id)) {
          warnings.push(`Attività ${att.id}: predecessore "${pred.attivita_id}" non esiste`);
        }
        if (pred.attivita_id === att.id) {
          problemi.push(`Attività ${att.id}: non può essere predecessore di se stessa`);
        }
      }
    }
    
    // Warning per durate sospette
    if (att.durata_giorni > 365) {
      warnings.push(`Attività ${att.id}: durata molto lunga (${att.durata_giorni} giorni)`);
    }
  }
  
  return {
    valido: problemi.length === 0,
    problemi,
    warnings
  };
}

export default parseXLSXCronoprogramma;
