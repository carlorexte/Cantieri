-- Reset categorie_soa per tutti i cantieri con dati vuoti o corrotti
-- Esegui nella dashboard Supabase → SQL Editor

UPDATE cantieri
SET categorie_soa = '[]'::jsonb
WHERE categorie_soa IS NOT NULL
  AND jsonb_typeof(categorie_soa) = 'array'
  AND (
    -- Contiene oggetti con chiavi vuote
    jsonb_array_length(categorie_soa) > 0
    AND EXISTS (
      SELECT 1 
      FROM jsonb_array_elements(categorie_soa) AS item 
      WHERE (item->>'category' = '' OR item->>'category' IS NULL)
         OR (item->>'classification' = '' OR item->>'classification' IS NULL)
    )
  );

-- Verifica che sia stato resettato
SELECT 
  id,
  denominazione,
  categorie_soa
FROM cantieri 
WHERE categorie_soa != '[]'::jsonb
  OR categorie_soa IS NULL;
