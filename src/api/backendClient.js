/**
 * Backend Client Compatibility Layer
 *
 * Per le sezioni non ancora migrate, usa un demo store persistente lato frontend.
 * Dove esiste gia un backend Supabase usabile, prova prima quello.
 */

import { supabase, supabaseDB } from '@/lib/supabaseClient';
import {
  listEntity,
  filterEntity,
  getEntity,
  createEntity,
  updateEntity,
  deleteEntity,
  invokeDemoFunction,
  ensureDemoStore
} from '@/lib/demoDataStore';

// Wrapper generico per entita Supabase: converte i metodi supabaseDB in API compatibili con il client legacy.
function createSupabaseEntityApi(db) {
  return {
    list: async (order, limit, filters) => {
      try {
        if (filters && db.filter) return await db.filter(filters);
        return await db.getAll();
      } catch (e) {
        console.warn('Supabase list error:', e.message);
        return [];
      }
    },
    get: async (id) => {
      try {
        const all = await db.getAll();
        return all.find(r => r.id === id) || null;
      } catch { return null; }
    },
    create: async (payload) => {
      // Sanitizza stringhe vuote a null
      const sanitized = {};
      Object.entries(payload || {}).forEach(([key, value]) => {
        if (typeof value === 'string') {
          sanitized[key] = value.trim() === '' ? null : value.trim();
        } else {
          sanitized[key] = value;
        }
      });
      return db.create(sanitized);
    },
    update: async (id, payload) => {
      // Sanitizza stringhe vuote a null per evitare errori PostgreSQL
      const sanitized = {};
      Object.entries(payload || {}).forEach(([key, value]) => {
        if (typeof value === 'string') {
          sanitized[key] = value.trim() === '' ? null : value.trim();
        } else {
          sanitized[key] = value;
        }
      });
      return db.update(id, sanitized);
    },
    delete: async (id) => db.delete(id),
    filter: async (filters, order, limit) => {
      try {
        if (db.filter) {
          const rows = await db.filter(filters);
          return typeof limit === 'number' ? rows.slice(0, limit) : rows;
        }
        const rows = await db.getAll();
        if (!filters) return rows;
        const entries = Object.entries(filters).filter(([, v]) => v !== undefined && v !== null && v !== '');
        const filtered = rows.filter(r => entries.every(([k, v]) => r?.[k] === v));
        return typeof limit === 'number' ? filtered.slice(0, limit) : filtered;
      } catch (e) {
        console.warn('Supabase filter error:', e.message);
        return [];
      }
    }
  };
}

function createDemoEntityApi(entityName, { useSupabaseList = null, useSupabaseGet = null } = {}) {
  return {
    list: async (order, limit, filters) => {
      if (useSupabaseList) {
        const rows = await useSupabaseList(order, limit, filters);
        if (Array.isArray(rows) && rows.length > 0) return rows;
      }
      return listEntity(entityName, { order, limit, filters });
    },
    get: async (id) => {
      if (useSupabaseGet) {
        const row = await useSupabaseGet(id);
        if (row) return row;
      }
      return getEntity(entityName, id);
    },
    create: async (payload) => createEntity(entityName, payload),
    update: async (id, payload) => updateEntity(entityName, id, payload),
    delete: async (id) => deleteEntity(entityName, id),
    filter: async (filters, order, limit) => filterEntity(entityName, filters, order, limit)
  };
}

export const backendClient = {
  auth: {
    me: async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return null;
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();
        if (profile) {
          return {
            id: profile.id,
            email: profile.email || authUser.email,
            full_name: profile.full_name || authUser.email,
            role: profile.role,
            ...profile
          };
        }
        // fallback: restituisce authUser base se il profilo non esiste ancora
        return { id: authUser.id, email: authUser.email, full_name: authUser.email, role: 'member' };
      } catch {
        const store = await ensureDemoStore();
        return store.User?.[0] || null;
      }
    },
    logout: async () => {},
    redirectToLogin: () => {}
  },
  entities: {
    Query: {},
    User: createDemoEntityApi('User'),
    Team: createDemoEntityApi('Team'),
    Ruolo: createDemoEntityApi('Ruolo'),
    PermessoCantiereUtente: createDemoEntityApi('PermessoCantiereUtente'),
    Cantiere: createSupabaseEntityApi(supabaseDB.cantieri),
    Attivita: {
      list: async (order, limit, filters) => {
        try {
          if (filters?.cantiere_id) {
            const rows = await supabaseDB.attivita.getByCantiere(filters.cantiere_id);
            if (rows?.length) return rows;
          }

          const rows = await supabaseDB.attivita.getAll();
          if (rows?.length) return rows;
        } catch {
          // fallback demo below
        }

        return listEntity('Attivita', { order, limit, filters });
      },
      get: async (id) => getEntity('Attivita', id),
      create: async (payload) => createEntity('Attivita', payload),
      update: async (id, payload) => updateEntity('Attivita', id, payload),
      delete: async (id) => deleteEntity('Attivita', id),
      filter: async (filters, order, limit) => {
        try {
          const rows = await supabaseDB.attivita.getAll();
          if (rows?.length) {
            if (!filters) return rows;
            const entries = Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== '');
            const filteredRows = rows.filter((row) => entries.every(([key, value]) => row?.[key] === value));
            return typeof limit === 'number' ? filteredRows.slice(0, limit) : filteredRows;
          }
        } catch {
          // ignore
        }

        return filterEntity('Attivita', filters, order, limit);
      }
    },
    Sal: createSupabaseEntityApi(supabaseDB.sals),
    SAL: createSupabaseEntityApi(supabaseDB.sals),
    Impresa: createSupabaseEntityApi(supabaseDB.imprese),
    PersonaEsterna: createSupabaseEntityApi(supabaseDB.personeEsterne),
    Costo: createSupabaseEntityApi(supabaseDB.costi),
    Documento: createSupabaseEntityApi(supabaseDB.documenti),
    AttivitaInterna: createSupabaseEntityApi(supabaseDB.attivitaInterne),
    OrdineMateriale: createSupabaseEntityApi(supabaseDB.ordiniMateriale),
    Subappalto: createSupabaseEntityApi(supabaseDB.subappalti),
    EmailConfig: createDemoEntityApi('EmailConfig'),
    Azienda: createDemoEntityApi('Azienda'),
    SALSubappalto: createSupabaseEntityApi(supabaseDB.salSubappalto),
    SALSocio: createSupabaseEntityApi(supabaseDB.salSocio),
    SocioConsorzio: createSupabaseEntityApi(supabaseDB.sociConsorzio),
    VoceComputo: createSupabaseEntityApi(supabaseDB.vociComputo),
    AttivitaVoceComputo: createSupabaseEntityApi(supabaseDB.attivitaVociComputo),
    LibrettoMisure: createSupabaseEntityApi(supabaseDB.librettoMisure)
  },
  functions: {
    invoke: async (name, params) => {
      // Funzioni che usano Supabase direttamente
      if (name === 'getMyCantieri') {
        try {
          const items = await supabaseDB.cantieri.getAll();
          return { data: { items } };
        } catch { return { data: { items: [] } }; }
      }
      if (name === 'getMySALs') {
        try {
          const items = await supabaseDB.sals.getAll();
          return { data: { items } };
        } catch { return { data: { items: [] } }; }
      }
      if (name === 'getCantiereDashboardData') {
        try {
          const cantiereId = params?.cantiere_id;
          const [cantiere, subappalti, sal, attivita, imprese, vociComputo, linksComputo] = await Promise.all([
            supabaseDB.cantieri.getById(cantiereId).catch(() => null),
            supabaseDB.subappalti.filter({ cantiere_id: cantiereId }).catch(() => []),
            supabaseDB.sals.filter({ cantiere_id: cantiereId }).catch(() => []),
            supabaseDB.attivita.getByCantiere(cantiereId).catch(() => []),
            supabaseDB.imprese.getAll().catch(() => []),
            supabaseDB.vociComputo.getByCantiere(cantiereId).catch(() => []),
            supabaseDB.attivitaVociComputo.getByCantiere(cantiereId).catch(() => [])
          ]);
          const allDocs = await supabaseDB.documenti.filter({}).catch(() => []);
          const documenti = allDocs.filter(d => {
            // Check entita_collegata_id (legacy)
            if (d.entita_collegata_id === cantiereId) return true;
            // Check entita_collegate (JSONB array)
            if (Array.isArray(d.entita_collegate)) {
              return d.entita_collegate.some(e => e.entita_tipo === 'cantiere' && e.entita_id === cantiereId);
            }
            // Fallback: entita_collegate salvato erroneamente come stringa JSON
            if (typeof d.entita_collegate === 'string' && d.entita_collegate.length > 0) {
              try {
                const parsed = JSON.parse(d.entita_collegate);
                if (Array.isArray(parsed)) {
                  return parsed.some(e => e.entita_tipo === 'cantiere' && e.entita_id === cantiereId);
                }
              } catch { /* stringa non valida, ignora */ }
            }
            return false;
          });
          const virtualDocs = [];

          if (cantiere) {
            const addVirtualDoc = (url, tipo, categoria, label, extra = {}) => {
              if (!url) return;

              const alreadyPresent = documenti.some((doc) =>
                doc?.file_uri === url ||
                doc?.cloud_file_url === url
              );

              if (alreadyPresent) return;

              const safeUrlId = String(url).split('/').pop() || `${tipo}-missing`;
              virtualDocs.push({
                id: `virtual-${cantiereId}-${tipo}-${safeUrlId}`,
                nome_documento: `${label} - ${cantiere.denominazione || cantiere.oggetto_lavori || 'Cantiere'}`,
                tipo_documento: tipo,
                categoria_principale: categoria,
                file_uri: String(url).startsWith('http') ? null : url,
                cloud_file_url: String(url).startsWith('http') ? url : null,
                entita_collegata_tipo: 'cantiere',
                entita_collegata_id: cantiereId,
                entita_collegate: [{ entita_tipo: 'cantiere', entita_id: cantiereId }],
                readonly: true,
                source: 'cantiere_field',
                ...extra
              });
            };

            addVirtualDoc(cantiere.contratto_file_url, 'contratto_appalto', 'contratti', 'Contratto Appalto', {
              data_emissione: cantiere.contratto_data_firma || null,
              source_field: 'contratto_file_url'
            });
            addVirtualDoc(cantiere.polizza_definitiva_url, 'polizze_decennale', 'polizze', 'Polizza Definitiva', {
              data_scadenza: cantiere.polizza_definitiva_scadenza || null,
              source_field: 'polizza_definitiva_url'
            });
            addVirtualDoc(cantiere.polizza_car_url, 'polizze_car', 'polizze', 'Polizza CAR', {
              data_scadenza: cantiere.polizza_car_scadenza || null,
              source_field: 'polizza_car_url'
            });
            addVirtualDoc(cantiere.polizza_anticipazione_url, 'polizze_rct', 'polizze', 'Polizza Anticipazione', {
              data_scadenza: cantiere.polizza_anticipazione_scadenza || null,
              source_field: 'polizza_anticipazione_url'
            });
            addVirtualDoc(cantiere.verbale_inizio_lavori_url, 'cantiere_verbale_consegna', 'tecnici', 'Verbale Inizio Lavori', {
              data_emissione: cantiere.data_inizio || null,
              source_field: 'verbale_inizio_lavori_url'
            });

            if (Array.isArray(cantiere.verbali_consegna)) {
              cantiere.verbali_consegna.forEach((url, index) => {
                addVirtualDoc(url, 'cantiere_verbale_consegna', 'tecnici', `Verbale Consegna ${index + 1}`, {
                  source_field: 'verbali_consegna',
                  source_index: index
                });
              });
            }
          }

          return {
            data: {
              cantiere,
              subappalti,
              sal,
              attivita,
              imprese,
              vociComputo,
              linksComputo,
              documenti: [...documenti, ...virtualDocs],
              permissions: {}
            }
          };
        } catch { return { data: { cantiere: null, subappalti: [], sal: [], attivita: [], imprese: [], vociComputo: [], linksComputo: [], documenti: [], permissions: {} } }; }
      }
      return invokeDemoFunction(name, params);
    }
  },
  integrations: {
    Core: {
      UploadFile: async ({ file, cantiereId = null }) => {
        try {
          const result = await supabaseDB.uploadDocumenti.uploadFile(file, { cantiereId });
          return { file_url: result.file_url };
        } catch (error) {
          console.error('UploadFile error:', error);
          throw error;
        }
      },
      UploadPrivateFile: async ({ file, cantiereId = null }) => {
        try {
          const result = await supabaseDB.uploadDocumenti.uploadFile(file, { cantiereId });
          return { file_uri: result.file_uri };
        } catch (error) {
          console.error('UploadPrivateFile error:', error);
          throw error;
        }
      },
      CreateFileSignedUrl: async ({ file_uri, expires_in = 3600 }) => {
        try {
          const result = await supabaseDB.uploadDocumenti.getFileUrl(file_uri, { expiresIn: expires_in });
          return { signed_url: result.signed_url };
        } catch (error) {
          console.error('CreateFileSignedUrl error:', error);
          throw error;
        }
      },
      InvokeLLM: async () => null,
      SendEmail: async () => null,
      SendSMS: async () => null,
      GenerateImage: async () => null,
      ExtractDataFromUploadedFile: async () => null
    }
  },
  agents: {
    createConversation: async () => null,
    listConversations: async () => [],
    subscribeToConversation: () => () => {},
    addMessage: async () => null
  },
  appLogs: {
    logUserInApp: async () => {}
  }
};
