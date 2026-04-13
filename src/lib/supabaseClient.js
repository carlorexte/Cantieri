/**
 * Supabase Client Diretto
 * 
 * Configurazione per connettersi direttamente a Supabase
 * senza passare per backendClient
 */

import { createClient } from '@supabase/supabase-js';
import { createPlanningActivity, planningActivitiesToDb } from '@/utils/planningModel';

// Colonne che potrebbero non esistere in tutte le tabelle attivita
const OPTIONAL_ATTIVITA_COLUMNS = [
  'parent_id',
  'vincolo_tipo',
  'vincolo_data',
  'baseline_start_date',
  'baseline_end_date',
  'livello',
  'note',
  'gruppo_fase',
  'colore',
  'categoria',
  'predecessori',
  'responsabile',
  'assegnatario_tipo',
  'assegnatario_id',
  'percentuale_completamento',
  'importo_eseguito',
  'wbs_code'
];

// Colonne OBBLIGATORIE per attivita (queste devono esistere SEMPRE)
const REQUIRED_ATTIVITA_COLUMNS = [
  'id',
  'cantiere_id',
  'wbs',
  'descrizione',
  'tipo_attivita',
  'data_inizio',
  'data_fine',
  'durata_giorni',
  'importo_previsto',
  'stato',
  'created_date',
  'updated_date'
];

const UUID_FIELD_NAMES = new Set([
  'id',
  'referente_impresa_id',
  'responsabile_sicurezza_id',
  'cantiere_id',
  'impresa_id',
  'socio_id',
  'subappalto_id',
  'responsabile_id',
  'assegnatario_id',
  'sub_user_id',
  'societa_intestataria_id',
  'attivita_collegata_id',
  'parent_id',
  'responsabile_amministrativo_id',
  'direttore_lavori_id',
  'responsabile_unico_procedimento_id'
]);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function sanitizeRecord(payload, { dropEmptyId = false } = {}) {
  const next = {};

  Object.entries(payload || {}).forEach(([key, value]) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();

      if (trimmed === '') {
        if (dropEmptyId && key === 'id') {
          return;
        }

        next[key] = null;
        return;
      }

      if (UUID_FIELD_NAMES.has(key) && !UUID_PATTERN.test(trimmed)) {
        next[key] = null;
        return;
      }

      next[key] = trimmed;
      return;
    }

    next[key] = value;
  });

  if (dropEmptyId && !next.id) {
    delete next.id;
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
const cleanEnv = (value) => (value || '').replace(/\\r|\\n/g, '').trim();
const supabaseUrl = cleanEnv(import.meta.env.VITE_SUPABASE_URL) || 'https://YOUR_PROJECT.supabase.co';
const supabaseAnonKey = cleanEnv(import.meta.env.VITE_SUPABASE_ANON_KEY) || 'YOUR_ANON_KEY';

if (import.meta.env.DEV) {
  console.log('[Supabase] URL:', supabaseUrl);
}

// Crea client Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    // We handle implicit hash tokens manually in AuthContext.
    // Disabling auto-detect avoids auth-js parsing errors in local redirects.
    detectSessionInUrl: false,
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
      // Sanitizza i campi UUID: stringa vuota → null
      const sanitized = {};
      Object.entries(cantiere || {}).forEach(([key, value]) => {
        if (typeof value === 'string') {
          const trimmed = value.trim();
          if (trimmed === '') {
            sanitized[key] = null;
            return;
          }
          if (UUID_FIELD_NAMES.has(key) && trimmed && !UUID_PATTERN.test(trimmed)) {
            sanitized[key] = null;
            return;
          }
          sanitized[key] = trimmed;
          return;
        }
        sanitized[key] = value;
      });

      if ('soglia_sal' in sanitized) {
        if (typeof window !== 'undefined' && sanitized.soglia_sal) {
          window.localStorage.setItem(`soglia_sal_new`, sanitized.soglia_sal);
        }
        delete sanitized.soglia_sal;
      }

      const { data, error } = await supabase
        .from('cantieri')
        .insert([sanitized])
        .select()
        .single();

      if (error) throw error;
      if (typeof window !== 'undefined') window.localStorage.removeItem(`soglia_sal_new`);
      return data;
    },

    update: async (id, updates) => {
      // Sanitizza i campi UUID: stringa vuota → null
      const sanitized = {};
      Object.entries(updates || {}).forEach(([key, value]) => {
        if (typeof value === 'string') {
          const trimmed = value.trim();
          if (trimmed === '') {
            sanitized[key] = null;
            return;
          }
          if (UUID_FIELD_NAMES.has(key) && trimmed && !UUID_PATTERN.test(trimmed)) {
            sanitized[key] = null;
            return;
          }
          sanitized[key] = trimmed;
          return;
        }
        sanitized[key] = value;
      });

      if ('soglia_sal' in sanitized) {
        if (typeof window !== 'undefined' && sanitized.soglia_sal) {
          window.localStorage.setItem(`soglia_sal_${id}`, sanitized.soglia_sal);
        }
        delete sanitized.soglia_sal;
      }

      const { data, error } = await supabase
        .from('cantieri')
        .update(sanitized)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    delete: async (id) => {
      // Ensure attivita linked to the cantiere are removed first to avoid FK conflicts.
      try {
        await supabaseDB.attivita.deleteByCantiere(id);
      } catch (cleanupError) {
        console.warn("Unable to cascade delete attivita for cantiere:", cleanupError.message);
      }

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
        .order('ragione_sociale', { ascending: true });

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
      console.log('supabaseDB.imprese.create - payload originale:', impresa);

      const payload = sanitizeRecord(impresa, { dropEmptyId: true });

      // Sincronizza denominazione (NOT NULL) con ragione_sociale
      payload.denominazione = payload.ragione_sociale || payload.denominazione || 'Nuova Impresa';
      payload.created_date = payload.created_date || new Date().toISOString();
      payload.updated_date = new Date().toISOString();

      console.log('supabaseDB.imprese.create - payload sanitizzato:', payload);

      const { data, error } = await supabase
        .from('imprese')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error('supabaseDB.imprese.create - Errore:', error);
        throw error;
      }
      return data;
    },

    update: async (id, updates) => {
      console.log(`supabaseDB.imprese.update - id: ${id}, updates:`, updates);

      const payload = sanitizeRecord(updates);

      if (payload.ragione_sociale || payload.denominazione) {
        payload.denominazione = payload.ragione_sociale || payload.denominazione;
      }
      payload.updated_date = new Date().toISOString();

      console.log('supabaseDB.imprese.update - payload sanitizzato:', payload);

      const { data, error } = await supabase
        .from('imprese')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('supabaseDB.imprese.update - Errore:', error);
        throw error;
      }
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
    getAll: async () => {
      const { data, error } = await supabase.from('sal').select('*').order('data_sal', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    getByCantiere: async (cantiereId) => {
      const { data, error } = await supabase.from('sal').select('*').eq('cantiere_id', cantiereId).order('data_sal', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    create: async (sal) => {
      const { data, error } = await supabase.from('sal').insert([{ ...sal, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]).select().single();
      if (error) throw error;
      return data;
    },
    update: async (id, updates) => {
      const { data, error } = await supabase.from('sal').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    delete: async (id) => {
      const { error } = await supabase.from('sal').delete().eq('id', id);
      if (error) throw error;
      return true;
    },
    filter: async (filters) => {
      let q = supabase.from('sal').select('*');
      if (filters) Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') q = q.eq(k, v); });
      const { data, error } = await q.order('data_sal', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  },

  // ==================== COSTI ====================
  costi: {
    getAll: async () => {
      const { data, error } = await supabase.from('costi').select('*').order('data_sostenimento', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    create: async (costo) => {
      const { data, error } = await supabase.from('costi').insert([{ ...costo, created_date: new Date().toISOString(), updated_date: new Date().toISOString() }]).select().single();
      if (error) throw error;
      return data;
    },
    update: async (id, updates) => {
      const { data, error } = await supabase.from('costi').update({ ...updates, updated_date: new Date().toISOString() }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    delete: async (id) => {
      const { error } = await supabase.from('costi').delete().eq('id', id);
      if (error) throw error;
      return true;
    },
    filter: async (filters) => {
      let q = supabase.from('costi').select('*');
      if (filters) Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') q = q.eq(k, v); });
      const { data, error } = await q.order('data_sostenimento', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  },

  // ==================== DOCUMENTI ====================
  documenti: {
    getAll: async () => {
      const { data, error } = await supabase.from('documenti').select('*').order('created_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    create: async (doc) => {
      const { data, error } = await supabase.from('documenti').insert([{ ...doc, created_date: new Date().toISOString(), updated_date: new Date().toISOString() }]).select().single();
      if (error) throw error;
      return data;
    },
    update: async (id, updates) => {
      const { data, error } = await supabase.from('documenti').update({ ...updates, updated_date: new Date().toISOString() }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    delete: async (id) => {
      const { error } = await supabase.from('documenti').delete().eq('id', id);
      if (error) throw error;
      return true;
    },
    filter: async (filters) => {
      let q = supabase.from('documenti').select('*');
      if (filters) Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') q = q.eq(k, v); });
      const { data, error } = await q.order('created_date', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  },

  // ==================== ATTIVITÀ INTERNE ====================
  attivitaInterne: {
    getAll: async () => {
      const { data, error } = await supabase.from('attivita_interne').select('*').order('created_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    create: async (att) => {
      const { data, error } = await supabase.from('attivita_interne').insert([{ ...att, created_date: new Date().toISOString(), updated_date: new Date().toISOString() }]).select().single();
      if (error) throw error;
      return data;
    },
    update: async (id, updates) => {
      const { data, error } = await supabase.from('attivita_interne').update({ ...updates, updated_date: new Date().toISOString() }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    delete: async (id) => {
      const { error } = await supabase.from('attivita_interne').delete().eq('id', id);
      if (error) throw error;
      return true;
    },
    filter: async (filters) => {
      let q = supabase.from('attivita_interne').select('*');
      if (filters) Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') q = q.eq(k, v); });
      const { data, error } = await q.order('created_date', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  },

  // ==================== ORDINI MATERIALE ====================
  ordiniMateriale: {
    getAll: async () => {
      const { data, error } = await supabase.from('ordini_materiale').select('*').order('created_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    uploadFile: async (cantiereId, file) => {
      const ext = file.name.split('.').pop();
      const fileName = `${cantiereId || 'generale'}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('ordini-allegati').upload(fileName, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('ordini-allegati').getPublicUrl(fileName);
      return publicUrl;
    },
    create: async (ord) => {
      const { data, error } = await supabase.from('ordini_materiale').insert([{ ...ord, created_date: new Date().toISOString(), updated_date: new Date().toISOString() }]).select().single();
      if (error) throw error;
      return data;
    },
    update: async (id, updates) => {
      const { data, error } = await supabase.from('ordini_materiale').update({ ...updates, updated_date: new Date().toISOString() }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    delete: async (id) => {
      const { error } = await supabase.from('ordini_materiale').delete().eq('id', id);
      if (error) throw error;
      return true;
    },
    filter: async (filters) => {
      let q = supabase.from('ordini_materiale').select('*');
      if (filters) Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') q = q.eq(k, v); });
      const { data, error } = await q.order('created_date', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  },

  // ==================== PERSONE ESTERNE ====================
  personeEsterne: {
    getAll: async () => {
      const { data, error } = await supabase.from('persone_esterne').select('*').order('cognome', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    create: async (p) => {
      const { data, error } = await supabase.from('persone_esterne').insert([{ ...p, created_date: new Date().toISOString(), updated_date: new Date().toISOString() }]).select().single();
      if (error) throw error;
      return data;
    },
    update: async (id, updates) => {
      const { data, error } = await supabase.from('persone_esterne').update({ ...updates, updated_date: new Date().toISOString() }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    delete: async (id) => {
      const { error } = await supabase.from('persone_esterne').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
  },

  // ==================== SUBAPPALTI ====================
  subappalti: {
    getAll: async () => {
      const { data, error } = await supabase.from('subappalto').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    create: async (sub) => {
      const { data, error } = await supabase.from('subappalto').insert([{ ...sub, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]).select().single();
      if (error) throw error;
      return data;
    },
    update: async (id, updates) => {
      const { data, error } = await supabase.from('subappalto').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    delete: async (id) => {
      const { error } = await supabase.from('subappalto').delete().eq('id', id);
      if (error) throw error;
      return true;
    },
    filter: async (filters) => {
      let q = supabase.from('subappalto').select('*');
      if (filters) Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') q = q.eq(k, v); });
      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  },

  // ==================== SOCI CONSORZIO ====================
  sociConsorzio: {
    getAll: async () => {
      const { data, error } = await supabase.from('soci_consorzio').select('*').order('ragione_sociale', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    create: async (socio) => {
      const { data, error } = await supabase.from('soci_consorzio').insert([{ ...socio, created_date: new Date().toISOString(), updated_date: new Date().toISOString() }]).select().single();
      if (error) throw error;
      return data;
    },
    update: async (id, updates) => {
      const { data, error } = await supabase.from('soci_consorzio').update({ ...updates, updated_date: new Date().toISOString() }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    delete: async (id) => {
      const { error } = await supabase.from('soci_consorzio').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
  },

  // ==================== SAL SOCIO ====================
  salSocio: {
    getAll: async () => {
      const { data, error } = await supabase.from('sal_socio').select('*').order('data_sal', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    create: async (s) => {
      const { data, error } = await supabase.from('sal_socio').insert([{ ...s, created_date: new Date().toISOString(), updated_date: new Date().toISOString() }]).select().single();
      if (error) throw error;
      return data;
    },
    update: async (id, updates) => {
      const { data, error } = await supabase.from('sal_socio').update({ ...updates, updated_date: new Date().toISOString() }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    delete: async (id) => {
      const { error } = await supabase.from('sal_socio').delete().eq('id', id);
      if (error) throw error;
      return true;
    },
    filter: async (filters) => {
      let q = supabase.from('sal_socio').select('*');
      if (filters) Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') q = q.eq(k, v); });
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    }
  },

  // ==================== SAL SUBAPPALTO ====================
  salSubappalto: {
    getAll: async () => {
      const { data, error } = await supabase.from('sal_subappalto').select('*').order('data_sal', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    create: async (s) => {
      const { data, error } = await supabase.from('sal_subappalto').insert([{ ...s, created_date: new Date().toISOString(), updated_date: new Date().toISOString() }]).select().single();
      if (error) throw error;
      return data;
    },
    update: async (id, updates) => {
      const { data, error } = await supabase.from('sal_subappalto').update({ ...updates, updated_date: new Date().toISOString() }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    delete: async (id) => {
      const { error } = await supabase.from('sal_subappalto').delete().eq('id', id);
      if (error) throw error;
      return true;
    },
    filter: async (filters) => {
      let q = supabase.from('sal_subappalto').select('*');
      if (filters) Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') q = q.eq(k, v); });
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    }
  },

  // ==================== COMPUTO METRICO ====================
  vociComputo: {
    getAll: async () => {
      const { data, error } = await supabase.from('voci_computo').select('*').order('codice_elenco_prezzi', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    getByCantiere: async (cantiereId) => {
      const { data, error } = await supabase.from('voci_computo').select('*').eq('cantiere_id', cantiereId).order('codice_elenco_prezzi', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    createBatch: async (items) => {
      const { data, error } = await supabase.from('voci_computo').insert(items).select();
      if (error) throw error;
      return data || [];
    },
    update: async (id, updates) => {
      const { data, error } = await supabase.from('voci_computo').update({ ...updates, updated_date: new Date().toISOString() }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    delete: async (id) => {
      const { error } = await supabase.from('voci_computo').delete().eq('id', id);
      if (error) throw error;
      return true;
    },
    filter: async (filters) => {
      let q = supabase.from('voci_computo').select('*');
      if (filters) Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') q = q.eq(k, v); });
      const { data, error } = await q.order('codice_elenco_prezzi', { ascending: true });
      if (error) throw error;
      return data || [];
    }
  },

  // ==================== COLLEGAMENTO GANTT-COMPUTO ====================
  attivitaVociComputo: {
    getByAttivita: async (attivitaId) => {
      const { data, error } = await supabase.from('attivita_voci_computo').select('*, voci_computo(*)').eq('attivita_id', attivitaId);
      if (error) throw error;
      return data || [];
    },
    getByCantiere: async (cantiereId) => {
      // Nota: richiede join o filtro complesso se non c'è cantiere_id in attivita_voci_computo.
      // Per semplicità passiamo per attivita
      const { data, error } = await supabase.from('attivita_voci_computo').select('*, attivita!inner(cantiere_id)').eq('attivita.cantiere_id', cantiereId);
      if (error) throw error;
      return data || [];
    },
    link: async (attivitaId, voceComputoId, quantitaAllocata) => {
      const { data, error } = await supabase.from('attivita_voci_computo').insert([{ attivita_id: attivitaId, voce_computo_id: voceComputoId, quantita_allocata: quantitaAllocata }]).select().single();
      if (error) throw error;
      return data;
    },
    unlink: async (id) => {
      const { error } = await supabase.from('attivita_voci_computo').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
  },

  // ==================== LIBRETTO MISURE ====================
  librettoMisure: {
    getByCantiere: async (cantiereId) => {
      const { data, error } = await supabase.from('libretto_misure').select('*, voci_computo(*)').eq('cantiere_id', cantiereId).order('data_rilevazione', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    create: async (misura) => {
      const { data, error } = await supabase.from('libretto_misure').insert([{ ...misura, created_date: new Date().toISOString(), updated_date: new Date().toISOString() }]).select().single();
      if (error) throw error;
      return data;
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
      const importedIdMap = new Map(
        dbActivities.map((att) => {
          const sourceId = att.id || att.wbs || crypto.randomUUID();
          const persistentId = UUID_PATTERN.test(String(sourceId || '')) ? String(sourceId) : crypto.randomUUID();
          return [sourceId, persistentId];
        })
      );

      attivitaDaInserire = dbActivities.map(att => ({
        id: importedIdMap.get(att.id || att.wbs) || crypto.randomUUID(),
        cantiere_id: cantiereId,
        wbs: att.wbs || '',
        parent_id: att.parent_id ? (importedIdMap.get(att.parent_id) || null) : null,
        descrizione: att.descrizione,
        tipo_attivita: att.tipo_attivita || 'task',
        durata_giorni: att.durata_giorni || 1,
        data_inizio: att.data_inizio,
        data_fine: att.data_fine,
        importo_previsto: att.importo_previsto || 0,
        percentuale_completamento: att.percentuale_completamento || 0,
        stato: att.stato || 'pianificata',
        predecessori: (att.predecessori || []).map((dependency) => ({
          ...dependency,
          attivita_id: importedIdMap.get(dependency.attivita_id) || dependency.attivita_id
        })),
        colore: att.colore || '#3b82f6',
        note: att.note || '',
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
  },

  // ==================== PERMESSI CANTIERE PER UTENTE ====================
  permessiCantiere: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('cantiere_permessi_utente')
        .select('*');
      if (error) throw error;
      return data || [];
    },
    getByCantiere: async (cantiereId) => {
      const { data, error } = await supabase
        .from('cantiere_permessi_utente')
        .select('*')
        .eq('cantiere_id', cantiereId);
      if (error) throw error;
      return data || [];
    },
    upsert: async (utenteId, cantiereId, permessi) => {
      const { data, error } = await supabase
        .from('cantiere_permessi_utente')
        .upsert([{ utente_id: utenteId, cantiere_id: cantiereId, permessi }], { onConflict: 'utente_id,cantiere_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    delete: async (utenteId, cantiereId) => {
      const { error } = await supabase
        .from('cantiere_permessi_utente')
        .delete()
        .eq('utente_id', utenteId)
        .eq('cantiere_id', cantiereId);
      if (error) throw error;
      return true;
    }
  },

  // ==================== SEGNALAZIONI ====================
  segnalazioni: {
    getByCantiere: async (cantiereId) => {
      const { data, error } = await supabase
        .from('segnalazioni')
        .select('*, autore:profiles(id, full_name, email), attivita:attivita(id, descrizione, wbs)')
        .eq('cantiere_id', cantiereId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    create: async (s) => {
      const { data, error } = await supabase
        .from('segnalazioni')
        .insert([{ ...s, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    update: async (id, updates) => {
      const { data, error } = await supabase
        .from('segnalazioni')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    delete: async (id) => {
      const { error } = await supabase.from('segnalazioni').delete().eq('id', id);
      if (error) throw error;
      return true;
    },
    uploadFoto: async (cantiereId, file) => {
      const ext = file.name.split('.').pop();
      const fileName = `${cantiereId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('segnalazioni').upload(fileName, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('segnalazioni').getPublicUrl(fileName);
      return publicUrl;
    }
  },

  // ==================== RBAC ====================
  rbac: {
    getMyProfile: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*, ruolo:ruoli(id, nome, descrizione, permessi, is_system)')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },

    getMyTeams: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from('team_members')
        .select('ruolo_id, team:teams(id, nome, colore, team_cantieri(cantiere_id))')
        .eq('profile_id', user.id);
      if (error) throw error;
      return data || [];
    },

    getAllProfiles: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, ruolo:ruoli(id, nome)')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },

    updateProfile: async (id, updates) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    getAllRuoli: async () => {
      const { data, error } = await supabase
        .from('ruoli')
        .select('*')
        .order('is_system', { ascending: false })
        .order('nome');
      if (error) throw error;
      return data || [];
    },

    createRuolo: async (ruolo) => {
      const { data, error } = await supabase
        .from('ruoli')
        .insert([{ ...ruolo, is_system: false }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    updateRuolo: async (id, updates) => {
      const { is_system, ...safe } = updates;
      const { data, error } = await supabase
        .from('ruoli')
        .update({ ...safe, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    deleteRuolo: async (id) => {
      const { data: r } = await supabase.from('ruoli').select('is_system').eq('id', id).single();
      if (r?.is_system) throw new Error('Non puoi eliminare un ruolo di sistema');
      const { error } = await supabase.from('ruoli').delete().eq('id', id);
      if (error) throw error;
      return true;
    },

    assignRuoloToProfile: async (profileId, ruoloId) => {
      let legacyRole = 'member';
      if (ruoloId) {
        const { data: ruolo } = await supabase.from('ruoli').select('nome, permessi').eq('id', ruoloId).single();
        const nomeRuolo = ruolo?.nome?.toLowerCase() || '';
        if (nomeRuolo === 'admin' || nomeRuolo.includes('amministrat') || ruolo?.permessi?.is_admin === true) {
          legacyRole = 'admin';
        }
      }
      const { data, error } = await supabase
        .from('profiles')
        .update({ ruolo_id: ruoloId || null, role: legacyRole, updated_at: new Date().toISOString() })
        .eq('id', profileId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    assignCantieriToProfile: async (profileId, cantieriIds) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ cantieri_assegnati: cantieriIds, updated_at: new Date().toISOString() })
        .eq('id', profileId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    getAllTeams: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*, team_members(profile_id, ruolo_id, profile:profiles(id, full_name, email, role)), team_cantieri(cantiere_id)')
        .order('nome');
      if (error) throw error;
      return data || [];
    },

    createTeam: async (team) => {
      const { data, error } = await supabase.from('teams').insert([team]).select().single();
      if (error) throw error;
      return data;
    },

    updateTeam: async (id, updates) => {
      const { data, error } = await supabase
        .from('teams')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id).select().single();
      if (error) throw error;
      return data;
    },

    deleteTeam: async (id) => {
      const { error } = await supabase.from('teams').delete().eq('id', id);
      if (error) throw error;
      return true;
    },

    addMemberToTeam: async (teamId, profileId, ruoloId = null) => {
      const { data, error } = await supabase
        .from('team_members')
        .insert([{ team_id: teamId, profile_id: profileId, ruolo_id: ruoloId }])
        .select().single();
      if (error) throw error;
      return data;
    },

    removeMemberFromTeam: async (teamId, profileId) => {
      const { error } = await supabase.from('team_members').delete().match({ team_id: teamId, profile_id: profileId });
      if (error) throw error;
      return true;
    },

    assignCantiereToTeam: async (teamId, cantiereId) => {
      const { data, error } = await supabase
        .from('team_cantieri')
        .insert([{ team_id: teamId, cantiere_id: cantiereId }])
        .select().single();
      if (error) throw error;
      return data;
    },

    removeCantiereFromTeam: async (teamId, cantiereId) => {
      const { error } = await supabase.from('team_cantieri').delete().match({ team_id: teamId, cantiere_id: cantiereId });
      if (error) throw error;
      return true;
    },
  },

  // ==================== UPLOAD DOCUMENTI ====================
  uploadDocumenti: {
    uploadFile: async (file, { cantiereId = null, bucket = 'documenti-cantiere' } = {}) => {
      const ext = file.name.split('.').pop();
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).slice(2);
      const folder = cantiereId || 'generale';
      const fileName = `${folder}/${timestamp}_${randomSuffix}.${ext}`;

      console.log('[uploadDocumenti.uploadFile] Tentativo upload:', { bucket, fileName, fileSize: file.size, fileType: file.type });

      // Prova prima con il bucket specificato
      let { error: uploadError, data } = await supabase.storage.from(bucket).upload(fileName, file);

      // Se il bucket non esiste, prova con bucket alternativi
      if (uploadError && (uploadError.message?.includes('not found') || uploadError.message?.includes('Bucket not found'))) {
        console.warn('[uploadDocumenti.uploadFile] Bucket principale non trovato, provo fallback...');
        const fallbackBuckets = ['ordini-allegati', 'segnalazioni'];
        for (const fb of fallbackBuckets) {
          console.log('[uploadDocumenti.uploadFile] Tentativo fallback bucket:', fb);
          ({ error: uploadError, data } = await supabase.storage.from(fb).upload(fileName, file));
          if (!uploadError) {
            bucket = fb;
            console.log('[uploadDocumenti.uploadFile] Upload riuscito con fallback bucket:', fb);
            break;
          }
          console.warn('[uploadDocumenti.uploadFile] Fallback fallito:', fb, uploadError.message);
        }
      }

      if (uploadError) {
        console.error('[uploadDocumenti.uploadFile] ERRORE UPLOAD:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
      console.log('[uploadDocumenti.uploadFile] Upload completato:', { file_uri: fileName, file_url: publicUrl });
      return { file_uri: fileName, file_url: publicUrl, file_name: file.name, bucket };
    },

    getFileUrl: async (file_uri, { bucket = 'documenti-cantiere', expiresIn = 3600 } = {}) => {
      console.log('[uploadDocumenti.getFileUrl] Generazione signed URL:', { file_uri, bucket });

      // Prova prima con il bucket specificato
      let { data, error } = await supabase.storage.from(bucket).createSignedUrl(file_uri, expiresIn);

      // Se fallisce, prova con bucket alternativi
      if (error) {
        const fallbackBuckets = ['ordini-allegati', 'segnalazioni'];
        for (const fb of fallbackBuckets) {
          console.log('[uploadDocumenti.getFileUrl] Tentativo fallback bucket:', fb);
          ({ data, error } = await supabase.storage.from(fb).createSignedUrl(file_uri, expiresIn));
          if (!error) {
            bucket = fb;
            break;
          }
        }
      }

      if (error) {
        console.error('[uploadDocumenti.getFileUrl] ERRORE:', error);
        throw error;
      }
      return { signed_url: data.signedUrl, bucket };
    },

    deleteFile: async (file_uri, { bucket = 'documenti-cantiere' } = {}) => {
      const { error } = await supabase.storage.from(bucket).remove([file_uri]);
      if (error) throw error;
      return true;
    }
  }
};

export default supabase;
