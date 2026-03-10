/**
 * Parser Semplice per Cronoprogrammi - Formato Google Sheets
 * 
 * Legge file XLSX con struttura:
 * - Colonne A-C: ID, Descrizione, Durata
 * - Colonne D+: Griglia Gantt con date nelle prime righe
 * - Celle colorate: indicano durata attività
 * 
 * @version 1.0.0
 */

import * as XLSX from 'xlsx';

/**
 * Converte una data in formato ISO (YYYY-MM-DD)
 */
function toISO(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse di una data da vari formati
 */
function parseDate(value) {
  if (!value && value !== 0) return null;
  
  // Date object
  if (value instanceof Date) {
    return toISO(value);
  }
  
  // Serial Excel
  if (typeof value === 'number' && value > 1000 && value < 100000) {
    const epoch = new Date(1899, 11, 30);
    return toISO(new Date(epoch.getTime() + value * 86400000));
  }
  
  // Stringa
  if (typeof value === 'string') {
    const str = value.trim();
    
    // DD/MM/YYYY o DD/MM/YY
    const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) {
      let day = parseInt(m[1]);
      let month = parseInt(m[2]);
      let year = parseInt(m[3]);
      if (year < 100) year += 2000;
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  
  return null;
}

/**
 * Aggiunge giorni a una data ISO
 */
function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  return toISO(date);
}

/**
 * Trova la prima riga con molte date (timeline header)
 */
function findTimelineRow(rawData) {
  for (let r = 0; r < Math.min(10, rawData.length); r++) {
    const row = rawData[r] || [];
    let dateCount = 0;
    for (let c = 0; c < Math.min(50, row.length); c++) {
      if (parseDate(row[c])) dateCount++;
    }
    // Abbasso soglia a 4 date (nel tuo file ci sono 7 date settimanali)
    if (dateCount >= 4) return r;
  }
  return -1;
}

/**
 * Costruisce una mappa colonna → data in modo ACCURATO
 *
 * Strategia:
 * 1. Trova tutte le "ancore" (colonne con date esplicite)
 * 2. Calcola intervallo giorni tra due ancore consecutive
 * 3. Distribuisci giorni uniformemente tra le colonne dell'intervallo
 *
 * Esempio:
 * - Colonna D: "01/04/2025"
 * - Colonna K: "08/04/2025" (7 giorni dopo)
 * - Colonne tra D e K: 7 (D, E, F, G, H, I, J, K)
 * - Ogni colonna = 1 giorno: D=01/04, E=02/04, ..., K=08/04
 */
function buildDateMap(rawData, timelineRow) {
  const row = rawData[timelineRow] || [];
  const dateMap = new Map();

  console.log('[buildDateMap] Parsing riga timeline:', timelineRow + 1);
  console.log('[buildDateMap] Valori riga (primi 30):', row.slice(0, 30));

  // 1. Trova tutte le ancore (celle con date esplicite)
  const anchors = [];
  for (let c = 0; c < row.length; c++) {
    const date = parseDate(row[c]);
    if (date) {
      anchors.push({ col: c, date });
      console.log(`[buildDateMap] Ancora trovata: col ${c + 1} → ${date}`);
    }
  }

  if (anchors.length === 0) {
    console.error('[buildDateMap] ERRORE: Nessuna ancora trovata!');
    return null;
  }

  console.log(`[buildDateMap] Totale ancore: ${anchors.length}`);

  // 2. Espandi intervalli tra ancore
  for (let i = 0; i < anchors.length; i++) {
    const curr = anchors[i];
    const next = anchors[i + 1];

    // Aggiungi l'ancora corrente
    dateMap.set(curr.col, curr.date);

    if (next) {
      // Calcola giorni tra curr e next
      const currDate = new Date(`${curr.date}T12:00:00`);
      const nextDate = new Date(`${next.date}T12:00:00`);
      const daysDiff = Math.round((nextDate - currDate) / (1000 * 60 * 60 * 24));
      const colsDiff = next.col - curr.col;

      console.log(`[buildDateMap] Intervallo: col ${curr.col} → ${next.col} (${colsDiff} colonne, ${daysDiff} giorni)`);

      // Distribuisci giorni sulle colonne intermedie
      if (colsDiff > 0) {
        const daysPerCol = daysDiff / colsDiff;

        for (let offset = 1; offset < colsDiff; offset++) {
          const col = curr.col + offset;
          const daysOffset = Math.round(offset * daysPerCol);
          const intermediateDate = addDays(curr.date, daysOffset);
          dateMap.set(col, intermediateDate);
        }
      }
    } else {
      // Ultima ancora: continua aggiungendo 1 giorno per colonna
      console.log(`[buildDateMap] Ultima ancora (col ${curr.col}), estendo fino a fine riga`);
      let lastDate = curr.date;
      for (let c = curr.col + 1; c < row.length && c < curr.col + 30; c++) {
        lastDate = addDays(lastDate, 1);
        dateMap.set(c, lastDate);
      }
    }
  }

  console.log(`[buildDateMap] Date map creata: ${dateMap.size} colonne mappate`);
  console.log('[buildDateMap] Prime 20 colonne:',
    Object.fromEntries([...dateMap.entries()].slice(0, 20).map(([k, v]) => [`col${k}`, v]))
  );

  return {
    firstDateCol: anchors[0].col,
    dateMap,
    firstDate: anchors[0].date
  };
}

/**
 * Trova lo span di colonne per una riga
 * Supporta celle con valore, sfondo colorato e bordi
 */
function findColorSpan(worksheet, rowIndex, firstDataCol, maxCol) {
  let firstCol = -1;
  let lastCol = -1;
  let debugInfo = { hasValueCount: 0, hasColorCount: 0, hasBorderCount: 0 };

  for (let c = firstDataCol; c < maxCol; c++) {
    const cellAddr = XLSX.utils.encode_cell({ r: rowIndex, c });
    const cell = worksheet[cellAddr];

    if (!cell) continue; // Salta celle completamente vuote

    // Strategia 1: cella con valore non vuoto
    const hasValue = cell.v !== null && cell.v !== undefined && String(cell.v).trim() !== '';

    // Strategia 2: sfondo colorato (non bianco/trasparente)
    let hasColor = false;
    if (cell.s?.fill) {
      const fill = cell.s.fill;
      const fgRgb = fill.fgColor?.rgb;
      const bgRgb = fill.bgColor?.rgb;
      const pattern = fill.patternType;
      const neutralColors = ['FFFFFFFF', 'FFFFFF', '00000000', 'FFFFFF00'];

      // Controlla foreground color
      if (fgRgb && !neutralColors.includes(fgRgb.toUpperCase())) {
        hasColor = true;
      }
      // Controlla background color
      if (bgRgb && !neutralColors.includes(bgRgb.toUpperCase())) {
        hasColor = true;
      }
      // Controlla pattern
      if (pattern && pattern !== 'none') {
        hasColor = true;
      }
    }

    // Strategia 3: bordi
    let hasBorder = false;
    if (cell.s?.border) {
      const border = cell.s.border;
      // Verifica che ci siano bordi definiti (non solo l'oggetto vuoto)
      if (border.left?.style || border.right?.style || border.top?.style || border.bottom?.style) {
        hasBorder = true;
      }
    }

    const isActive = hasValue || hasColor || hasBorder;

    if (hasValue) debugInfo.hasValueCount++;
    if (hasColor) debugInfo.hasColorCount++;
    if (hasBorder) debugInfo.hasBorderCount++;

    if (isActive) {
      if (firstCol === -1) firstCol = c;
      lastCol = c;
    }
  }

  if (firstCol === -1) {
    // Debug: mostra perché non ha trovato nulla
    console.log(`[findColorSpan] Riga ${rowIndex + 1}: NESSUNO SPAN (valori: ${debugInfo.hasValueCount}, colori: ${debugInfo.hasColorCount}, bordi: ${debugInfo.hasBorderCount})`);

    // Se ha trovato celle con valori ma non colori, probabilmente il file non ha stili
    if (debugInfo.hasValueCount > 0) {
      console.log(`[findColorSpan] ⚠️ Rilevate celle con valori ma senza colori. Il file potrebbe non avere formattazione.`);
    }
  }

  return firstCol >= 0 ? { firstCol, lastCol } : null;
}

/**
 * Parser principale
 */
export function parseCronoprogrammaSemplice(fileBuffer, options = {}) {
  const logs = [];
  
  try {
    console.log('[Parser] INIZIO PARSING');
    
    // Leggi workbook
    const workbook = XLSX.read(fileBuffer, {
      type: 'array',
      cellDates: true,
      cellStyles: true
    });
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    logs.push(`✓ Foglio: ${sheetName}`);
    
    // Converti in array grezzo
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
    
    if (rawData.length === 0) {
      console.error('[Parser] Foglio vuoto!');
      throw new Error('Foglio vuoto');
    }
    
    console.log('[Parser] Righe totali:', rawData.length);
    logs.push(`✓ Righe: ${rawData.length}`);
    
    // Trova riga timeline
    const timelineRow = findTimelineRow(rawData);
    console.log('[Parser] Timeline row trovata:', timelineRow);
    
    if (timelineRow < 0) {
      console.error('[Parser] Timeline NON trovata!');
      console.log('[Parser] Prime 10 righe:', rawData.slice(0, 10).map((r, i) => `Riga ${i+1}: ${r?.slice(0,5).join(' | ')}`));
      throw new Error('Timeline non trovata - assicurati che ci siano date nelle prime 10 righe');
    }
    
    logs.push(`✓ Timeline row: ${timelineRow + 1}`);
    
    // Costruisci mappa date
    console.log('[Parser] Chiamo buildDateMap con timelineRow:', timelineRow);
    const dateInfo = buildDateMap(rawData, timelineRow);
    console.log('[Parser] dateInfo ritornato:', dateInfo);
    
    if (!dateInfo) {
      console.error('[Parser] Date map NON costruita!');
      throw new Error('Impossibile leggere le date dalla timeline');
    }
    
    logs.push(`✓ Prima data: ${dateInfo.firstDate}, Colonna: ${dateInfo.firstDateCol + 1}`);
    logs.push(`✓ Colonne data: ${dateInfo.dateMap.size}`);
    
    // Trova riga intestazioni (quella con "ID" o "Attività" o "Descrizione")
    // Nel tuo file è la riga 7 (index 6) che ha "ID | attività | durata"
    let headerRow = -1;
    for (let r = 0; r < Math.min(15, rawData.length); r++) {
      const row = rawData[r] || [];
      const text = row.map(c => String(c || '').toLowerCase()).join(' ');
      // Cerco "id" seguito da "attività" o "durata"
      if (text.includes('id') && (text.includes('attiv') || text.includes('durata'))) {
        headerRow = r;
        break;
      }
    }
    
    if (headerRow < 0) {
      // Fallback: usa la riga dopo la timeline
      headerRow = timelineRow + 2;
    }
    
    const dataStartRow = headerRow + 1;
    
    // LOG ESTESO PER DEBUG
    console.log('[Parser] Timeline row:', timelineRow);
    console.log('[Parser] First date col:', dateInfo.firstDateCol);
    console.log('[Parser] First date:', dateInfo.firstDate);
    console.log('[Parser] Date map (prime 10):', Object.fromEntries([...dateInfo.dateMap.entries()].slice(0, 10)));
    console.log('[Parser] Header row:', headerRow, 'Data start row:', dataStartRow);
    
    // LOG: mostro le prime attività che trovo
    console.log('[Parser] Inizio scanning attività da riga', dataStartRow);

    // Trova colonne
    const headers = rawData[headerRow] || [];
    let descCol = 1;
    let durationCol = 2;
    let idCol = 0;

    for (let c = 0; c < Math.min(10, headers.length); c++) {
      const h = String(headers[c] || '').toLowerCase();
      if (h.includes('id') || h === '#' || h === 'n.') idCol = c;
      if (h.includes('attiv') || h.includes('descrizion')) descCol = c;
      if (h.includes('durata') || h === 'gg' || h.includes('giorni')) durationCol = c;
    }

    logs.push(`✓ Colonne: ID=${idCol+1}, Desc=${descCol+1}, Durata=${durationCol+1}`);

    // Prima colonna dati (dopo descrizione e durata)
    // Nel tuo file la griglia Gantt inizia alla colonna 3 (index 3)
    const firstDataCol = 3;

    console.log('[Parser] firstDataCol:', firstDataCol, 'dateInfo.firstDateCol:', dateInfo.firstDateCol);
    
    // Parse attività
    const attivita = [];
    let cursorDate = new Date(`${dateInfo.firstDate}T12:00:00`);
    
    console.log('[Parser] Inizio parsing attività. Data inizio:', dateInfo.firstDate);

    for (let r = dataStartRow; r < rawData.length; r++) {
      const row = rawData[r] || [];
      const descrizione = String(row[descCol] || '').trim();

      // Salta righe vuote o intestazioni
      if (!descrizione || descrizione.length > 150 || descrizione.toUpperCase().includes('COMUNE')) {
        continue;
      }

      // Parse durata
      let durata = parseInt(row[durationCol], 10) || 1;
      if (durata < 1) durata = 1;

      // Parse ID
      const idRaw = String(row[idCol] || '').trim();
      const id = idRaw || `ACT_${attivita.length + 1}`;

      // Trova span colorato (potrebbe essere null se non ci sono colori)
      const maxCol = 3 + dateInfo.dateMap.size;
      const span = findColorSpan(worksheet, r, firstDataCol, maxCol);

      let dataInizio = null;
      let dataFine = null;

      if (span) {
        // Ho trovato uno span colorato: uso le date dalla mappa
        dataInizio = dateInfo.dateMap.get(span.firstCol);
        dataFine = dateInfo.dateMap.get(span.lastCol);
        
        console.log('[Parser] Riga', r + 1, ':', descrizione.substring(0, 50), '- span:', span, '→ date:', dataInizio, dataFine);
      } else {
        // NON ho trovato span: calcolo date sequenzialmente
        dataInizio = toISO(cursorDate);
        dataFine = addDays(dataInizio, durata - 1);
        
        // Avanzo il cursore per la prossima attività
        cursorDate = new Date(`${dataFine}T12:00:00`);
        cursorDate.setDate(cursorDate.getDate() + 1);
        
        console.log('[Parser] Riga', r + 1, ':', descrizione.substring(0, 50), '- span: NULL → calcolo sequenziale:', dataInizio, dataFine);
      }
      
      // Determina tipo
      let tipo = 'task';
      if (durata === 1) tipo = 'milestone';
      if (descrizione === descrizione.toUpperCase() && durata > 10) tipo = 'raggruppamento';
      
      attivita.push({
        id,
        wbs: idRaw || '',
        wbs_code: idRaw || '',
        livello: idRaw && !idRaw.match(/^\d+$/) ? 0 : 1,
        parent_id: null,
        descrizione,
        tipo_attivita: tipo,
        data_inizio: dataInizio,
        data_fine: dataFine,
        durata_giorni: durata,
        predecessori: [],
        percentuale_completamento: 0,
        importo_previsto: 0,
        colore: tipo === 'raggruppamento' ? '#64748b' : tipo === 'milestone' ? '#f59e0b' : '#3b82f6',
        stato: 'pianificata',
        categoria: 'altro',
        note: ''
      });
    }
    
    logs.push(`✓ Attività estratte: ${attivita.length}`);
    
    // Costruisci gerarchia
    const stack = [];
    for (const att of attivita) {
      while (stack.length > 0 && stack[stack.length - 1].livello >= att.livello) {
        stack.pop();
      }
      if (stack.length > 0) {
        att.parent_id = stack[stack.length - 1].id;
      }
      stack.push(att);
    }
    
    // Calcola date raggruppamenti
    for (const node of attivita.filter(a => a.tipo_attivita === 'raggruppamento')) {
      const children = attivita.filter(a => a.parent_id === node.id);
      if (children.length > 0) {
        const starts = children.map(c => c.data_inizio).filter(Boolean).sort();
        const ends = children.map(c => c.data_fine).filter(Boolean).sort();
        if (starts.length > 0) node.data_inizio = starts[0];
        if (ends.length > 0) node.data_fine = ends[ends.length - 1];
      }
    }
    
    // Stats
    const withDates = attivita.filter(a => a.data_inizio && a.data_fine).length;
    const coverage = Math.round((withDates / attivita.length) * 100);
    
    const starts = attivita.map(a => a.data_inizio).filter(Boolean).sort();
    const ends = attivita.map(a => a.data_fine).filter(Boolean).sort();
    
    return {
      success: true,
      attivita,
      logs,
      metadata: {
        sheetName,
        metodo: 'parse_semplice_v1',
        dateCoverage: coverage,
        projectStart: starts[0] || null,
        projectEnd: ends[ends.length - 1] || null,
        timelineRow: timelineRow + 1,
        firstDataCol: firstDataCol + 1
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      attivita: [],
      logs: [...logs, `✗ Errore: ${error.message}`]
    };
  }
}

export default parseCronoprogrammaSemplice;
