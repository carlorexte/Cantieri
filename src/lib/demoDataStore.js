import { supabaseDB } from '@/lib/supabaseClient';

const STORAGE_KEY = 'cantierepro.demoStore.v1';

let memoryStore = null;

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

function addDays(base, days) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateString(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function makeId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function sortRows(rows, order) {
  if (!order) return rows;

  const descending = String(order).startsWith('-');
  const field = descending ? String(order).slice(1) : String(order);

  return [...rows].sort((a, b) => {
    const av = a?.[field];
    const bv = b?.[field];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (av === bv) return 0;
    return descending ? (av < bv ? 1 : -1) : (av > bv ? 1 : -1);
  });
}

function applyFilters(rows, filters = {}) {
  const entries = Object.entries(filters || {}).filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (!entries.length) return rows;

  return rows.filter((row) => entries.every(([key, value]) => {
    const current = row?.[key];
    if (Array.isArray(value)) return value.includes(current);
    if (Array.isArray(current)) return current.includes(value);
    return current === value;
  }));
}

function loadStored() {
  if (memoryStore) return memoryStore;

  if (!canUseStorage()) return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    memoryStore = JSON.parse(raw);
    return memoryStore;
  } catch {
    return null;
  }
}

function saveStore(store) {
  memoryStore = store;
  if (canUseStorage()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }
}

async function buildSeedStore() {
  const currentYear = new Date().getFullYear();
  const baseStart = new Date(currentYear, 0, 15);

  let cantieri = [];
  let attivita = [];

  try {
    cantieri = await supabaseDB.cantieri.getAll();
  } catch {
    cantieri = [];
  }

  const baseCantieri = cantieri.length > 0
    ? cantieri.slice(0, 3).map((item, index) => ({
        ...item,
        denominazione: item.denominazione || item.oggetto_lavori || `Cantiere Demo ${index + 1}`,
        team_assegnati: ['team-operations']
      }))
    : [
        {
          id: 'demo-cantiere-1',
          denominazione: 'Demo - Complesso Residenziale',
          oggetto_lavori: 'Realizzazione complesso residenziale',
          importo_contratto: 1500000,
          stato: 'attivo',
          data_inizio: toDateString(baseStart),
          data_fine_prevista: toDateString(addDays(baseStart, 240)),
          note: 'Cantiere demo globale',
          team_assegnati: ['team-operations']
        },
        {
          id: 'demo-cantiere-2',
          denominazione: 'Demo - Scuola Pubblica',
          oggetto_lavori: 'Adeguamento sismico edificio scolastico',
          importo_contratto: 760000,
          stato: 'attivo',
          data_inizio: toDateString(addDays(baseStart, -30)),
          data_fine_prevista: toDateString(addDays(baseStart, 150)),
          note: 'Secondo cantiere demo',
          team_assegnati: ['team-operations']
        }
      ];

  if (cantieri.length > 0) {
    for (const cantiere of baseCantieri) {
      try {
        const rows = await supabaseDB.attivita.getByCantiere(cantiere.id);
        attivita.push(...rows);
      } catch {
        // keep demo fallback below
      }
    }
  }

  if (!attivita.length) {
    attivita = [
      {
        id: 'demo-att-1',
        cantiere_id: baseCantieri[0].id,
        descrizione: 'Allestimento cantiere',
        data_inizio: toDateString(baseStart),
        data_fine: toDateString(addDays(baseStart, 4)),
        durata_giorni: 5,
        stato: 'completata',
        tipo_attivita: 'task',
        wbs: '1',
        percentuale_completamento: 100,
        created_date: nowIso(),
        updated_date: nowIso()
      },
      {
        id: 'demo-att-2',
        cantiere_id: baseCantieri[0].id,
        descrizione: 'Strutture in elevazione',
        data_inizio: toDateString(addDays(baseStart, 5)),
        data_fine: toDateString(addDays(baseStart, 25)),
        durata_giorni: 21,
        stato: 'in_corso',
        tipo_attivita: 'task',
        wbs: '2',
        percentuale_completamento: 45,
        created_date: nowIso(),
        updated_date: nowIso()
      },
      {
        id: 'demo-att-3',
        cantiere_id: baseCantieri[1]?.id || baseCantieri[0].id,
        descrizione: 'Adeguamento strutturale',
        data_inizio: toDateString(addDays(baseStart, -20)),
        data_fine: toDateString(addDays(baseStart, 10)),
        durata_giorni: 31,
        stato: 'in_ritardo',
        tipo_attivita: 'task',
        wbs: '1',
        percentuale_completamento: 55,
        created_date: nowIso(),
        updated_date: nowIso()
      }
    ];
  }

  const impresaId = 'demo-impresa-1';
  const personaId = 'demo-persona-1';
  const teamId = 'team-operations';
  const userId = 'user-1';

  const store = {
    meta: {
      seeded_at: nowIso(),
      source: 'frontend-demo'
    },
    User: [
      {
        id: userId,
        email: 'admin@cantierepro.it',
        nome: 'Admin',
        cognome: 'Demo',
        role: 'admin',
        team_ids: [teamId],
        cantieri_assegnati: baseCantieri.map((item) => item.id)
      }
    ],
    Team: [
      { id: teamId, nome: 'Operations Demo', descrizione: 'Team demo globale', created_date: nowIso(), updated_date: nowIso() }
    ],
    Ruolo: [
      { id: 'admin', nome: 'Amministratore', permessi: {} }
    ],
    PermessoCantiereUtente: [],
    Cantiere: baseCantieri.map((item) => ({
      created_date: nowIso(),
      updated_date: nowIso(),
      ...item
    })),
    Impresa: [
      {
        id: impresaId,
        denominazione: 'Demo Costruzioni Srl',
        ragione_sociale: 'Demo Costruzioni Srl',
        partita_iva: '12345678901',
        email: 'info@democostruzioni.it',
        telefono: '021234567',
        created_date: nowIso(),
        updated_date: nowIso()
      }
    ],
    PersonaEsterna: [
      {
        id: personaId,
        nome: 'Marco',
        cognome: 'Collaudo',
        email: 'marco.collaudo@example.com',
        telefono: '3331234567',
        created_date: nowIso(),
        updated_date: nowIso()
      }
    ],
    Documento: baseCantieri.map((item, index) => ({
      id: `demo-doc-${index + 1}`,
      nome: `Demo Documento ${index + 1}`,
      descrizione: 'Documento demo disponibile per test UI',
      entita_collegata_id: item.id,
      entita_collegata_tipo: 'cantiere',
      tipo_documento: 'economica_sal',
      file_uri: '',
      url: 'https://example.com/documento-demo.pdf',
      created_date: nowIso(),
      updated_date: nowIso()
    })),
    SAL: baseCantieri.map((item, index) => ({
      id: `demo-sal-${index + 1}`,
      cantiere_id: item.id,
      tipo_prestazione: 'lavori',
      tipo_sal_dettaglio: 'sal_progressivo',
      numero_sal: index + 1,
      data_sal: toDateString(addDays(baseStart, 15 + (index * 20))),
      descrizione: `SAL demo ${index + 1}`,
      imponibile: 65000 + (index * 20000),
      iva_percentuale: 10,
      iva_importo: 6500 + (index * 2000),
      totale_fattura: 71500 + (index * 22000),
      stato_pagamento: index % 2 === 0 ? 'da_fatturare' : 'fatturato',
      created_date: nowIso(),
      updated_date: nowIso()
    })),
    Costo: baseCantieri.flatMap((item, index) => ([
      {
        id: `demo-costo-${index + 1}-1`,
        cantiere_id: item.id,
        categoria: 'materiali',
        descrizione: 'Fornitura materiali strutturali',
        importo: 18500 + (index * 3000),
        data_sostenimento: toDateString(addDays(baseStart, index * 8)),
        fornitore: 'Fornitore Demo',
        stato_pagamento: 'da_pagare',
        created_date: nowIso(),
        updated_date: nowIso()
      },
      {
        id: `demo-costo-${index + 1}-2`,
        cantiere_id: item.id,
        categoria: 'manodopera',
        descrizione: 'Costo maestranze',
        importo: 9200 + (index * 2500),
        data_sostenimento: toDateString(addDays(baseStart, 12 + index * 7)),
        fornitore: 'Squadra Demo',
        stato_pagamento: 'pagato',
        created_date: nowIso(),
        updated_date: nowIso()
      }
    ])),
    AttivitaInterna: [
      {
        id: 'demo-task-1',
        descrizione: 'Verifica POS e documentazione sicurezza',
        cantiere_id: baseCantieri[0].id,
        assegnatario_id: userId,
        data_assegnazione: toDateString(baseStart),
        data_scadenza: toDateString(addDays(baseStart, 5)),
        priorita: 'alta',
        stato: 'in_corso',
        created_date: nowIso(),
        updated_date: nowIso()
      }
    ],
    OrdineMateriale: [
      {
        id: 'demo-ordine-1',
        cantiere_id: baseCantieri[0].id,
        descrizione: 'Ordine ferri d’armatura',
        fornitore: 'Acciai Demo',
        importo_totale: 12000,
        data_ordine: toDateString(addDays(baseStart, 2)),
        stato: 'in_attesa',
        created_date: nowIso(),
        updated_date: nowIso()
      }
    ],
    Subappalto: [
      {
        id: 'demo-sub-1',
        cantiere_id: baseCantieri[0].id,
        impresa_id: impresaId,
        ragione_sociale: 'Impianti Demo Srl',
        importo_contratto: 95000,
        categoria_lavori: 'impianti',
        stato: 'attivo',
        created_date: nowIso(),
        updated_date: nowIso()
      }
    ],
    SocioConsorzio: [
      {
        id: 'demo-socio-1',
        cantiere_id: baseCantieri[0].id,
        ragione_sociale: 'Socio Demo 1',
        importo_computo: 82000,
        ribasso_percentuale: 12.5,
        stato: 'attivo',
        created_date: nowIso(),
        updated_date: nowIso()
      }
    ],
    SALSubappalto: [
      {
        id: 'demo-salsub-1',
        subappalto_id: 'demo-sub-1',
        numero_sal: 1,
        imponibile: 25000,
        data_sal: toDateString(addDays(baseStart, 18)),
        stato_pagamento: 'da_pagare',
        created_date: nowIso(),
        updated_date: nowIso()
      }
    ],
    SALSocio: [
      {
        id: 'demo-salsocio-1',
        socio_id: 'demo-socio-1',
        numero_sal: 1,
        imponibile: 18000,
        data_sal: toDateString(addDays(baseStart, 20)),
        stato_pagamento: 'da_pagare',
        created_date: nowIso(),
        updated_date: nowIso()
      }
    ],
    Attivita: attivita,
    Azienda: [
      {
        id: 'demo-azienda-1',
        ragione_sociale: 'CantierePro Demo Srl',
        denominazione: 'CantierePro Demo Srl',
        email: 'amministrazione@example.com',
        telefono: '028765432',
        created_date: nowIso(),
        updated_date: nowIso()
      }
    ],
    EmailConfig: [
      {
        id: 'demo-email-config-1',
        smtp_host: 'smtp.example.com',
        smtp_port: 587,
        email_from: 'noreply@example.com',
        created_date: nowIso(),
        updated_date: nowIso()
      }
    ]
  };

  return store;
}

export async function ensureDemoStore() {
  const existing = loadStored();
  if (existing) return existing;

  const seeded = await buildSeedStore();
  saveStore(seeded);
  return seeded;
}

async function updateStore(mutator) {
  const current = clone(await ensureDemoStore());
  const next = mutator(current) || current;
  saveStore(next);
  return next;
}

export async function listEntity(entityName, { order, limit, filters } = {}) {
  const store = await ensureDemoStore();
  const rows = store[entityName] || [];
  const filtered = applyFilters(rows, filters);
  const sorted = sortRows(filtered, order);
  return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
}

export async function filterEntity(entityName, filters, order, limit) {
  return listEntity(entityName, { filters, order, limit });
}

export async function getEntity(entityName, id) {
  const store = await ensureDemoStore();
  return (store[entityName] || []).find((item) => item.id === id) || null;
}

export async function createEntity(entityName, payload) {
  const entity = {
    id: payload?.id || makeId(entityName.toLowerCase()),
    created_date: nowIso(),
    updated_date: nowIso(),
    ...payload
  };

  await updateStore((store) => {
    store[entityName] = [...(store[entityName] || []), entity];
    return store;
  });

  return entity;
}

export async function updateEntity(entityName, id, updates) {
  let updated = null;
  await updateStore((store) => {
    store[entityName] = (store[entityName] || []).map((item) => {
      if (item.id !== id) return item;
      updated = { ...item, ...updates, updated_date: nowIso() };
      return updated;
    });
    return store;
  });
  return updated;
}

export async function deleteEntity(entityName, id) {
  await updateStore((store) => {
    store[entityName] = (store[entityName] || []).filter((item) => item.id !== id);
    return store;
  });
  return true;
}

export async function resetDemoStore() {
  if (canUseStorage()) {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  memoryStore = null;
  return ensureDemoStore();
}

export async function invokeDemoFunction(name, params = {}) {
  const store = await ensureDemoStore();

  if (name === 'getMyCantieri') {
    return { data: { items: store.Cantiere || [] } };
  }

  if (name === 'getMySALs') {
    return { data: { items: store.SAL || [] } };
  }

  if (name === 'getCantiereDashboardData') {
    const cantiereId = params?.cantiere_id;
    const cantiere = (store.Cantiere || []).find((item) => item.id === cantiereId) || null;
    return {
      data: {
        cantiere,
        subappalti: applyFilters(store.Subappalto || [], { cantiere_id: cantiereId }),
        documenti: applyFilters(store.Documento || [], { entita_collegata_id: cantiereId }),
        imprese: store.Impresa || [],
        sal: applyFilters(store.SAL || [], { cantiere_id: cantiereId }),
        attivita: applyFilters(store.Attivita || [], { cantiere_id: cantiereId }),
        permissions: {}
      }
    };
  }

  if (name === 'managePermissions') {
    return { data: { success: true } };
  }

  if (name === 'archiveDocument') {
    return { data: { success: true, archiviazione_id: makeId('archive') } };
  }

  if (name === 'backupData' || name === 'restoreData' || name === 'processEmails') {
    return { data: { success: true } };
  }

  if (name === 'analyzeProjectData') {
    return { data: { summary: 'Demo analysis available' } };
  }

  if (name === 'extractTextFromDocument') {
    return { data: { text: 'Documento demo estratto' } };
  }

  if (name === 'categorizzaDocumento') {
    return { data: { categoria: 'economica_sal' } };
  }

  if (name === 'previewP7M') {
    return { data: { preview_url: '' } };
  }

  return { data: null };
}
