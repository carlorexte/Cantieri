import * as XLSX from 'xlsx';

/**
 * Utility per il parsing del Computo Metrico da file Excel (XLSX/XLS).
 * Cerca di mappare le colonne comuni ai campi del database voci_computo.
 */
export const parseComputoMetrico = async (fileBuffer) => {
  try {
    const workbook = XLSX.read(fileBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Converte in JSON array di array per un'analisi più granulare rispetto a codici/intestazioni
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (rows.length < 2) {
      throw new Error("Il file sembra vuoto o non contiene abbastanza dati.");
    }

    // Identificazione intestazioni
    // Cerchiamo la riga che contiene parole chiave tipiche dei computi
    let headerRowIndex = 0;
    let mapping = {
      codice: -1,
      descrizione: -1,
      um: -1,
      quantita: -1,
      prezzo: -1,
      categoria: -1
    };

    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const row = rows[i];
      if (!row || row.length < 2) continue;
      
      const rowText = row.map(cell => String(cell || '').toLowerCase());
      
      const foundCodice = rowText.findIndex(t => t.includes('codice') || t.includes('art.') || t.includes('voce'));
      const foundDesc = rowText.findIndex(t => t.includes('descrizione') || t.includes('designazione'));
      const foundUM = rowText.findIndex(t => t.includes('u.m.') || t.includes('misura') || t.includes('unità'));
      const foundQty = rowText.findIndex(t => t.includes('quantità') || t.includes('q.tà') || t.includes('volume'));
      const foundPrezzo = rowText.findIndex(t => t.includes('prezzo') || t.includes('unitario') || t.includes('elenco'));
      const foundCat = rowText.findIndex(t => t.includes('categoria') || t.includes('capitolo') || t.includes('supercategoria'));

      if (foundDesc !== -1 && (foundQty !== -1 || foundPrezzo !== -1)) {
        headerRowIndex = i;
        mapping = {
          codice: foundCodice,
          descrizione: foundDesc,
          um: foundUM,
          quantita: foundQty,
          prezzo: foundPrezzo,
          categoria: foundCat
        };
        break;
      }
    }

    // Se non troviamo intestazioni chiare, usiamo un mapping posizionale di default (0, 1, 2...)
    if (mapping.descrizione === -1) {
      mapping = { codice: 0, descrizione: 1, um: 2, quantita: 3, prezzo: 4, categoria: -1 };
      headerRowIndex = 0;
    }

    const result = [];
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 2) continue;

      const descrizione = row[mapping.descrizione];
      if (!descrizione || String(descrizione).trim().length < 3) continue;

      const voce = {
        codice_elenco_prezzi: row[mapping.codice] ? String(row[mapping.codice]).trim() : '',
        descrizione: String(descrizione).trim(),
        unita_misura: row[mapping.um] ? String(row[mapping.um]).trim() : '',
        quantita_prevista: parseNumber(row[mapping.quantita]),
        prezzo_unitario: parseNumber(row[mapping.prezzo]),
        categoria: mapping.categoria !== -1 && row[mapping.categoria] ? String(row[mapping.categoria]).trim() : 'Generale',
        importo_totale: 0 // Verrà calcolato dal DB o dal frontend
      };
      
      voce.importo_totale = voce.quantita_prevista * voce.prezzo_unitario;

      result.push(voce);
    }

    return {
      success: true,
      items: result,
      mapping_info: mapping,
      total_items: result.length
    };
  } catch (error) {
    console.error("Errore parsing computo:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

const parseNumber = (val) => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  
  // Gestione stringhe con virgola italiana (es "1.234,56")
  let clean = String(val).replace(/\s+/g, '');
  if (clean.includes(',') && clean.includes('.')) {
    // Supponiamo formato 1.234,56
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (clean.includes(',')) {
    clean = clean.replace(',', '.');
  }
  
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
};
