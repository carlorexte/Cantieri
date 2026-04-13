-- Aggiunge colonne legacy mancanti alla tabella documenti
-- per risolvere errore 400 durante la creazione documenti

ALTER TABLE public.documenti
  ADD COLUMN IF NOT EXISTS entita_collegata_id TEXT,
  ADD COLUMN IF NOT EXISTS entita_collegata_tipo TEXT;

-- Verifica
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'documenti' 
  AND column_name IN ('entita_collegate', 'entita_collegata_id', 'entita_collegata_tipo')
ORDER BY column_name;
