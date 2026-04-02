/**
 * Parser per file JSON normalizzati
 * Legge i file prodotti dallo script normalize-cronoprogramma.js
 */

export async function parseNormalizedJSON(fileOrBuffer, options = {}) {
  const logs = [];

  try {
    let jsonData;
    let canonicalPayload = null;

    // Se è un File object (dal browser)
    if (fileOrBuffer instanceof File) {
      const text = await fileOrBuffer.text();
      jsonData = JSON.parse(text);
    }
    // Se è un buffer o ArrayBuffer
    else if (fileOrBuffer instanceof ArrayBuffer || Buffer.isBuffer(fileOrBuffer)) {
      const text = new TextDecoder().decode(fileOrBuffer);
      jsonData = JSON.parse(text);
    }
    // Se è già un oggetto
    else if (typeof fileOrBuffer === 'object') {
      jsonData = fileOrBuffer;
    }
    // Se è una stringa JSON
    else if (typeof fileOrBuffer === 'string') {
      jsonData = JSON.parse(fileOrBuffer);
    }
    else {
      throw new Error('Formato input non supportato');
    }

    logs.push('✓ File JSON caricato');

    let attivita = [];
    let metadata = jsonData.metadata || {};

    if (jsonData.schema_version && Array.isArray(jsonData.activities)) {
      canonicalPayload = jsonData;
      attivita = [
        ...(jsonData.macro_areas || []).map((item) => ({
          id: item.id,
          wbs: item.code || '',
          parent_id: item.parent_id || null,
          descrizione: item.name,
          tipo_attivita: 'raggruppamento',
          data_inizio: item.start_date,
          data_fine: item.end_date,
          durata_giorni: item.duration_days,
          colore: item.color
        })),
        ...jsonData.activities.map((item) => ({
          id: item.id,
          wbs: item.wbs || '',
          parent_id: item.parent_id || null,
          descrizione: item.description,
          tipo_attivita: item.type || 'task',
          data_inizio: item.start_date,
          data_fine: item.end_date,
          durata_giorni: item.duration_days,
          predecessori: item.predecessors || [],
          percentuale_completamento: item.progress || 0,
          importo_previsto: item.amount || 0,
          stato: item.status || 'pianificata',
          colore: item.color
        }))
      ];
      metadata = {
        ...metadata,
        metodo: 'normalized_json',
        schema_version: jsonData.schema_version,
        canonical: true
      };
    } else if (jsonData.success && Array.isArray(jsonData.attivita)) {
      attivita = jsonData.attivita;
      logs.push(`✓ ${jsonData.attivita.length} attività trovate`);
      logs.push(`✓ Copertura date: ${metadata.dateCoverage || 0}%`);
      metadata = {
        ...metadata,
        metodo: 'normalized_json'
      };
    } else {
      throw new Error('Formato JSON non valido: atteso schema canonico o payload con attivita');
    }

    logs.push(`✓ ${attivita.length} attività trovate`);

    return {
      success: true,
      attivita,
      metadata,
      canonicalPayload,
      logs
    };

  } catch (error) {
    console.error('[parseNormalizedJSON] Errore:', error);

    return {
      success: false,
      error: error.message,
      attivita: [],
      logs: [...logs, `✗ Errore: ${error.message}`],
      metadata: {
        metodo: 'normalized_json'
      }
    };
  }
}

export default parseNormalizedJSON;
