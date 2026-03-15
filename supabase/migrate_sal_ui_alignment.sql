-- Allinea la tabella public.sal al modello usato dalla UI SAL e dal cronoprogramma.
-- Sicuro da rieseguire: aggiunge solo colonne mancanti e prova a migrare i dati legacy.

BEGIN;

ALTER TABLE IF EXISTS public.sal
  ADD COLUMN IF NOT EXISTS cantiere_id UUID REFERENCES public.cantieri(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS tipo_prestazione TEXT DEFAULT 'lavori',
  ADD COLUMN IF NOT EXISTS tipo_sal_dettaglio TEXT DEFAULT 'sal_progressivo',
  ADD COLUMN IF NOT EXISTS numero_sal INTEGER,
  ADD COLUMN IF NOT EXISTS data_sal DATE,
  ADD COLUMN IF NOT EXISTS descrizione TEXT,
  ADD COLUMN IF NOT EXISTS numero_fattura TEXT,
  ADD COLUMN IF NOT EXISTS data_fattura DATE,
  ADD COLUMN IF NOT EXISTS imponibile NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS iva_percentuale NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS iva_importo NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS totale_fattura NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS data_pagamento DATE,
  ADD COLUMN IF NOT EXISTS importo_pagato NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS importo_anticipo_erogato NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS data_anticipo_erogato DATE,
  ADD COLUMN IF NOT EXISTS file_uri TEXT,
  ADD COLUMN IF NOT EXISTS stato_pagamento TEXT DEFAULT 'da_fatturare';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sal' AND column_name = 'numero'
  ) THEN
    EXECUTE 'UPDATE public.sal SET numero_sal = COALESCE(numero_sal, numero) WHERE numero_sal IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sal' AND column_name = 'data'
  ) THEN
    EXECUTE 'UPDATE public.sal SET data_sal = COALESCE(data_sal, data) WHERE data_sal IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sal' AND column_name = 'importo'
  ) THEN
    EXECUTE 'UPDATE public.sal SET imponibile = COALESCE(imponibile, importo), totale_fattura = COALESCE(totale_fattura, importo) WHERE imponibile IS NULL OR totale_fattura IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sal' AND column_name = 'note'
  ) THEN
    EXECUTE 'UPDATE public.sal SET descrizione = COALESCE(descrizione, note) WHERE descrizione IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sal' AND column_name = 'stato'
  ) THEN
    EXECUTE $map$
      UPDATE public.sal
      SET stato_pagamento = COALESCE(
        stato_pagamento,
        CASE
          WHEN stato = 'pagato' THEN 'incassato'
          WHEN stato IN ('approvato', 'inviato') THEN 'fatturato'
          ELSE 'da_fatturare'
        END
      )
    $map$;
  END IF;
END $$;

UPDATE public.sal
SET
  tipo_prestazione = COALESCE(tipo_prestazione, 'lavori'),
  tipo_sal_dettaglio = COALESCE(tipo_sal_dettaglio, 'sal_progressivo'),
  stato_pagamento = COALESCE(stato_pagamento, 'da_fatturare'),
  iva_percentuale = COALESCE(iva_percentuale, 10)
WHERE TRUE;

CREATE INDEX IF NOT EXISTS idx_sal_cantiere_id ON public.sal(cantiere_id);
CREATE INDEX IF NOT EXISTS idx_sal_data_sal ON public.sal(data_sal);
CREATE INDEX IF NOT EXISTS idx_sal_stato_pagamento ON public.sal(stato_pagamento);

COMMIT;
