/**
 * Excel to CSV Converter per Gantt
 * 
 * Converte un file Excel (Gantt orizzontale) in CSV strutturato
 * per un'importazione affidabile delle attività.
 */

import * as XLSX from 'xlsx';

/**
 * Converte un file Excel in CSV e estrae le attività
 * @param {ArrayBuffer} fileBuffer - Buffer del file Excel
 * @param {Object} options - Opzioni
 * @returns {Object} Risultato della conversione
 */
export function convertExcelToActivities(fileBuffer, options = {}) {
  const {
    sheetIndex = 0,
    dataInizioDefault = '2025-01-01'
  } = options;

  const logs = [];
  const errors = [];

  try {
    console.log('📖 Lettura workbook...');
    
    // Leggi workbook
    const workbook = XLSX.read(fileBuffer, {
      type: 'array',
      cellDates: true,
      cellStyles: true,
      cellNF: true,
      cellText: true
    });

    logs.push(`✓ Workbook caricato: ${workbook.SheetNames.length} fogli`);
    console.log('Fogli trovati:', workbook.SheetNames);

    // Seleziona foglio
    const sheetName = workbook.SheetNames[sheetIndex];
    if (!sheetName) {
      throw new Error(`Foglio ${sheetIndex} non trovato`);
    }

    logs.push(`✓ Foglio selezionato: "${sheetName}"`);
    const worksheet = workbook.Sheets[sheetName];

    // Converti in JSON grezzo per analisi
    const rawData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
      dateNF: 'dd/mm/yyyy'
    });

    console.log('Righe totali:', rawData.length);
    console.log('Prime 5 righe:', rawData.slice(0, 5));

    if (rawData.length === 0) {
      throw new Error('Foglio vuoto');
    }

    logs.push(`✓ Righe totali: ${rawData.length}`);

    // Trova la riga di intestazione vera (quella con più colonne e date)
    let headerRowIndex = -1;
    let headers = [];
    let maxColumns = 0;

    for (let i = 0; i < Math.min(10, rawData.length); i++) {
      const row = rawData[i];
      const colCount = row.filter(c => c !== null && c !== undefined).length;
      
      console.log(`Riga ${i}: ${colCount} colonne`);
      
      // Cerca la riga con più colonne (probabilmente le intestazioni)
      if (colCount > maxColumns) {
        maxColumns = colCount;
        headerRowIndex = i;
        headers = row;
      }
    }

    console.log('Intestazioni trovate a riga:', headerRowIndex);
    console.log('Prime 10 intestazioni:', headers.slice(0, 10));
    console.log('Ultime 5 intestazioni:', headers.slice(-5));

    if (headerRowIndex === -1 || maxColumns < 4) {
      throw new Error('Nessuna intestazione valida trovata');
    }

    logs.push(`✓ Intestazioni trovate a riga ${headerRowIndex + 1} (${maxColumns} colonne)`);

    // Identifica le colonne
    const columnMapping = identifyColumns(headers);
    logs.push(`Colonne identificate: ${JSON.stringify(columnMapping)}`);

    // Estrai date dalle colonne
    const dateColumns = [];
    for (let i = 0; i < headers.length; i++) {
      const h = String(headers[i] || '').trim();
      if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(h)) {
        const date = parseItalianDate(h);
        if (date) {
          dateColumns.push({ index: i, date, header: h });
        }
      }
    }

    logs.push(`✓ ${dateColumns.length} colonne data identificate`);

    // Estrai attività
    const attivita = [];
    const dataRows = rawData.slice(headerRowIndex + 1);

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (!row || row.every(c => !c || !String(c).trim())) continue;

      const attivitaData = parseAttivitaRow(
        row,
        columnMapping,
        dateColumns,
        dataInizioDefault,
        i
      );

      if (attivitaData) {
        attivita.push(attivitaData);
      }
    }

    logs.push(`✓ ${attivita.length} attività estratte`);

    // Genera CSV
    const csv = generateCSV(attivita);

    return {
      success: true,
      attivita,
      csv,
      logs,
      errors,
      metadata: {
        sheetName,
        righeTotali: rawData.length,
        attivitaEstratte: attivita.length,
        colonneData: dateColumns.length,
        dataInizio: attivita[0]?.data_inizio,
        dataFine: attivita[attivita.length - 1]?.data_fine
      }
    };

  } catch (error) {
    errors.push(error.message);
    logs.push(`✗ Errore: ${error.message}`);

    return {
      success: false,
      error: error.message,
      logs,
      errors,
      attivita: [],
      csv: ''
    };
  }
}

/**
 * Identifica le colonne dal header
 */
function identifyColumns(headers) {
  const mapping = {
    descrizione: -1,
    id: -1,
    durata: -1,
    importo: -1,
    wbs: -1
  };

  for (let i = 0; i < headers.length; i++) {
    // Gestione header con newline o null
    let h = headers[i];
    if (h === null || h === undefined) continue;
    h = String(h).toLowerCase().trim().replace(/\n/g, ' ');
    
    console.log(`Colonna ${i}: "${h}"`);

    // Salta colonne data/giorni (singole lettere o giorni settimana)
    if (/^[LMMGVSD]$/.test(h) || 
        ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'].includes(h)) continue;

    // DESCRIZIONE - deve contenere "descrizione" o "attività"
    if (h.includes('descrizione') || h === 'attività' || h.includes('lavori')) {
      mapping.descrizione = i;
      console.log(`✓ Trovata descrizione a colonna ${i}`);
    }
    // ID - solo se è esattamente "id" o "wbs" o "#"
    else if (h === 'id' || h === 'wbs' || h === '#') {
      mapping.id = i;
      mapping.wbs = i;
      console.log(`✓ Trovato ID a colonna ${i}`);
    }
    // DURATA - cerca "durata", "gg", "giorni"
    else if (h.includes('durata') || h.includes('gg') || h.includes('giorni')) {
      mapping.durata = i;
      console.log(`✓ Trovata durata a colonna ${i}`);
    }
    // IMPORTO - cerca "importo", "costo", "€"
    else if (h.includes('importo') || h.includes('costo') || h === '€' || h === 'imp') {
      mapping.importo = i;
      console.log(`✓ Trovato importo a colonna ${i}`);
    }
  }

  console.log('Mapping finale:', mapping);
  return mapping;
}

/**
 * Parse una riga di attività
 */
function parseAttivitaRow(row, columnMapping, dateColumns, dataInizioDefault, rowIndex) {
  // Estrai descrizione
  const descrizione = columnMapping.descrizione >= 0 
    ? String(row[columnMapping.descrizione] || '').trim() 
    : '';

  if (!descrizione) return null;

  // Salta righe di titolo/intestazione
  if (descrizione.toUpperCase().includes('COMUNE') ||
      descrizione.toUpperCase().includes('LOTTO') ||
      descrizione.toUpperCase().includes('LAVORI DI') ||
      descrizione.toUpperCase().includes('ADEGUAMENTO') ||
      descrizione.toUpperCase().includes('COMPLETAMENTO') ||
      descrizione === '-' ||
      descrizione.length > 150 ||
      /^\d+$/.test(descrizione) ||  // Salta righe che sono solo numeri (ID)
      descrizione.toUpperCase() === 'ID') {  // Salta riga header "ID"
    return null;
  }

  // Estrai ID
  const idRaw = columnMapping.id >= 0 
    ? String(row[columnMapping.id] || '').trim() 
    : '';
  const id = idRaw ? idRaw : `ACT_${rowIndex + 1}`;

  // Estrai durata
  let durata = 1;
  if (columnMapping.durata >= 0 && row[columnMapping.durata]) {
    const d = parseInt(row[columnMapping.durata], 10);
    if (!isNaN(d) && d > 0) durata = d;
  }

  // Estrai importo
  let importo = 0;
  if (columnMapping.importo >= 0 && row[columnMapping.importo]) {
    const impStr = String(row[columnMapping.importo]).replace(/[€,\s]/g, '');
    const imp = parseFloat(impStr);
    if (!isNaN(imp)) importo = imp;
  }

  // Trova date dalle colonne Gantt
  let dataInizio = null;
  let dataFine = null;
  let firstActiveIndex = -1;
  let lastActiveIndex = -1;

  for (const col of dateColumns) {
    const cellValue = row[col.index];
    if (cellValue !== null && cellValue !== undefined && String(cellValue).trim() !== '') {
      const strVal = String(cellValue).trim().toLowerCase();
      if (strVal !== '0' && strVal !== '' && strVal !== '-') {
        if (firstActiveIndex === -1) {
          firstActiveIndex = col.index;
          dataInizio = col.date;
        }
        lastActiveIndex = col.index;
        dataFine = col.date;
      }
    }
  }

  // Se non ho date, calcolale dalla durata
  if (!dataInizio && dataInizioDefault) {
    dataInizio = dataInizioDefault;
    const startDate = new Date(dataInizio + 'T12:00:00');
    const endDate = new Date(startDate.getTime() + (durata - 1) * 86400000);
    dataFine = formatToISO(endDate);
  }

  // Salta se non ha dati significativi
  if (!dataInizio && !dataFine && durata <= 1) {
    return null;
  }

  // Determina tipo
  let tipoAttivita = 'task';
  if (durata >= 100) tipoAttivita = 'raggruppamento';
  if (durata <= 1) tipoAttivita = 'milestone';

  return {
    id,
    wbs: idRaw || '',
    wbs_code: idRaw || '',
    livello: 0,
    parent_id: null,
    descrizione,
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
  };
}

/**
 * Genera CSV dalle attività
 */
function generateCSV(attivita) {
  const headers = ['ID', 'DESCRIZIONE', 'DATA_INIZIO', 'DATA_FINE', 'DURATA_GIORNI', 'IMPORTO', 'STATO'];
  const rows = [headers.join(',')];

  for (const att of attivita) {
    const row = [
      att.id,
      `"${att.descrizione.replace(/"/g, '""')}"`,
      att.data_inizio || '',
      att.data_fine || '',
      att.durata_giorni,
      att.importo_previsto,
      att.stato
    ];
    rows.push(row.join(','));
  }

  return rows.join('\n');
}

/**
 * Parse data italiana DD/MM/YYYY
 */
function parseItalianDate(dateStr) {
  if (!dateStr) return null;
  
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!match) return null;

  const [, day, month, year] = match;
  const y = parseInt(year.length === 2 ? (parseInt(year) < 50 ? '20' + year : '19' + year) : year);
  const m = parseInt(month) - 1;
  const d = parseInt(day);

  const date = new Date(y, m, d);
  if (isNaN(date.getTime())) return null;

  return formatToISO(date);
}

/**
 * Formatta data come ISO
 */
function formatToISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default convertExcelToActivities;
