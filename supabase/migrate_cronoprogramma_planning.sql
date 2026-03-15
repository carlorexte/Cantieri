-- Migrazione cronoprogramma verso modello planning professionale
-- Eseguire nel SQL editor di Supabase.

ALTER TABLE public.attivita
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.attivita(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vincolo_tipo TEXT,
  ADD COLUMN IF NOT EXISTS vincolo_data DATE,
  ADD COLUMN IF NOT EXISTS baseline_start_date DATE,
  ADD COLUMN IF NOT EXISTS baseline_end_date DATE;

CREATE INDEX IF NOT EXISTS idx_attivita_parent ON public.attivita(parent_id);
CREATE INDEX IF NOT EXISTS idx_attivita_wbs ON public.attivita(wbs);

COMMENT ON COLUMN public.attivita.parent_id IS 'Relazione gerarchica WBS verso attività padre';
COMMENT ON COLUMN public.attivita.vincolo_tipo IS 'Vincolo planning: asap, snet, fnlt, mso, etc.';
COMMENT ON COLUMN public.attivita.vincolo_data IS 'Data del vincolo planning';
COMMENT ON COLUMN public.attivita.baseline_start_date IS 'Data inizio baseline';
COMMENT ON COLUMN public.attivita.baseline_end_date IS 'Data fine baseline';
