import * as XLSX from 'xlsx';

/**
 * Legge un file Excel/CSV e lo converte in testo CSV.
 * @param {File} file
 * @returns {Promise<string>}
 */
async function excelToText(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_csv(firstSheet, { blankrows: false });
}

/**
 * Legge un file come stringa base64.
 * @param {File} file
 * @returns {Promise<string>}
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // FileReader restituisce "data:<mime>;base64,<data>" — prendiamo solo i dati
      const result = reader.result;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Analizza le date restituite dall'AI e le converte in oggetti Date.
 * @param {object} rawTask
 * @returns {import('../types/gantt').GanttTask}
 */
function normalizeTask(rawTask, index) {
  const parseDate = (value) => {
    if (!value) return new Date();
    const d = new Date(value);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const startDate = parseDate(rawTask.startDate);
  const endDate = parseDate(rawTask.endDate);
  const duration = typeof rawTask.duration === 'number' && rawTask.duration >= 0
    ? rawTask.duration
    : Math.max(1, Math.round((endDate - startDate) / 86400000));

  return {
    id: `imported-${index}`,
    wbs: String(rawTask.wbs || index + 1),
    name: String(rawTask.name || `Attività ${index + 1}`),
    level: typeof rawTask.level === 'number' ? rawTask.level : 1,
    startDate,
    endDate,
    duration,
    progress: typeof rawTask.progress === 'number'
      ? Math.min(100, Math.max(0, rawTask.progress))
      : 0,
  };
}

/**
 * Importa un cronoprogramma da un file (Excel, CSV o PDF/immagine)
 * tramite l'API Anthropic lato server.
 *
 * @param {File} file
 * @returns {Promise<import('../types/gantt').GanttTask[]>}
 */
export async function importScheduleFromFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const isExcel = ['xlsx', 'xls'].includes(ext);
  const isCsv = ext === 'csv';
  const isPdf = file.type === 'application/pdf' || ext === 'pdf';

  let fileContent;
  let mimeType;

  if (isExcel || isCsv) {
    fileContent = await excelToText(file);
    mimeType = 'text/plain';
  } else if (isPdf) {
    fileContent = await fileToBase64(file);
    mimeType = 'application/pdf';
  } else if (file.type.startsWith('image/')) {
    fileContent = await fileToBase64(file);
    mimeType = file.type;
  } else {
    throw new Error(`Formato non supportato: ${file.type || ext}. Usa Excel (.xlsx, .xls), CSV o PDF.`);
  }

  const response = await fetch('/api/import-gantt-anthropic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileContent, mimeType, fileName: file.name }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: `Errore HTTP ${response.status}` }));
    throw new Error(error.error || `Errore API (${response.status})`);
  }

  const data = await response.json();

  if (!Array.isArray(data.tasks) || data.tasks.length === 0) {
    throw new Error('Nessuna attività trovata nel documento. Verifica che il file contenga un cronoprogramma.');
  }

  return data.tasks.map((task, i) => normalizeTask(task, i));
}
