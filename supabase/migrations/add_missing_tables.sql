-- ============================================================
-- MIGRAZIONE: Aggiunge tabelle mancanti e colonne per SAL/Subappalto
-- Sicura da eseguire più volte (idempotente)
-- ============================================================

BEGIN;

-- ============================================================
-- 1. FIX SAL: aggiungi cantiere_id e colonne mancanti
-- ============================================================
ALTER TABLE public.sal
  ADD COLUMN IF NOT EXISTS cantiere_id          UUID,
  ADD COLUMN IF NOT EXISTS tipo_prestazione     TEXT DEFAULT 'lavori',
  ADD COLUMN IF NOT EXISTS tipo_sal_dettaglio   TEXT DEFAULT 'sal_progressivo',
  ADD COLUMN IF NOT EXISTS numero_sal           INTEGER,
  ADD COLUMN IF NOT EXISTS numero_fattura       TEXT,
  ADD COLUMN IF NOT EXISTS data_fattura         DATE,
  ADD COLUMN IF NOT EXISTS imponibile           NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iva_percentuale      NUMERIC DEFAULT 22,
  ADD COLUMN IF NOT EXISTS iva_importo          NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS totale_fattura       NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_pagamento       DATE,
  ADD COLUMN IF NOT EXISTS importo_pagato       NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS importo_anticipo_erogato NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_anticipo_erogato DATE,
  ADD COLUMN IF NOT EXISTS file_uri             TEXT,
  ADD COLUMN IF NOT EXISTS stato_pagamento      TEXT DEFAULT 'da_emettere',
  ADD COLUMN IF NOT EXISTS note                 TEXT;

-- Sincronizza cantiere_id da id_cantiere per righe esistenti
UPDATE public.sal SET cantiere_id = id_cantiere WHERE cantiere_id IS NULL AND id_cantiere IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sal_cantiere_id ON public.sal(cantiere_id);

-- ============================================================
-- 2. FIX SUBAPPALTO: aggiungi cantiere_id e colonne mancanti
-- ============================================================
ALTER TABLE public.subappalto
  ADD COLUMN IF NOT EXISTS cantiere_id            UUID,
  ADD COLUMN IF NOT EXISTS tipo_relazione         TEXT DEFAULT 'subappalto',
  ADD COLUMN IF NOT EXISTS impresa_id             UUID,
  ADD COLUMN IF NOT EXISTS ragione_sociale        TEXT,
  ADD COLUMN IF NOT EXISTS referente_nome         TEXT,
  ADD COLUMN IF NOT EXISTS referente_qualifica    TEXT,
  ADD COLUMN IF NOT EXISTS partita_iva            TEXT,
  ADD COLUMN IF NOT EXISTS codice_fiscale         TEXT,
  ADD COLUMN IF NOT EXISTS telefono               TEXT,
  ADD COLUMN IF NOT EXISTS email                  TEXT,
  ADD COLUMN IF NOT EXISTS indirizzo              TEXT,
  ADD COLUMN IF NOT EXISTS cap                    TEXT,
  ADD COLUMN IF NOT EXISTS citta                  TEXT,
  ADD COLUMN IF NOT EXISTS importo_contratto      NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS oneri_sicurezza        NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS importo_contrattuale   NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ribasso_percentuale    NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS categoria_lavori       TEXT,
  ADD COLUMN IF NOT EXISTS durc_scadenza          DATE,
  ADD COLUMN IF NOT EXISTS data_firma_contratto   DATE,
  ADD COLUMN IF NOT EXISTS contratto_file_url     TEXT,
  ADD COLUMN IF NOT EXISTS data_fine_prevista     DATE,
  ADD COLUMN IF NOT EXISTS note                   TEXT;

-- Sincronizza cantiere_id da id_cantiere per righe esistenti
UPDATE public.subappalto SET cantiere_id = id_cantiere WHERE cantiere_id IS NULL AND id_cantiere IS NOT NULL;
-- Copia fornitore in ragione_sociale per righe esistenti
UPDATE public.subappalto SET ragione_sociale = fornitore WHERE ragione_sociale IS NULL AND fornitore IS NOT NULL;
-- Copia importo in importo_contratto
UPDATE public.subappalto SET importo_contratto = importo WHERE importo_contratto = 0 AND importo IS NOT NULL;
-- Copia data_fine in data_fine_prevista
UPDATE public.subappalto SET data_fine_prevista = data_fine WHERE data_fine_prevista IS NULL AND data_fine IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subappalto_cantiere_id ON public.subappalto(cantiere_id);

-- ============================================================
-- 3. TABELLA IMPRESE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.imprese (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  denominazione     TEXT NOT NULL,
  partita_iva       TEXT,
  codice_fiscale    TEXT,
  indirizzo         TEXT,
  cap               TEXT,
  citta             TEXT,
  provincia         TEXT,
  telefono          TEXT,
  email             TEXT,
  pec               TEXT,
  sito_web          TEXT,
  referente_nome    TEXT,
  referente_telefono TEXT,
  referente_email   TEXT,
  categoria_lavori  TEXT,
  soa_categorie     TEXT[],
  note              TEXT,
  created_date      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_imprese_denominazione ON public.imprese(denominazione);

-- ============================================================
-- 4. TABELLA COSTI
-- ============================================================
CREATE TABLE IF NOT EXISTS public.costi (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cantiere_id       UUID REFERENCES public.cantieri(id) ON DELETE SET NULL,
  categoria         TEXT DEFAULT 'altro',
  descrizione       TEXT NOT NULL,
  importo           NUMERIC DEFAULT 0,
  data_sostenimento DATE,
  fornitore         TEXT,
  numero_documento  TEXT,
  stato_pagamento   TEXT DEFAULT 'da_pagare',
  note              TEXT,
  created_date      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_costi_cantiere_id ON public.costi(cantiere_id);

-- ============================================================
-- 5. TABELLA DOCUMENTI
-- ============================================================
CREATE TABLE IF NOT EXISTS public.documenti (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_documento          TEXT NOT NULL,
  categoria_principale    TEXT DEFAULT 'generale',
  tipo_documento          TEXT,
  descrizione             TEXT,
  percorso_nas            TEXT,
  file_uri                TEXT,
  cloud_file_url          TEXT,
  data_emissione          DATE,
  data_scadenza           DATE,
  entita_collegate        JSONB DEFAULT '[]'::jsonb,
  numero_documento        TEXT,
  emittente               TEXT,
  tags                    TEXT[],
  note                    TEXT,
  ocr_completato          BOOLEAN DEFAULT false,
  testo_estratto          TEXT,
  versioni                JSONB DEFAULT '[]'::jsonb,
  created_date            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 6. TABELLA ATTIVITA_INTERNE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.attivita_interne (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descrizione         TEXT NOT NULL,
  dettagli            TEXT,
  tipo_attivita       TEXT DEFAULT 'generale',
  cantiere_id         UUID REFERENCES public.cantieri(id) ON DELETE SET NULL,
  assegnatario_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  data_assegnazione   DATE,
  data_scadenza       DATE,
  priorita            TEXT DEFAULT 'media',
  stato               TEXT DEFAULT 'da_fare',
  data_completamento  DATE,
  note                TEXT,
  created_date        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attivita_interne_cantiere_id ON public.attivita_interne(cantiere_id);
CREATE INDEX IF NOT EXISTS idx_attivita_interne_assegnatario ON public.attivita_interne(assegnatario_id);

-- ============================================================
-- 7. TABELLA ORDINI_MATERIALE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ordini_materiale (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cantiere_id                     UUID REFERENCES public.cantieri(id) ON DELETE SET NULL,
  numero_ordine                   TEXT,
  descrizione                     TEXT NOT NULL,
  fornitore_ragione_sociale       TEXT,
  fornitore_email                 TEXT,
  data_ordine                     DATE,
  priorita                        TEXT DEFAULT 'normale',
  stato                           TEXT DEFAULT 'bozza',
  responsabile_id                 UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  societa_intestataria_id         UUID,
  societa_intestataria_ragione_sociale TEXT,
  societa_intestataria_partita_iva TEXT,
  societa_intestataria_codice_fiscale TEXT,
  societa_intestataria_indirizzo  TEXT,
  societa_intestataria_email      TEXT,
  societa_intestataria_pec        TEXT,
  importo_totale                  NUMERIC DEFAULT 0,
  tipo_operazione                 TEXT DEFAULT 'acquisto',
  durata_noleggio                 TEXT,
  condizioni_ordine               TEXT,
  dettagli_materiali              JSONB DEFAULT '[]'::jsonb,
  note                            TEXT,
  file_allegato_uri               TEXT,
  attivita_collegata_id           UUID,
  note_approvazione               TEXT,
  sub_user_id                     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_date                    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date                    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ordini_materiale_cantiere_id ON public.ordini_materiale(cantiere_id);

-- ============================================================
-- 8. TABELLA PERSONE_ESTERNE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.persone_esterne (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            TEXT NOT NULL,
  cognome         TEXT NOT NULL,
  qualifica       TEXT,
  codice_fiscale  TEXT,
  partita_iva     TEXT,
  data_nascita    DATE,
  indirizzo       TEXT,
  cap             TEXT,
  citta           TEXT,
  provincia       TEXT,
  telefono        TEXT,
  email           TEXT,
  pec             TEXT,
  note            TEXT,
  created_date    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 9. TABELLA SOCI_CONSORZIO
-- ============================================================
CREATE TABLE IF NOT EXISTS public.soci_consorzio (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cantiere_id                     UUID REFERENCES public.cantieri(id) ON DELETE SET NULL,
  ragione_sociale                 TEXT NOT NULL,
  importo_computo                 NUMERIC DEFAULT 0,
  ribasso_percentuale             NUMERIC DEFAULT 0,
  ribasso_importo                 NUMERIC DEFAULT 0,
  importo_netto_ribasso           NUMERIC DEFAULT 0,
  importo_contrattuale            NUMERIC DEFAULT 0,
  oneri_sicurezza                 NUMERIC DEFAULT 0,
  percentuale_ripartizione        NUMERIC DEFAULT 0,
  committente_ragione_sociale     TEXT,
  oggetto_lavori                  TEXT,
  azienda_appaltatrice_ragione_sociale TEXT,
  note                            TEXT,
  created_date                    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date                    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_soci_consorzio_cantiere_id ON public.soci_consorzio(cantiere_id);

-- ============================================================
-- 10. TABELLA SAL_SOCIO
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sal_socio (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  socio_id        UUID REFERENCES public.soci_consorzio(id) ON DELETE CASCADE,
  cantiere_id     UUID REFERENCES public.cantieri(id) ON DELETE SET NULL,
  numero_sal      INTEGER,
  tipo_sal        TEXT DEFAULT 'sal_progressivo',
  data_sal        DATE,
  numero_fattura  TEXT,
  imponibile      NUMERIC DEFAULT 0,
  iva_10          NUMERIC DEFAULT 0,
  totale          NUMERIC DEFAULT 0,
  data_pagamento  DATE,
  importo_pagamento NUMERIC DEFAULT 0,
  stato_pagamento TEXT DEFAULT 'da_emettere',
  created_date    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 11. TABELLA SAL_SUBAPPALTO
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sal_subappalto (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subappalto_id     UUID REFERENCES public.subappalto(id) ON DELETE CASCADE,
  cantiere_id       UUID REFERENCES public.cantieri(id) ON DELETE SET NULL,
  numero_sal        INTEGER,
  tipo_sal          TEXT DEFAULT 'sal_progressivo',
  data_sal          DATE,
  numero_fattura    TEXT,
  imponibile        NUMERIC DEFAULT 0,
  iva               NUMERIC DEFAULT 0,
  totale            NUMERIC DEFAULT 0,
  data_pagamento    DATE,
  importo_pagamento NUMERIC DEFAULT 0,
  stato_pagamento   TEXT DEFAULT 'da_emettere',
  created_date      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 12. RLS - abilita sicurezza base (tutti gli utenti autenticati possono leggere/scrivere)
-- ============================================================
ALTER TABLE public.imprese          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.costi            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documenti        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attivita_interne ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordini_materiale ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persone_esterne  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soci_consorzio   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sal_socio        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sal_subappalto   ENABLE ROW LEVEL SECURITY;

-- Policy: utenti autenticati possono tutto
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='imprese' AND policyname='imprese_auth') THEN
    CREATE POLICY "imprese_auth" ON public.imprese FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='costi' AND policyname='costi_auth') THEN
    CREATE POLICY "costi_auth" ON public.costi FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='documenti' AND policyname='documenti_auth') THEN
    CREATE POLICY "documenti_auth" ON public.documenti FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='attivita_interne' AND policyname='attivita_interne_auth') THEN
    CREATE POLICY "attivita_interne_auth" ON public.attivita_interne FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ordini_materiale' AND policyname='ordini_materiale_auth') THEN
    CREATE POLICY "ordini_materiale_auth" ON public.ordini_materiale FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='persone_esterne' AND policyname='persone_esterne_auth') THEN
    CREATE POLICY "persone_esterne_auth" ON public.persone_esterne FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='soci_consorzio' AND policyname='soci_consorzio_auth') THEN
    CREATE POLICY "soci_consorzio_auth" ON public.soci_consorzio FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sal_socio' AND policyname='sal_socio_auth') THEN
    CREATE POLICY "sal_socio_auth" ON public.sal_socio FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sal_subappalto' AND policyname='sal_subappalto_auth') THEN
    CREATE POLICY "sal_subappalto_auth" ON public.sal_subappalto FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END$$;

COMMIT;
