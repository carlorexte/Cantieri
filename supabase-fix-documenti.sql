-- Fix completo tabella documenti
-- Aggiunge colonna entita_collegate se non esiste
ALTER TABLE public.documenti
  ADD COLUMN IF NOT EXISTS entita_collegate JSONB DEFAULT '[]'::jsonb;

-- Verifica struttura
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'documenti'
ORDER BY ordinal_position;
