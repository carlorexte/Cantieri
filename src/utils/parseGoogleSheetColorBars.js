import { parseCronoprogrammaSemplice } from './parseCronoprogrammaSemplice';

function parseSheetUrl(url) {
  if (!url) return null;
  const idMatch = String(url).match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch) return null;

  const gidMatch = String(url).match(/[?&]gid=(\d+)/);
  return {
    spreadsheetId: idMatch[1],
    gid: gidMatch ? Number(gidMatch[1]) : null
  };
}

async function fetchPublicSheetAsXlsx(parsed) {
  const exportUrl = `https://docs.google.com/spreadsheets/d/${parsed.spreadsheetId}/export?format=xlsx`;
  const res = await fetch(exportUrl, {
    redirect: 'follow'
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Export XLSX fallito (${res.status}): ${txt.slice(0, 180)}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    const txt = await res.text();
    throw new Error(`Il foglio non e pubblico o richiede accesso Google: ${txt.slice(0, 180)}`);
  }

  return res.arrayBuffer();
}

export async function parseGoogleSheetColorBars(sheetUrl, options = {}) {
  const parsed = parseSheetUrl(sheetUrl);
  if (!parsed) {
    return { success: false, error: 'URL Google Sheet non valido' };
  }

  try {
    const fileBuffer = await fetchPublicSheetAsXlsx(parsed);
    return await parseCronoprogrammaSemplice(fileBuffer, options);
  } catch (error) {
    return {
      success: false,
      error: `Download o parsing fallito: ${error.message}`
    };
  }
}

export default parseGoogleSheetColorBars;
