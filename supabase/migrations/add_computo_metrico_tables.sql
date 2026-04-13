-- ============================================================
-- MIGRAZIONE: Tabelle BIM 4D/5D per Computo Metrico e Contabilità (D.Lgs 36/2023)
-- ============================================================

BEGIN;

-- ============================================================
-- 1. TABELLA VOCI COMPUTO (Elenco Prezzi / Bill of Quantities)
-- Oggetti di base estratti dai prezzari o dal modello IFC.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.voci_computo (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cantiere_id             UUID REFERENCES public.cantieri(id) ON DELETE CASCADE,
    codice_elenco_prezzi    TEXT,                        -- es. "01.A02.C00"
    descrizione             TEXT NOT NULL,               -- Descrizione estesa della singola voce
    unita_misura            TEXT,                        -- mc, mq, kg, a corpo, ecc.
    prezzo_unitario         NUMERIC DEFAULT 0,           -- €/udm
    quantita_prevista       NUMERIC DEFAULT 0,           -- Q.tà totale derivante dal modello/computo
    importo_totale          NUMERIC GENERATED ALWAYS AS (prezzo_unitario * quantita_prevista) STORED,
    categoria               TEXT,                        -- es. "Scavi", "Fondazioni", "Strutture"
    guid_ifc                TEXT,                        -- Il famoso PONTE API con Runpod. L'ID dell'oggetto nel modello 3D
    note                    TEXT,
    created_date            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_date            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voci_computo_cantiere ON public.voci_computo(cantiere_id);
CREATE INDEX IF NOT EXISTS idx_voci_computo_guid ON public.voci_computo(guid_ifc);

-- ============================================================
-- 2. TABELLA COLLEGAMENTO: GANTT <-> COMPUTO (4D <-> 5D)
-- Una barra del Gantt può comprendere più voci di computo, e viceversa.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.attivita_voci_computo (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attivita_id             UUID REFERENCES public.attivita(id) ON DELETE CASCADE,
    voce_computo_id         UUID REFERENCES public.voci_computo(id) ON DELETE CASCADE,
    quantita_allocata       NUMERIC, -- Quanta parte della voce di computo è necessaria per questo task
    created_date            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_attivita_voci_unique ON public.attivita_voci_computo(attivita_id, voce_computo_id);

-- ============================================================
-- 3. TABELLA LIBRETTO DELLE MISURE (Il giornale di cantiere contabile)
-- Invece di stimare a occhio il SAL, si "misurano" i progressi fisici in cantiere.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.libretto_misure (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cantiere_id             UUID REFERENCES public.cantieri(id) ON DELETE CASCADE,
    voce_computo_id         UUID REFERENCES public.voci_computo(id) ON DELETE CASCADE,
    rilevatore_id           UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Chi ha preso le misure
    data_rilevazione        DATE NOT NULL,
    quantita_misurata       NUMERIC NOT NULL,
    parti_uguali            NUMERIC DEFAULT 1,           -- Modello italiano classico libretto: parti x lung x larg x alt
    lunghezza               NUMERIC,
    larghezza               NUMERIC,
    altezza                 NUMERIC,
    percentuale_completata  NUMERIC,                     -- Da usare alternativamente in caso di lavori "a corpo"
    stato_approvazione      TEXT DEFAULT 'bozza',        -- 'bozza', 'approvato_dl', 'respinto'
    sal_id                  UUID REFERENCES public.sal(id) ON DELETE SET NULL, -- Il SAL in cui questa misura è stata contabilizzata
    note                    TEXT,
    foto_url                TEXT,                        -- Prova fotografica dello stato di avanzamento
    created_date            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_date            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_libretto_misure_cantiere ON public.libretto_misure(cantiere_id);
CREATE INDEX IF NOT EXISTS idx_libretto_misure_sal ON public.libretto_misure(sal_id);

-- ============================================================
-- 4. TABELLA CERTIFICATI DI PAGAMENTO
-- L'atto ufficiale che sblocca i pagamenti dopo il SAL.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.certificati_pagamento (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cantiere_id             UUID REFERENCES public.cantieri(id) ON DELETE CASCADE,
    sal_id                  UUID REFERENCES public.sal(id) ON DELETE CASCADE,
    numero_certificato      INTEGER,
    data_emissione          DATE NOT NULL,
    importo_certificato     NUMERIC NOT NULL,
    ritenute_garanzia       NUMERIC DEFAULT 0,
    stato_pagamento         TEXT DEFAULT 'emesso',       -- 'emesso', 'pagato_parzialmente', 'saldato'
    file_uri                TEXT,
    note                    TEXT,
    created_date            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_date            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- ABILITAZIONE RLS (Row Level Security base)
-- ============================================================
ALTER TABLE public.voci_computo          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attivita_voci_computo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.libretto_misure       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificati_pagamento ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- Policy semplici per permettere uso a utenti autenticati. 
  -- TBD: perfezionare le policy RBAC nei prossimi step in funzione della Direzione Lavori vs Impresa.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='voci_computo' AND policyname='voci_auth') THEN
    CREATE POLICY "voci_auth" ON public.voci_computo FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='attivita_voci_computo' AND policyname='attiv_voci_auth') THEN
    CREATE POLICY "attiv_voci_auth" ON public.attivita_voci_computo FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='libretto_misure' AND policyname='libretto_auth') THEN
    CREATE POLICY "libretto_auth" ON public.libretto_misure FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='certificati_pagamento' AND policyname='certificati_auth') THEN
    CREATE POLICY "certificati_auth" ON public.certificati_pagamento FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END$$;

COMMIT;
