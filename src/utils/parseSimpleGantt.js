/**
 * Parser SEMPLIFICATO per Gantt Excel
 * Legge colonne base: ID, attivita, durata
 * Se non viene fornita una data inizio manuale, la inferisce dal calendario del foglio.
 */

import * as XLSX from 'xlsx';
import { assertSafeSpreadsheetBuffer } from './safeSpreadsheet';

function parseDateTokenToISO(token) {
  if (!token) return null;
  const str = String(token).trim();
  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;

  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  let year = parseInt(m[3], 10);

  if (year < 100) {
    year += year < 50 ? 2000 : 1900;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function inferStartDateFromSheet(rawData) {
  const maxRows = Math.min(rawData.length, 12);
  let candidate = null;

  for (let r = 0; r < maxRows; r++) {
    const row = rawData[r] || [];
    for (let c = 0; c < row.length; c++) {
      const parsed = parseDateTokenToISO(row[c]);
      if (!parsed) continue;
      if (!candidate || parsed < candidate) {
        candidate = parsed;
      }
    }
  }

  return candidate;
}

export function parseSimpleGantt(fileBuffer, dataInizioDefault = null) {
  const logs = [];

  try {
    assertSafeSpreadsheetBuffer(fileBuffer);

    const workbook = XLSX.read(fileBuffer, {
      type: 'array',
      cellDates: true
    });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    let headerRowIndex = 0;
    let maxCols = 0;
    for (let i = 0; i < Math.min(10, rawData.length); i++) {
      if ((rawData[i] || []).length > maxCols) {
        maxCols = rawData[i].length;
        headerRowIndex = i;
      }
    }

    const headers = rawData[headerRowIndex] || [];

    let idCol = 0;
    let descCol = 1;
    let durataCol = 2;

    for (let i = 0; i < Math.min(10, headers.length); i++) {
      const h = String(headers[i] || '').toLowerCase().trim();
      if (h === 'id' || h === '#') idCol = i;
      if (h === 'attivita' || h === 'attivita\u0300' || h.includes('descrizione')) descCol = i;
      if (h.includes('durata') || h === 'gg' || h.includes('giorni')) durataCol = i;
    }

    const inferredStartDate = inferStartDateFromSheet(rawData);
    const projectStartDate = dataInizioDefault || inferredStartDate || new Date().toISOString().split('T')[0];

    logs.push(`Data inizio progetto: ${projectStartDate}`);
    if (inferredStartDate) {
      logs.push(`Data inferita dal file: ${inferredStartDate}`);
    }

    const attivita = [];
    const dataRows = rawData.slice(headerRowIndex + 1);

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (!row || !row[descCol]) continue;

      const descrizione = String(row[descCol] || '').trim();
      if (
        !descrizione ||
        descrizione.length > 100 ||
        descrizione.toUpperCase().includes('COMUNE') ||
        descrizione.toUpperCase().includes('LOTTO') ||
        /^\d+$/.test(descrizione)
      ) {
        continue;
      }

      const durata = parseInt(row[durataCol], 10) || 1;
      const idRaw = row[idCol] ? String(row[idCol]).trim() : '';

      attivita.push({
        id: idRaw || `ACT_${attivita.length + 1}`,
        wbs: idRaw || '',
        wbs_code: idRaw || '',
        source_row: headerRowIndex + 2 + i,
        descrizione,
        durata_giorni: durata,
        data_inizio: projectStartDate,
        data_fine: null,
        stato: 'pianificata',
        tipo_attivita: durata >= 100 ? 'raggruppamento' : 'task',
        colore: '#3b82f6',
        predecessori: [],
        importo_previsto: 0,
        percentuale_completamento: 0,
        categoria: 'altro',
        note: `source_row:${headerRowIndex + 2 + i}`
      });
    }

    let currentDate = new Date(projectStartDate + 'T12:00:00');
    for (const att of attivita) {
      att.data_inizio = currentDate.toISOString().split('T')[0];
      currentDate = new Date(currentDate.getTime() + att.durata_giorni * 86400000);
      att.data_fine = new Date(currentDate.getTime() - 86400000).toISOString().split('T')[0];
    }

    return {
      success: true,
      attivita,
      logs,
      metadata: {
        sheetName,
        attivitaEstratte: attivita.length,
        projectStartDate,
        inferredStartDate
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      attivita: [],
      logs
    };
  }
}

export default parseSimpleGantt;
