-- Fix permessi ruolo Amministratore: aggiunge is_admin:true e documenti completi
-- Esegui in Supabase → SQL Editor

-- 1. Aggiunge is_admin al ruolo Amministratore di sistema
UPDATE public.ruoli
SET permessi = permessi || '{"is_admin": true}'::jsonb
WHERE id = '00000000-0000-0000-0000-000000000001'
   OR nome ILIKE '%amministrat%'
   OR nome ILIKE '%admin%';

-- 2. Assicura che tutti i profili con role='admin' abbiano anche il ruolo_id corretto
UPDATE public.profiles
SET ruolo_id = '00000000-0000-0000-0000-000000000001'
WHERE role = 'admin'
  AND (ruolo_id IS NULL
   OR ruolo_id NOT IN (
       SELECT id FROM public.ruoli WHERE nome ILIKE '%amministrat%' OR nome ILIKE '%admin%'
   ));

-- 3. Verifica: mostra tutti gli utenti admin e il loro ruolo
SELECT 
  p.id,
  p.email,
  p.role,
  r.nome AS ruolo_nome,
  r.permessi->>'is_admin' AS is_admin_flag,
  r.permessi->'documenti' AS documenti_perms
FROM public.profiles p
LEFT JOIN public.ruoli r ON r.id = p.ruolo_id
WHERE p.role = 'admin'
   OR r.nome ILIKE '%amministrat%'
   OR r.nome ILIKE '%admin%';
