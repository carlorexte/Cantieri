import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const nowIso = () => new Date().toISOString();
const pad = (n) => String(n).padStart(2, '0');
const asDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

function logStep(label, value = '') {
  console.log(value ? `${label}: ${value}` : label);
}

async function safeDeleteByPrefix(table, column, prefix) {
  const { error } = await supabase.from(table).delete().ilike(column, `${prefix}%`);
  if (error) {
    console.warn(`Skip cleanup ${table}: ${error.message}`);
  }
}

async function insertOptional(table, rows) {
  const { data, error } = await supabase.from(table).insert(rows).select();
  if (error) {
    console.warn(`Skip ${table}: ${error.message}`);
    return [];
  }
  return data || [];
}

async function insertSalWithFallback(rows) {
  const primary = await supabase.from('sal').insert(rows).select();
  if (!primary.error) {
    return primary.data || [];
  }

  const fallbackRows = rows.map((row, index) => ({
    cantiere_id: row.cantiere_id,
    numero: row.numero_sal || index + 1,
    data: row.data_sal,
    importo: row.imponibile,
    stato: 'approvato',
    note: row.descrizione,
    created_date: row.created_date,
    updated_date: row.updated_date
  }));

  const fallback = await supabase.from('sal').insert(fallbackRows).select();
  if (fallback.error) {
    console.warn(`Skip sal: ${fallback.error.message}`);
    return [];
  }
  return fallback.data || [];
}

async function main() {
  const prefix = 'TEST QA';
  logStep('Seed start');

  await safeDeleteByPrefix('documenti', 'nome', prefix);
  await safeDeleteByPrefix('imprese', 'denominazione', prefix);
  await safeDeleteByPrefix('cantieri', 'denominazione', prefix);

  const baseStart = new Date();
  baseStart.setDate(baseStart.getDate() - 14);

  const cantieriPayload = [
    {
      denominazione: `${prefix} - Complesso Residenziale Milano`,
      oggetto_lavori: 'Costruzione complesso residenziale con due palazzine e opere esterne',
      codice_cig: 'TESTCIG001',
      codice_cup: 'TESTCUP001',
      importo_contratto: 1850000,
      data_inizio: asDate(baseStart),
      data_fine_prevista: asDate(new Date(baseStart.getFullYear(), baseStart.getMonth() + 8, baseStart.getDate())),
      stato: 'attivo',
      indirizzo: 'Via delle Magnolie 12, Milano',
      cliente: 'Impresa Test Cliente',
      direttore_lavori: 'Ing. Marco Prova',
      coordinatore_sicurezza: 'Arch. Laura Demo',
      note: 'Cantiere seed di test per collaudo applicazione',
      created_date: nowIso(),
      updated_date: nowIso()
    },
    {
      denominazione: `${prefix} - Ristrutturazione Scuola Napoli`,
      oggetto_lavori: 'Adeguamento sismico e riqualificazione energetica edificio scolastico',
      codice_cig: 'TESTCIG002',
      codice_cup: 'TESTCUP002',
      importo_contratto: 760000,
      data_inizio: asDate(new Date(baseStart.getFullYear(), baseStart.getMonth(), baseStart.getDate() - 21)),
      data_fine_prevista: asDate(new Date(baseStart.getFullYear(), baseStart.getMonth() + 5, baseStart.getDate())),
      stato: 'attivo',
      indirizzo: 'Via Roma 88, Napoli',
      cliente: 'Comune Demo',
      direttore_lavori: 'Ing. Silvia Test',
      coordinatore_sicurezza: 'Geom. Paolo Check',
      note: 'Secondo cantiere seed per test liste e dashboard',
      created_date: nowIso(),
      updated_date: nowIso()
    }
  ];

  const { data: cantieri, error: cantieriError } = await supabase.from('cantieri').insert(cantieriPayload).select();
  if (cantieriError) {
    throw cantieriError;
  }

  const [cantiereMilano, cantiereNapoli] = cantieri;
  logStep('Cantieri creati', cantieri.length);

  const imprese = await insertOptional('imprese', [
    {
      denominazione: `${prefix} - Edilizia Generale`,
      partita_iva: '12345678901',
      codice_fiscale: '12345678901',
      indirizzo: 'Via Test 1',
      citta: 'Milano',
      provincia: 'MI',
      telefono: '021234567',
      email: 'test.impresa@example.com',
      referente: 'Giulio Verifica',
      ruolo: 'Appaltatore',
      note: 'Impresa seed automatica',
      created_date: nowIso(),
      updated_date: nowIso()
    }
  ]);
  logStep('Imprese create', imprese.length);

  const attivitaRows = [
    {
      cantiere_id: cantiereMilano.id,
      wbs: '1',
      descrizione: 'Impostazione cantiere',
      tipo_attivita: 'task',
      durata_giorni: 5,
      data_inizio: asDate(baseStart),
      data_fine: asDate(addDays(new Date(baseStart), 4)),
      importo_previsto: 15000,
      percentuale_completamento: 100,
      stato: 'completata',
      predecessori: [],
      colore: '#4f46e5',
      created_date: nowIso(),
      updated_date: nowIso()
    },
    {
      cantiere_id: cantiereMilano.id,
      wbs: '2',
      descrizione: 'Scavi e fondazioni',
      tipo_attivita: 'task',
      durata_giorni: 14,
      data_inizio: asDate(addDays(new Date(baseStart), 5)),
      data_fine: asDate(addDays(new Date(baseStart), 18)),
      importo_previsto: 110000,
      percentuale_completamento: 70,
      stato: 'in_corso',
      predecessori: [{ id: '1', tipo: 'FS', lag: 0 }],
      colore: '#4f46e5',
      created_date: nowIso(),
      updated_date: nowIso()
    },
    {
      cantiere_id: cantiereMilano.id,
      wbs: '3',
      descrizione: 'Struttura elevazione piano terra',
      tipo_attivita: 'task',
      durata_giorni: 16,
      data_inizio: asDate(addDays(new Date(baseStart), 19)),
      data_fine: asDate(addDays(new Date(baseStart), 34)),
      importo_previsto: 165000,
      percentuale_completamento: 25,
      stato: 'in_ritardo',
      predecessori: [{ id: '2', tipo: 'FS', lag: 0 }],
      colore: '#4f46e5',
      created_date: nowIso(),
      updated_date: nowIso()
    },
    {
      cantiere_id: cantiereMilano.id,
      wbs: '4',
      descrizione: 'Tamponature e chiusure',
      tipo_attivita: 'task',
      durata_giorni: 20,
      data_inizio: asDate(addDays(new Date(baseStart), 35)),
      data_fine: asDate(addDays(new Date(baseStart), 54)),
      importo_previsto: 98000,
      percentuale_completamento: 0,
      stato: 'pianificata',
      predecessori: [{ id: '3', tipo: 'FS', lag: 0 }],
      colore: '#4f46e5',
      created_date: nowIso(),
      updated_date: nowIso()
    },
    {
      cantiere_id: cantiereNapoli.id,
      wbs: '1',
      descrizione: 'Allestimento ponteggi',
      tipo_attivita: 'task',
      durata_giorni: 7,
      data_inizio: asDate(addDays(new Date(baseStart), -21)),
      data_fine: asDate(addDays(new Date(baseStart), -15)),
      importo_previsto: 12000,
      percentuale_completamento: 100,
      stato: 'completata',
      predecessori: [],
      colore: '#0f766e',
      created_date: nowIso(),
      updated_date: nowIso()
    },
    {
      cantiere_id: cantiereNapoli.id,
      wbs: '2',
      descrizione: 'Adeguamento strutturale',
      tipo_attivita: 'task',
      durata_giorni: 18,
      data_inizio: asDate(addDays(new Date(baseStart), -14)),
      data_fine: asDate(addDays(new Date(baseStart), 3)),
      importo_previsto: 135000,
      percentuale_completamento: 55,
      stato: 'in_corso',
      predecessori: [{ id: '1', tipo: 'FS', lag: 0 }],
      colore: '#0f766e',
      created_date: nowIso(),
      updated_date: nowIso()
    }
  ];

  const attivita = await insertOptional('attivita', attivitaRows);
  logStep('Attivita create', attivita.length);

  const documenti = await insertOptional('documenti', [
    {
      cantiere_id: cantiereMilano.id,
      nome: `${prefix} - Verbale consegna lavori`,
      descrizione: 'Documento seed per sezione documenti',
      tipo: 'verbale',
      url: 'https://example.com/test-verbale.pdf',
      file_path: '/seed/test-verbale.pdf',
      file_size: 182400,
      mime_type: 'application/pdf',
      uploaded_by: 'seed-script',
      tags: ['seed', 'verbale'],
      created_date: nowIso(),
      updated_date: nowIso()
    }
  ]);
  logStep('Documenti creati', documenti.length);

  const salRows = [
    {
      cantiere_id: cantiereMilano.id,
      numero_sal: 1,
      data_sal: asDate(addDays(new Date(baseStart), 12)),
      imponibile: 95000,
      descrizione: 'SAL 1 - Fondazioni',
      tipo_sal_dettaglio: 'sal_progressivo',
      created_date: nowIso(),
      updated_date: nowIso()
    },
    {
      cantiere_id: cantiereMilano.id,
      numero_sal: 2,
      data_sal: asDate(addDays(new Date(baseStart), 32)),
      imponibile: 145000,
      descrizione: 'SAL 2 - Struttura',
      tipo_sal_dettaglio: 'sal_progressivo',
      created_date: nowIso(),
      updated_date: nowIso()
    },
    {
      cantiere_id: cantiereNapoli.id,
      numero_sal: 1,
      data_sal: asDate(addDays(new Date(baseStart), -3)),
      imponibile: 48000,
      descrizione: 'SAL 1 - Ponteggi e demolizioni',
      tipo_sal_dettaglio: 'sal_progressivo',
      created_date: nowIso(),
      updated_date: nowIso()
    }
  ];

  const sals = await insertSalWithFallback(salRows);
  logStep('SAL creati', sals.length);

  console.log('\nSeed completato.');
  console.log(`Cantieri: ${cantieri.length}`);
  console.log(`Attivita: ${attivita.length}`);
  console.log(`SAL: ${sals.length}`);
  console.log(`Imprese: ${imprese.length}`);
  console.log(`Documenti: ${documenti.length}`);
}

main().catch((error) => {
  console.error('Seed failed:', error.message || error);
  process.exit(1);
});
