-- Fix RLS policy per tabella subappalto
-- Esegui in Supabase → SQL Editor

-- Assicura RLS attivo
ALTER TABLE public.subappalto ENABLE ROW LEVEL SECURITY;

-- Crea policy se non esiste già
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'subappalto' AND policyname = 'subappalto_auth'
  ) THEN
    CREATE POLICY "subappalto_auth"
      ON public.subappalto
      FOR ALL
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END$$;
