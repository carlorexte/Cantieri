/**
 * Parser Semplice per Cronoprogrammi - Formato Google Sheets/Excel
 * 
 * Legge file XLSX con struttura:
 * - Colonne A-C: ID, Descrizione, Durata
 * - Colonne D+: Griglia Gantt con date nelle prime righe
 * - Celle colorate: indicano durata attività (se presenti)
 * 
 * @version 1.0.0
 */

import * as XLSX from 'xlsx';
import { assertSafeSpreadsheetBuffer } from './safeSpreadsheet';

function toISO(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDate(value) {
  if (!value && value !== 0) return null;
  if (value instanceof Date) return toISO(value);
  if (typeof value === 'number' && value > 1000 && value < 100000) {
    const epoch = new Date(1899, 11, 30);
    return toISO(new Date(epoch.getTime() + value * 86400000));
  }
  if (typeof value === 'string') {
    const str = value.trim();
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

function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  return toISO(date);
}

function findTimelineRow(rawData) {
  for (let r = 0; r < Math.min(10, rawData.length); r++) {
    const row = rawData[r] || [];
    let dateCount = 0;
    for (let c = 0; c < Math.min(50, row.length); c++) {
      if (parseDate(row[c])) dateCount++;
    }
    if (dateCount >= 4) return r;
  }
  return -1;
}

function buildDateMap(rawData, timelineRow) {
  const row = rawData[timelineRow] || [];
  const dateMap = new Map();
  let firstDateCol = -1;
  let firstDate = null;
  
  for (let c = 0; c < row.length; c++) {
    const date = parseDate(row[c]);
    if (date && firstDate === null) {
      firstDate = date;
      firstDateCol = c;
      break;
    }
  }
  
  if (firstDate === null) return null;
  
  let currentDate = new Date(`${firstDate}T12:00:00`);
  
  for (let c = firstDateCol; c < row.length; c++) {
    const date = parseDate(row[c]);
    if (date) {
      currentDate = new Date(`${date}T12:00:00`);
      dateMap.set(c, date);
    } else {
      dateMap.set(c, toISO(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }
  
  return { firstDateCol, dateMap, firstDate };
}

function findColorSpan(worksheet, rowIndex, firstDataCol, maxCol) {
  let firstCol = -1;
  let lastCol = -1;

  for (let c = firstDataCol; c < maxCol; c++) {
    const cell = worksheet[XLSX.utils.encode_cell({ r: rowIndex, c })];
    const hasValue = cell && (cell.v !== null && cell.v !== undefined && cell.v !== '');
    let hasColor = false;

    // DEBUG: Log prime 3 celle per capire cosa riceve
    if (rowIndex === 4 && c < firstDataCol + 3) {
      console.log(`[DEBUG] Row ${rowIndex}, Col ${c}:`, {
        hasCell: !!cell,
        value: cell?.v,
        hasStyle: !!(cell?.s),
        fill: cell?.s?.fill,
        raw: cell
      });
    }

    if (cell && cell.s && cell.s.fill) {
      const fill = cell.s.fill;
      const rgb = fill.fgColor?.rgb || fill.bgColor?.rgb;
      if (rgb && rgb !== 'FFFFFFFF' && rgb !== 'FFFFFF' && rgb !== '00000000' && rgb !== '0') {
        hasColor = true;
      }
      if (fill.patternType === 'solid') hasColor = true;
    }
    if (hasValue || hasColor) {
      if (firstCol === -1) firstCol = c;
      lastCol = c;
    }
  }

  return firstCol >= 0 ? { firstCol, lastCol } : null;
}

export function parseCronoprogrammaSemplice(fileBuffer, options = {}) {
  const logs = [];
  
  try {
    assertSafeSpreadsheetBuffer(fileBuffer);

    const workbook = XLSX.read(fileBuffer, {
      type: 'array',
      cellDates: true,
      cellStyles: true
    });
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    logs.push(`✓ Foglio: ${sheetName}`);
    
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
    
    if (rawData.length === 0) {
      throw new Error('Foglio vuoto');
    }
    
    logs.push(`✓ Righe: ${rawData.length}`);
    
    const timelineRow = findTimelineRow(rawData);
    
    if (timelineRow < 0) {
      throw new Error('Timeline non trovata - assicurati che ci siano date nelle prime 10 righe');
    }
    
    logs.push(`✓ Timeline row: ${timelineRow + 1}`);
    
    const dateInfo = buildDateMap(rawData, timelineRow);
    
    if (!dateInfo) {
      throw new Error('Impossibile leggere le date dalla timeline');
    }
    
    logs.push(`✓ Prima data: ${dateInfo.firstDate}`);
    logs.push(`✓ Colonne data: ${dateInfo.dateMap.size}`);
    
    let headerRow = -1;
    for (let r = 0; r < Math.min(15, rawData.length); r++) {
      const row = rawData[r] || [];
      const text = row.map(c => String(c || '').toLowerCase()).join(' ');
      if (text.includes('id') && (text.includes('attiv') || text.includes('durata'))) {
        headerRow = r;
        break;
      }
    }
    
    if (headerRow < 0) headerRow = timelineRow + 2;
    
    const dataStartRow = headerRow + 1;
    
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

    const firstDataCol = 3;
    const attivita = [];
    let cursorDate = new Date(`${dateInfo.firstDate}T12:00:00`);

    for (let r = dataStartRow; r < rawData.length; r++) {
      const row = rawData[r] || [];
      const descrizione = String(row[descCol] || '').trim();

      if (!descrizione || descrizione.length > 150 || descrizione.toUpperCase().includes('COMUNE')) {
        continue;
      }

      let durata = parseInt(row[durationCol], 10) || 1;
      if (durata < 1) durata = 1;

      const idRaw = String(row[idCol] || '').trim();
      const id = idRaw || `ACT_${attivita.length + 1}`;

      const maxCol = 3 + dateInfo.dateMap.size;
      const span = findColorSpan(worksheet, r, firstDataCol, maxCol);

      let dataInizio = null;
      let dataFine = null;

      if (span) {
        dataInizio = dateInfo.dateMap.get(span.firstCol);
        dataFine = dateInfo.dateMap.get(span.lastCol);
      } else {
        dataInizio = toISO(cursorDate);
        dataFine = addDays(dataInizio, durata - 1);
        cursorDate = new Date(`${dataFine}T12:00:00`);
        cursorDate.setDate(cursorDate.getDate() + 1);
      }
      
      let tipo = 'task';
      if (durata === 1) tipo = 'milestone';
      if (descrizione === descrizione.toUpperCase() && durata > 10) tipo = 'raggruppamento';

      attivita.push({
        id,
        wbs: idRaw || '',
        wbs_code: idRaw || '',
        livello: idRaw && !idRaw.match(/^\d+$/) ? 0 : 1,
        parent_id: null,
        source_row: r + 1,
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
        note: `source_row:${r + 1}`
      });
    }
    
    logs.push(`✓ Attività estratte: ${attivita.length}`);
    
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

    for (const node of attivita.filter(a => a.tipo_attivita === 'raggruppamento')) {
      const children = attivita.filter(a => a.parent_id === node.id);
      if (children.length > 0) {
        const starts = children.map(c => c.data_inizio).filter(Boolean).sort();
        const ends = children.map(c => c.data_fine).filter(Boolean).sort();
        if (starts.length > 0) node.data_inizio = starts[0];
        if (ends.length > 0) node.data_fine = ends[ends.length - 1];
      }
    }
    
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
        projectEnd: ends[ends.length - 1] || null
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
