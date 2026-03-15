/**
 * Parser Ibrido per Cronoprogrammi - SENZA AI
 * 
 * Questo parser:
 * - NON usa chiamate AI/LLM (evita errori di content filtering)
 * - Estrae dati in modo deterministico da file XLSX
 * - Mantiene le date ESATTE dal file originale
 * - Preserva i predecessori se presenti
 * - Supporta Gantt orizzontali con colori
 * 
 * @version 2.0.0 - Deterministic Only
 */

import * as XLSX from 'xlsx';
import { parseXLSXCronoprogramma } from './parseXLSXCronoprogramma';

// ============================================================================
// PARSER PER GANTT ORIZZONTALI CON COLORI (Google Sheets / Excel)
// ============================================================================

function toISO(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Mappa mesi italiani -> numero mese (0-11)
const MONTH_NAMES_IT = {
  'gen': 0, 'gennaio': 0,
  'feb': 1, 'febbraio': 1,
  'mar': 2, 'marzo': 2,
  'apr': 3, 'aprile': 3,
  'mag': 4, 'maggio': 4,
  'giu': 5, 'giugno': 5,
  'lug': 6, 'luglio': 6,
  'ago': 7, 'agosto': 7,
  'set': 8, 'settembre': 8,
  'ott': 9, 'ottobre': 9,
  'nov': 10, 'novembre': 10,
  'dic': 11, 'dicembre': 11
};

function parseDateToken(value, contextYear = null) {
  if (!value && value !== 0) return null;
  if (value instanceof Date) return toISO(value);

  if (typeof value === 'number' && value > 1000 && value < 100000) {
    const excelEpoch = new Date(1899, 11, 30);
    return toISO(new Date(excelEpoch.getTime() + value * 86400000));
  }

  const str = String(value).trim().toLowerCase();

  // Formato DD/MM/YYYY o DD-MM-YYYY o DD.MM.YYYY
  const m = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    let year = parseInt(m[3], 10);
    if (year < 100) year += 2000;
    const date = new Date(year, parseInt(m[2], 10) - 1, parseInt(m[1], 10));
    return toISO(date);
  }

  // Formato con nome mese italiano (es: "mar", "marzo", "mar 2026", "marzo 2026")
  for (const [monthName, monthIndex] of Object.entries(MONTH_NAMES_IT)) {
    if (str.includes(monthName)) {
      // Cerca anno nella stessa stringa (es: "mar 2026" o "marzo2026")
      const yearMatch = str.match(/20\d{2}/);
      const year = yearMatch ? parseInt(yearMatch[0], 10) : (contextYear || new Date().getFullYear());

      // Usa il primo giorno del mese come data
      const date = new Date(year, monthIndex, 1);
      return toISO(date);
    }
  }

  return null;
}

function addDaysISO(isoDate, days) {
  if (!isoDate) return null;
  const base = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(base.getTime())) return null;
  return toISO(new Date(base.getTime() + days * 86400000));
}

function isNonEmpty(v) {
  return v !== null && v !== undefined && String(v).trim() !== '';
}

/**
 * Trova le righe della timeline in un Gantt Excel
 * Supporta formati con multiple righe di intestazione (dal, al, giorni, etc.)
 * Supporta anche timeline con nomi mesi italiani (gen, feb, mar, etc.)
 */
function findTimelineRows(rawData) {
  const maxRows = Math.min(rawData.length, 15);
  const scored = [];

  // Cerca anche l'anno del contesto nelle prime righe
  let contextYear = null;
  for (let r = 0; r < Math.min(5, rawData.length); r++) {
    const row = rawData[r] || [];
    for (let c = 0; c < Math.min(20, row.length); c++) {
      const str = String(row[c] || '').trim();
      const yearMatch = str.match(/\b(20\d{2})\b/);
      if (yearMatch) {
        contextYear = parseInt(yearMatch[1], 10);
        break;
      }
    }
    if (contextYear) break;
  }

  console.log('[findTimelineRows] Context year found:', contextYear);

  for (let r = 0; r < maxRows; r++) {
    const row = rawData[r] || [];
    let dateCount = 0;
    for (let c = 0; c < row.length; c++) {
      if (parseDateToken(row[c], contextYear)) dateCount++;
    }
    scored.push({ r, dateCount });
  }

  console.log('[findTimelineRows] Scored rows:', scored);

  // Ordina per numero di date trovate
  scored.sort((a, b) => b.dateCount - a.dateCount);

  // Cerca la riga con più date (probabilmente riga "dal" o "al")
  const primary = scored[0];
  if (!primary || primary.dateCount < 4) return null;

  // Cerca una seconda riga con molte date (per avere start + end)
  const second = scored.find(s => s.r !== primary.r && Math.abs(s.r - primary.r) <= 3 && s.dateCount >= 4);

  if (second) {
    // Usa la riga con date più piccole come startRow (riga "dal")
    const startRow = Math.min(primary.r, second.r);
    const endRow = Math.max(primary.r, second.r);
    console.log('[findTimelineRows] Trovate 2 righe: start=', startRow + 1, 'end=', endRow + 1);
    return { startRow, endRow, mode: 'dal_al', contextYear };
  }

  // Se non trovo seconda riga, uso solo la primaria
  console.log('[findTimelineRows] Trovata 1 riga:', primary.r + 1);
  return { startRow: primary.r, endRow: primary.r, mode: 'single', contextYear };
}

/**
 * Costruisce colonne giornaliere partendo da date settimanali
 * Nel formato italiano, le righe "dal" e "al" definiscono intervalli settimanali
 * ma la griglia sottostante è giornaliera
 */
function buildDateColumns(rawData, timelineRows) {
  const startValues = rawData[timelineRows.startRow] || [];
  const endValues = rawData[timelineRows.endRow] || [];
  const maxCols = Math.max(startValues.length, endValues.length);
  const contextYear = timelineRows.contextYear || null;

  console.log('[buildDateColumns] Timeline rows:', timelineRows);
  console.log('[buildDateColumns] Context year:', contextYear);
  console.log('[buildDateColumns] Start values (row', timelineRows.startRow + 1, '):', startValues.slice(0, 20));
  console.log('[buildDateColumns] End values (row', timelineRows.endRow + 1, '):', endValues.slice(0, 20));

  // Primo passo: trova tutti gli anchor (coppie start-end)
  const anchors = [];
  for (let c = 0; c < maxCols; c++) {
    const startDate = parseDateToken(startValues[c], contextYear);
    if (!startDate) continue;

    const endDate = parseDateToken(endValues[c], contextYear);

    anchors.push({
      index: c,
      startDate,
      endDate: endDate || startDate
    });
  }

  console.log('[buildDateColumns] Anchors trovati:', anchors.slice(0, 10));

  if (anchors.length === 0) return [];

  // Secondo passo: espandi ogni anchor in colonne giornaliere
  const dateColumns = [];
  
  for (let i = 0; i < anchors.length; i++) {
    const current = anchors[i];
    const next = anchors[i + 1];
    
    const startDate = new Date(`${current.startDate}T12:00:00`);
    const endDate = new Date(`${current.endDate}T12:00:00`);
    
    // Calcola giorni nell'intervallo
    const spanDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1);
    
    // Determina larghezza: se c'è un next anchor, usa quello come confine
    // Altrimenti usa spanDays
    let width;
    if (next) {
      width = next.index - current.index;
    } else {
      width = spanDays;
    }
    
    // Assicura che width sia almeno 1
    width = Math.max(1, width);
    
    console.log('[buildDateColumns] Anchor', i, ': index=', current.index, 'startDate=', current.startDate, 'endDate=', current.endDate, 'spanDays=', spanDays, 'width=', width);

    // Crea colonne giornaliere
    // Se width > spanDays, significa che ci sono più colonne che giorni (sottogriglia)
    // In questo caso, ogni colonna = 1 giorno a partire da startDate
    const daysToCreate = Math.max(width, spanDays);
    
    for (let dayOffset = 0; dayOffset < width; dayOffset++) {
      const day = addDaysISO(current.startDate, dayOffset);
      dateColumns.push({
        index: current.index + dayOffset,
        startDate: day,
        endDate: day
      });
    }
  }

  console.log('[buildDateColumns] Date columns generate (prime 20):', dateColumns.slice(0, 20));
  return dateColumns;
}

function findHeaderAndDataStart(rawData, timelineRows) {
  const minRow = Math.max(0, timelineRows.endRow - 2);
  const maxRow = Math.min(rawData.length - 1, timelineRows.endRow + 6);

  for (let r = minRow; r <= maxRow; r++) {
    const row = (rawData[r] || []).map(v => String(v || '').toLowerCase().trim());
    const hasAttivita = row.some(v => v.includes('attivit') || v.includes('descrizione'));
    const hasDurata = row.some(v => v === 'gg' || v.includes('durata') || v.includes('giorni'));

    if (hasAttivita || hasDurata) {
      return { headerRow: r, dataStartRow: r + 1 };
    }
  }

  return { headerRow: timelineRows.endRow + 1, dataStartRow: timelineRows.endRow + 2 };
}

function findDescriptionAndDurationColumns(headers, dateColumns) {
  const dateSet = new Set(dateColumns.map(c => c.index));
  let descCol = 1;
  let durationCol = 2;
  let idCol = 0;

  for (let i = 0; i < headers.length; i++) {
    if (dateSet.has(i)) continue;
    const h = String(headers[i] || '').toLowerCase().trim();
    if (!h) continue;

    if (h === 'id' || h === '#' || h === 'n.' || h === 'n') idCol = i;
    if (h.includes('attivit') || h.includes('descrizione') || h.includes('lavor')) descCol = i;
    if (h === 'gg' || h.includes('durata') || h.includes('giorni')) durationCol = i;
  }

  return { idCol, descCol, durationCol };
}

function getCell(worksheet, row, col) {
  return worksheet[XLSX.utils.encode_cell({ r: row, c: col })];
}

function colorTokenFromColorObject(colorObj) {
  if (!colorObj) return '';
  if (typeof colorObj.rgb === 'string' && colorObj.rgb.trim()) return `rgb:${colorObj.rgb.trim().toUpperCase()}`;
  if (colorObj.theme !== undefined && colorObj.theme !== null) return `theme:${colorObj.theme}:${colorObj.tint ?? 0}`;
  if (colorObj.indexed !== undefined && colorObj.indexed !== null) return `indexed:${colorObj.indexed}`;
  if (colorObj.auto) return 'auto';
  return '';
}

function getCellStyleToken(cell) {
  if (!cell || !cell.s) return 'nostyle';

  const style = cell.s || {};
  const fill = style.fill || style.patternFill || style;
  const pattern = fill?.patternType || fill?.pattern || style.patternType || '';
  const fg = colorTokenFromColorObject(fill?.fgColor || style.fgColor);
  const bg = colorTokenFromColorObject(fill?.bgColor || style.bgColor);

  const border = style.border ? 'b1' : 'b0';
  const styleIdx = style.style ?? style.s ?? '';

  return `p:${pattern}|fg:${fg}|bg:${bg}|${border}|idx:${styleIdx}`;
}

function isNeutralCalendarToken(token) {
  if (!token || token === 'nostyle') return true;
  const lower = String(token).toLowerCase();

  return (
    lower.includes('theme:0') ||
    lower.includes('rgb:d8d8d8') ||
    lower.includes('rgb:ffffff') ||
    lower.includes('rgb:000000')
  );
}

function inferSpanFromCellColor(rowIndex, worksheet, dateColumns) {
  const tokens = [];

  for (const dc of dateColumns) {
    const cell = getCell(worksheet, rowIndex, dc.index);
    tokens.push({
      col: dc.index,
      token: getCellStyleToken(cell)
    });
  }

  if (tokens.length < 4) return null;

  const candidateCols = tokens
    .filter(t => !isNeutralCalendarToken(t.token))
    .map(t => t.col)
    .sort((a, b) => a - b);

  if (candidateCols.length === 0) return null;

  return {
    firstCol: candidateCols[0],
    lastCol: candidateCols[candidateCols.length - 1],
    activeCols: candidateCols,
    source: 'cell_fill_color'
  };
}

function inferBarSpanFromRow(row, worksheet, dateColumns) {
  const activeByValue = [];
  for (const dc of dateColumns) {
    const v = row[dc.index];
    if (isNonEmpty(v) && String(v).trim() !== '0' && String(v).trim() !== '-') {
      activeByValue.push(dc.index);
    }
  }

  if (activeByValue.length > 0) {
    return {
      firstCol: Math.min(...activeByValue),
      lastCol: Math.max(...activeByValue),
      source: 'cell_value'
    };
  }

  const colorSpan = inferSpanFromCellColor(row.__rowIndex, worksheet, dateColumns);
  if (colorSpan) return colorSpan;

  return null;
}

function inferLevel(descriptionRaw) {
  const m = String(descriptionRaw || '').match(/^(\s+)/);
  const spaces = m ? m[1].length : 0;
  return Math.max(0, Math.min(4, Math.floor(spaces / 4)));
}

function normalizeActivityType(level, durata) {
  if (durata <= 1) return 'milestone';
  if (level === 0 && durata >= 7) return 'raggruppamento';
  return 'task';
}

function buildHierarchy(attivita) {
  const stack = [];
  const byId = new Map(attivita.map(a => [a.id, a]));

  for (const a of attivita) {
    while (stack.length > 0 && stack[stack.length - 1].livello >= a.livello) {
      stack.pop();
    }

    const parent = stack[stack.length - 1];
    if (parent) {
      a.parent_id = parent.id;
    }

    stack.push(a);
  }

  for (const node of attivita.filter(a => a.tipo_attivita === 'raggruppamento')) {
    const children = attivita.filter(a => a.parent_id === node.id);
    if (children.length === 0) continue;

    const validStarts = children.map(c => c.data_inizio).filter(Boolean).sort();
    const validEnds = children.map(c => c.data_fine).filter(Boolean).sort();

    if (validStarts.length > 0) node.data_inizio = validStarts[0];
    if (validEnds.length > 0) node.data_fine = validEnds[validEnds.length - 1];
  }

  return byId;
}

function analyzeQuality(attivita) {
  const total = attivita.length;
  const withDates = attivita.filter(a => a.data_inizio && a.data_fine).length;
  const coverage = total > 0 ? Math.round((withDates / total) * 100) : 0;
  const incomplete = attivita
    .filter(a => !a.data_inizio || !a.data_fine)
    .map(a => ({
      id: a.id,
      descrizione: a.descrizione,
      data_inizio: a.data_inizio || null,
      data_fine: a.data_fine || null
    }));

  const starts = attivita.map(a => a.data_inizio).filter(Boolean).sort();
  const ends = attivita.map(a => a.data_fine).filter(Boolean).sort();

  return {
    total,
    withDates,
    coverage,
    projectStart: starts[0] || null,
    projectEnd: ends[ends.length - 1] || null,
    confidence: coverage >= 90 ? 'high' : coverage >= 70 ? 'medium' : 'low',
    incomplete
  };
}

function parseStyledHorizontalGantt(fileBuffer, options = {}) {
  const logs = [];

  const workbook = XLSX.read(fileBuffer, {
    type: 'array',
    cellDates: true,
    cellStyles: true,
    cellNF: true
  });

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });

  const timelineRows = findTimelineRows(rawData);
  if (!timelineRows) {
    return { success: false, error: 'Timeline non individuata' };
  }

  logs.push(`✓ Timeline rows: ${timelineRows.startRow + 1}-${timelineRows.endRow + 1}`);

  const dateColumns = buildDateColumns(rawData, timelineRows);
  if (dateColumns.length < 8) {
    return { success: false, error: 'Colonne data insufficienti' };
  }

  const { headerRow, dataStartRow } = findHeaderAndDataStart(rawData, timelineRows);
  const headers = rawData[headerRow] || [];
  const { idCol, descCol, durationCol } = findDescriptionAndDurationColumns(headers, dateColumns);

  logs.push(`✓ Header row: ${headerRow + 1}, data start: ${dataStartRow + 1}`);
  logs.push(`✓ Colonne -> id:${idCol + 1}, desc:${descCol + 1}, dur:${durationCol + 1}`);
  logs.push(`✓ Date columns disponibili: ${dateColumns.length}`);

  const attivita = [];
  const debugRows = [];

  console.log('[parseStyledHorizontalGantt] Inizio parsing attività da riga', dataStartRow + 1);
  console.log('[parseStyledHorizontalGantt] Date columns prime 5:', dateColumns.slice(0, 5));

  for (let r = dataStartRow; r < rawData.length; r++) {
    const row = rawData[r] || [];
    const descrRaw = row[descCol];
    if (!isNonEmpty(descrRaw)) continue;

    const descrizione = String(descrRaw).trim();
    if (!descrizione) continue;

    // Salta righe di intestazione o totali
    if (
      descrizione.toUpperCase().includes('COMUNE') ||
      descrizione.toUpperCase().includes('CRONOPROGRAMMA') ||
      descrizione.toLowerCase() === 'attivita' ||
      descrizione.length > 180
    ) {
      continue;
    }

    const durataParsed = parseInt(row[durationCol], 10);
    const durata = Number.isFinite(durataParsed) && durataParsed > 0 ? durataParsed : 1;

    const rowObj = { ...row, __rowIndex: r };
    const span = inferBarSpanFromRow(rowObj, worksheet, dateColumns);

    console.log('[parseStyledHorizontalGantt] Riga', r + 1, ':', descrizione.substring(0, 40), '- span:', span);

    let dataInizio = null;
    let dataFine = null;

    if (span) {
      const effectiveLastCol =
        Array.isArray(span.activeCols) && span.activeCols.length >= durata
          ? span.activeCols[Math.max(0, durata - 1)]
          : span.lastCol;

      const startRef = dateColumns.find(dc => dc.index === span.firstCol);
      const endRef = dateColumns.find(dc => dc.index === effectiveLastCol);
      dataInizio = startRef?.startDate || null;
      dataFine = endRef?.endDate || endRef?.startDate || null;

      console.log('[parseStyledHorizontalGantt]   -> firstCol:', span.firstCol, 'lastCol:', span.lastCol, 'dataInizio:', dataInizio, 'dataFine:', dataFine);

      if (debugRows.length < 8) {
        debugRows.push({
          descrizione,
          durata,
          firstCol: span.firstCol,
          lastCol: span.lastCol,
          effectiveLastCol,
          activeColsCount: Array.isArray(span.activeCols) ? span.activeCols.length : null,
          dataInizio,
          dataFine
        });
      }
    } else {
      console.log('[parseStyledHorizontalGantt]   -> NESSUNO SPAN TROVATO per questa riga');
    }

    const livello = inferLevel(descrRaw);
    const tipo = normalizeActivityType(livello, durata);
    const wbsRaw = isNonEmpty(row[idCol]) ? String(row[idCol]).trim() : '';
    const id = wbsRaw || `ACT_${attivita.length + 1}`;

    attivita.push({
      id,
      wbs: wbsRaw,
      wbs_code: wbsRaw,
      livello,
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
      note: span ? `inferenza:${span.source}` : ''
    });
  }

  buildHierarchy(attivita);

  const quality = analyzeQuality(attivita);
  logs.push(`✓ Attività: ${quality.total}, copertura date: ${quality.coverage}%`);

  return {
    success: true,
    attivita,
    logs,
    metadata: {
      sheetName,
      metodo: 'styled_horizontal',
      confidence: quality.confidence,
      dateCoverage: quality.coverage,
      projectStart: quality.projectStart,
      projectEnd: quality.projectEnd,
      incompleteDates: quality.incomplete,
      debugRows,
      timelineRowStart: timelineRows.startRow + 1,
      timelineRowEnd: timelineRows.endRow + 1
    }
  };
}

// ============================================================================
// FUNZIONE PRINCIPALE - PIPELINE IBRIDA SENZA AI
// ============================================================================

function chooseBestResult(results) {
  const valid = results.filter(r => r && r.success && Array.isArray(r.attivita) && r.attivita.length > 0);
  if (valid.length === 0) {
    return {
      success: false,
      error: 'Nessun parser ha prodotto un output valido',
      attivita: [],
      logs: results.flatMap(r => r?.logs || [])
    };
  }

  const score = (result) => {
    const coverage = result.metadata?.dateCoverage || 0;
    const method = result.metadata?.metodo || result.metadata?.method || '';
    const isStyled = method.includes('styled_horizontal');

    // Preferisci parser che preservano le date reali dal foglio
    const methodBonus = isStyled ? 220 : method.includes('deterministic') ? 80 : 0;

    // Penalizza output con troppe date uguali (pattern sospetto)
    const starts = result.attivita.map(a => a.data_inizio).filter(Boolean);
    let anomalyPenalty = 0;
    if (starts.length > 10) {
      const freq = new Map();
      for (const s of starts) freq.set(s, (freq.get(s) || 0) + 1);
      const maxCluster = Math.max(...freq.values());
      const ratio = maxCluster / starts.length;
      const uniqueStarts = new Set(starts).size;
      
      if (!isStyled && (ratio >= 0.7 || uniqueStarts <= 2)) {
        anomalyPenalty = 500;
      }
    }

    return methodBonus + coverage - anomalyPenalty;
  };

  valid.sort((a, b) => score(b) - score(a));
  return valid[0];
}

export async function parseCronoprogrammaAIAgent(fileBuffer, options = {}) {
  const logs = ['[Parser Ibrido] Avvio pipeline parsing cronoprogramma (SENZA AI)'];

  // 1. Prova parser per Gantt orizzontali con colori (Google Sheets, Excel grafici)
  const styled = (() => {
    try {
      return parseStyledHorizontalGantt(fileBuffer, options);
    } catch (e) {
      return { 
        success: false, 
        error: `styled parser error: ${e.message}`, 
        logs: [`✗ styled parser: ${e.message}`] 
      };
    }
  })();

  // 2. Prova parser deterministico per tabelle verticali classiche
  const deterministic = (() => {
    try {
      const res = parseXLSXCronoprogramma(fileBuffer, {
        dataInizioDefault: options.dataInizioDefault || null,
        logDetails: false
      });
      return {
        ...res,
        metadata: {
          ...(res.metadata || {}),
          method: 'deterministic_xlsx'
        }
      };
    } catch (e) {
      return { 
        success: false, 
        error: `deterministic parser error: ${e.message}`, 
        logs: [`✗ deterministic: ${e.message}`] 
      };
    }
  })();

  // Scegli il miglior risultato
  let best = chooseBestResult([styled, deterministic]);

  // Se entrambi falliscono, restituisci errore dettagliato
  if (!best.success) {
    return {
      success: false,
      error: 'Impossibile parsare il file. Formati supporti: XLSX con tabelle verticali o Gantt orizzontali.',
      attivita: [],
      logs: [...logs, ...styled.logs, ...deterministic.logs],
      metadata: {
        agent: 'cronoprogramma-parser-v2-deterministic'
      }
    };
  }

  // Validazione finale: scarta output con date sospette (tutte uguali)
  if (best.attivita.length > 10) {
    const starts = best.attivita.map(a => a.data_inizio).filter(Boolean);
    const uniqueStarts = new Set(starts).size;
    const method = best.metadata?.metodo || best.metadata?.method || '';
    const isStyled = method.includes('styled_horizontal');

    if (!isStyled && starts.length > 0 && uniqueStarts <= 2) {
      return {
        success: false,
        error: 'Parsing non affidabile: troppe attività con stessa data di inizio. Il file richiede un Gantt orizzontale con date visibili.',
        attivita: [],
        logs: [...logs, '✗ Guard-rail: output scartato per date anomale (tutte uguali)'],
        metadata: {
          agent: 'cronoprogramma-parser-v2-deterministic',
          anomaly: 'same_start_date_cluster'
        }
      };
    }
  }

  return {
    ...best,
    logs: [...logs, ...(best.logs || [])],
    metadata: {
      ...(best.metadata || {}),
      agent: 'cronoprogramma-parser-v2-deterministic',
      pipeline: ['styled_horizontal', 'deterministic_xlsx']
    }
  };
}

export default parseCronoprogrammaAIAgent;
