/**
 * Base44 Client Compatibility Layer
 *
 * Per le sezioni non ancora migrate, usa un demo store persistente lato frontend.
 * Dove esiste giÃ  un backend Supabase usabile, prova prima quello.
 */

import { supabaseDB } from '@/lib/supabaseClient';
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

export const base44 = {
  auth: {
    me: async () => {
      const store = await ensureDemoStore();
      return store.User?.[0] || null;
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
    Cantiere: createDemoEntityApi('Cantiere', {
      useSupabaseList: async () => {
        try {
          return await supabaseDB.cantieri.getAll();
        } catch {
          return [];
        }
      },
      useSupabaseGet: async (id) => {
        try {
          return await supabaseDB.cantieri.getById(id);
        } catch {
          return null;
        }
      }
    }),
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
    Sal: createDemoEntityApi('SAL'),
    SAL: createDemoEntityApi('SAL'),
    Impresa: createDemoEntityApi('Impresa', {
      useSupabaseList: async () => {
        try {
          return await supabaseDB.imprese.getAll();
        } catch {
          return [];
        }
      }
    }),
    PersonaEsterna: createDemoEntityApi('PersonaEsterna'),
    Costo: createDemoEntityApi('Costo'),
    Documento: createDemoEntityApi('Documento'),
    AttivitaInterna: createDemoEntityApi('AttivitaInterna'),
    OrdineMateriale: createDemoEntityApi('OrdineMateriale'),
    Subappalto: createDemoEntityApi('Subappalto'),
    EmailConfig: createDemoEntityApi('EmailConfig'),
    Azienda: createDemoEntityApi('Azienda'),
    SALSubappalto: createDemoEntityApi('SALSubappalto'),
    SALSocio: createDemoEntityApi('SALSocio'),
    SocioConsorzio: createDemoEntityApi('SocioConsorzio')
  },
  functions: {
    invoke: async (name, params) => invokeDemoFunction(name, params)
  },
  integrations: {
    Core: {
      UploadFile: async () => ({ file_url: '' }),
      UploadPrivateFile: async () => ({ file_uri: '' }),
      CreateFileSignedUrl: async () => ({ signed_url: '' }),
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
