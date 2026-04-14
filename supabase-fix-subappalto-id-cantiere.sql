-- Fix colonna legacy id_cantiere nella tabella subappalto
-- Esegui in Supabase → SQL Editor

-- Rende id_cantiere nullable (è una colonna legacy, cantiere_id è quella canonica)
ALTER TABLE public.subappalto ALTER COLUMN id_cantiere DROP NOT NULL;

-- Sincronizza i valori esistenti dove mancanti
UPDATE public.subappalto
SET id_cantiere = cantiere_id
WHERE id_cantiere IS NULL AND cantiere_id IS NOT NULL;
