-- Migration: allinea colonne tabella imprese al form UI
-- Eseguire nel SQL Editor di Supabase

ALTER TABLE public.imprese
  ADD COLUMN IF NOT EXISTS ragione_sociale          TEXT,
  ADD COLUMN IF NOT EXISTS rappresentante_legale    TEXT,
  ADD COLUMN IF NOT EXISTS indirizzo_legale         TEXT,
  ADD COLUMN IF NOT EXISTS cap_legale               TEXT,
  ADD COLUMN IF NOT EXISTS citta_legale             TEXT,
  ADD COLUMN IF NOT EXISTS provincia_legale         TEXT,
  ADD COLUMN IF NOT EXISTS codice_sdi               TEXT,
  ADD COLUMN IF NOT EXISTS banca_appoggio           TEXT,
  ADD COLUMN IF NOT EXISTS iban                     TEXT,
  ADD COLUMN IF NOT EXISTS referente_impresa_id     UUID,
  ADD COLUMN IF NOT EXISTS responsabile_sicurezza_id UUID;

-- Copia denominazione → ragione_sociale per le righe esistenti
UPDATE public.imprese
SET ragione_sociale = denominazione
WHERE ragione_sociale IS NULL AND denominazione IS NOT NULL;
