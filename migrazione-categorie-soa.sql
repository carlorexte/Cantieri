-- Migrazione: Normalizza le chiavi delle categorie SOA da {categoria, classifica} a {category, classification}
-- Esegui questa query una sola volta nella dashboard Supabase → SQL Editor

UPDATE cantieri
SET categorie_soa = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'category', COALESCE(item->>'categoria', item->>'category', ''),
      'classification', COALESCE(item->>'classifica', item->>'classification', '')
    )
  )
  FROM jsonb_array_elements(categorie_soa) AS item
)
WHERE categorie_soa IS NOT NULL 
  AND jsonb_typeof(categorie_soa) = 'array'
  AND jsonb_array_length(categorie_soa) > 0
  AND EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(categorie_soa) AS item 
    WHERE item ? 'categoria' OR item ? 'classifica'
  );

-- Verifica il risultato
SELECT 
  id,
  denominazione,
  categorie_soa
FROM cantieri 
WHERE categorie_soa IS NOT NULL 
  AND jsonb_array_length(categorie_soa) > 0
LIMIT 10;
