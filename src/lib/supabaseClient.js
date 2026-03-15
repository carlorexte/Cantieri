/**
 * Supabase Client Diretto
 * 
 * Configurazione per connettersi direttamente a Supabase
 * senza passare per Base44
 */

import { createClient } from '@supabase/supabase-js';
import { createPlanningActivity, planningActivitiesToDb } from '@/utils/planningModel';

const OPTIONAL_ATTIVITA_COLUMNS = [
  'parent_id',
  'vincolo_tipo',
  'vincolo_data',
  'baseline_start_date',
  'baseline_end_date'
];

function isMissingColumnError(error) {
  const message = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
  return (
    error?.code === 'PGRST204' ||
    error?.code === '42703' ||
    message.includes('column') && message.includes('does not exist') ||
    message.includes('could not find the') ||
    message.includes('schema cache')
  );
}

function stripUnsupportedAttivitaColumns(payload) {
  if (Array.isArray(payload)) {
    return payload.map((item) => stripUnsupportedAttivitaColumns(item));
  }

  const next = { ...(payload || {}) };
  for (const column of OPTIONAL_ATTIVITA_COLUMNS) {
    delete next[column];
  }
  return next;
}

async function retryWithoutOptionalAttivitaColumns(operation, payload) {
  try {
    return await operation(payload);
  } catch (error) {
    if (!isMissingColumnError(error)) throw error;
    return operation(stripUnsupportedAttivitaColumns(payload));
  }
}

// Variabili d'ambiente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

// Crea client Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
    },
  },
});

// Funzioni utility per le entità

export const supabaseDB = {
  // ==================== CANTIERI ====================
  cantieri: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('cantieri')
        .select('*')
        .order('created_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },

    getById: async (id) => {
      const { data, error } = await supabase
        .from('cantieri')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },

    create: async (cantiere) => {
      const { data, error } = await supabase
        .from('cantieri')
        .insert([cantiere])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },

    update: async (id, updates) => {
      const { data, error } = await supabase
        .from('cantieri')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },

    delete: async (id) => {
      const { error } = await supabase
        .from('cantieri')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    }
  },

  // ==================== ATTIVITÀ ====================
  attivita: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('attivita')
        .select('*')
        .order('wbs', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },

    getByCantiere: async (cantiereId) => {
      const { data, error } = await supabase
        .from('attivita')
        .select('*')
        .eq('cantiere_id', cantiereId)
        .order('wbs', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },

    create: async (attivita) => {
      const executeInsert = async (payload) => {
        const { data, error } = await supabase
          .from('attivita')
          .insert([payload])
          .select()
          .single();
      
        if (error) throw error;
        return data;
      };

      return retryWithoutOptionalAttivitaColumns(executeInsert, attivita);
    },

    createBatch: async (attivitaList) => {
      const executeInsert = async (payload) => {
        const { data, error } = await supabase
          .from('attivita')
          .insert(payload)
          .select();
        
        if (error) throw error;
        return data || [];
      };

      return retryWithoutOptionalAttivitaColumns(executeInsert, attivitaList);
    },

    update: async (id, updates) => {
      const executeUpdate = async (payload) => {
        const { data, error } = await supabase
          .from('attivita')
          .update(payload)
          .eq('id', id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      };

      return retryWithoutOptionalAttivitaColumns(executeUpdate, updates);
    },

    delete: async (id) => {
      const { error } = await supabase
        .from('attivita')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    },

    deleteByCantiere: async (cantiereId) => {
      const { error } = await supabase
        .from('attivita')
        .delete()
        .eq('cantiere_id', cantiereId);
      
      if (error) throw error;
      return true;
    }
  },

  // ==================== IMPRESE ====================
  imprese: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('imprese')
        .select('*')
        .order('denominazione', { ascending: true });
      
      if (error) {
        const isMissingRelation =
          error.code === 'PGRST205' ||
          error.code === '42P01' ||
          error.status === 404 ||
          /imprese/i.test(error.message || '');

        if (isMissingRelation) {
          console.warn('Tabella "imprese" non disponibile su Supabase. Continuo con lista vuota.');
          return [];
        }
        throw error;
      }
      return data || [];
    },

    create: async (impresa) => {
      const { data, error } = await supabase
        .from('imprese')
        .insert([impresa])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },

    update: async (id, updates) => {
      const { data, error } = await supabase
        .from('imprese')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },

    delete: async (id) => {
      const { error } = await supabase
        .from('imprese')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    }
  },

  // ==================== SAL (Stati Avanzamento Lavori) ====================
  sals: {
    getByCantiere: async (cantiereId) => {
      try {
        const { data, error } = await supabase
          .from('sal')
          .select('*')
          .eq('cantiere_id', cantiereId)
          .order('data_sal', { ascending: true });

        if (error) {
          // Tabella SAL potrebbe non esistere ancora
          console.warn('SAL non disponibili (tabella non trovata o vuota):', error.message);
          return [];
        }
        return data || [];
      } catch (err) {
        console.warn('SAL non disponibili:', err.message);
        return [];
      }
    }
  },

  // ==================== IMPORT CRONOPROGRAMMA ====================

  // Funzione helper per validare date delle attività
  validateActivityDates: (attivita) => {
    const errors = [];
    const warnings = [];

    attivita.forEach((att, index) => {
      // Valida formato ISO
      if (att.data_inizio && !/^\d{4}-\d{2}-\d{2}$/.test(att.data_inizio)) {
        errors.push(`Riga ${index + 1}: data_inizio formato invalido: ${att.data_inizio}`);
      }
      if (att.data_fine && !/^\d{4}-\d{2}-\d{2}$/.test(att.data_fine)) {
        errors.push(`Riga ${index + 1}: data_fine formato invalido: ${att.data_fine}`);
      }

      // Valida data_fine >= data_inizio
      if (att.data_inizio && att.data_fine) {
        const start = new Date(att.data_inizio);
        const end = new Date(att.data_fine);
        if (end < start) {
          errors.push(`Riga ${index + 1} (${att.descrizione}): data_fine precede data_inizio`);
        }
      }

      // Warning per date mancanti (non bloccante)
      if (!att.data_inizio || !att.data_fine) {
        warnings.push(`Riga ${index + 1} (${att.descrizione}): date mancanti`);
      }
    });

    return { valid: errors.length === 0, errors, warnings };
  },

  importCronoprogramma: async (cantiereId, attivitaList) => {
    let attivitaDaInserire = []; // Dichiaro fuori dal try per usarla nel catch

    try {
      // 1. Verifica che il cantiere esista
      const cantiere = await supabaseDB.cantieri.getById(cantiereId);
      if (!cantiere) {
        throw new Error('Cantiere non trovato');
      }

      // 2. Prepara le attività con solo le colonne che esistono nel DB
      await supabaseDB.attivita.deleteByCantiere(cantiereId);

      const planningActivities = attivitaList.map((att) => createPlanningActivity(att, 'supabase-import'));
      const dbActivities = planningActivitiesToDb(planningActivities);

      attivitaDaInserire = dbActivities.map(att => ({
        cantiere_id: cantiereId,
        wbs: att.wbs || '',
        // parent_id: att.parent_id || null, // TODO: Aggiungere colonna parent_id al database
        descrizione: att.descrizione,
        tipo_attivita: att.tipo_attivita || 'task',
        durata_giorni: att.durata_giorni || 1,
        data_inizio: att.data_inizio,
        data_fine: att.data_fine,
        importo_previsto: att.importo_previsto || 0,
        percentuale_completamento: att.percentuale_completamento || 0,
        stato: att.stato || 'pianificata',
        predecessori: att.predecessori || [],
        colore: att.colore || '#3b82f6',
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString()
      }));

      // 3. Valida date prima di inserire
      const validation = supabaseDB.validateActivityDates(attivitaDaInserire);

      if (!validation.valid) {
        return {
          success: false,
          message: 'Validazione date fallita',
          attivita_importate: 0,
          attivita_ids: [],
          errori: validation.errors
        };
      }

      if (validation.warnings.length > 0) {
        console.warn('Import con warning:', validation.warnings);
      }

      // 4. Inserisci in batch
      console.log(`[Import] Tentativo inserimento ${attivitaDaInserire.length} attività`);
      console.log('[Import] Sample attività (prima):', JSON.stringify(attivitaDaInserire[0], null, 2));

      const result = await supabaseDB.attivita.createBatch(attivitaDaInserire);

      console.log(`[Import] ✅ Inserite ${result.length} attività con successo`);

      return {
        success: true,
        message: `Importate ${result.length} attività`,
        attivita_importate: result.length,
        attivita_ids: result.map(a => a.id),
        errori: []
      };
    } catch (error) {
      console.error('[Import] ❌ Errore import cronoprogramma:', error);
      console.error('[Import] Dettagli errore:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });

      if (attivitaDaInserire.length > 0) {
        console.error('[Import] Sample attività che ha causato errore:', JSON.stringify(attivitaDaInserire[0], null, 2));
      }

      return {
        success: false,
        message: error.message || 'Errore sconosciuto durante importazione',
        attivita_importate: 0,
        attivita_ids: [],
        errori: [{ riga: 0, errore: error.message || 'Errore sconosciuto' }]
      };
    }
  }
};

export default supabase;
