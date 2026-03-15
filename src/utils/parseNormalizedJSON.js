/**
 * Parser per file JSON normalizzati
 * Legge i file prodotti dallo script normalize-cronoprogramma.js
 */

export async function parseNormalizedJSON(fileOrBuffer, options = {}) {
  const logs = [];

  try {
    let jsonData;

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

    // Valida struttura
    if (!jsonData.success || !Array.isArray(jsonData.attivita)) {
      throw new Error('Formato JSON non valido: manca success o attivita');
    }

    logs.push(`✓ ${jsonData.attivita.length} attività trovate`);

    const metadata = jsonData.metadata || {};
    logs.push(`✓ Copertura date: ${metadata.dateCoverage || 0}%`);

    return {
      success: true,
      attivita: jsonData.attivita,
      metadata: {
        ...metadata,
        metodo: 'normalized_json'
      },
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
