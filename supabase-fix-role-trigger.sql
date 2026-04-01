-- ============================================
-- CORREZIONE: Trigger per assegnare ruolo correttamente
-- ============================================

-- Drop del trigger esistente
DROP TRIGGER IF EXISTS on_user_created ON auth.users;

-- Funzione CORRETTA
CREATE OR REPLACE FUNCTION assign_role_to_new_user()
RETURNS TRIGGER AS $$
DECLARE
  saved_role_id UUID;
  default_role_id UUID;
BEGIN
  -- 1. Cerca se c'è un ruolo salvato per questa email (da invito)
  SELECT role_id INTO saved_role_id
  FROM user_invite_roles
  WHERE email = NEW.email;
  
  -- 2. Se trovato, assegna il ruolo selezionato
  IF saved_role_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id, created_date, updated_date)
    VALUES (NEW.id, saved_role_id, NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;
    
    DELETE FROM user_invite_roles WHERE email = NEW.email;
    
    RAISE NOTICE 'Ruolo da invito % assegnato all''utente %', saved_role_id, NEW.email;
    RETURN NEW;
  END IF;
  
  -- 3. Nessun ruolo salvato, cerca il ruolo DEFAULT (primo ruolo disponibile)
  SELECT id INTO default_role_id
  FROM ruoli
  WHERE is_default = TRUE
  LIMIT 1;
  
  -- 4. Se non esiste is_default, cerca per nome
  IF default_role_id IS NULL THEN
    SELECT id INTO default_role_id
    FROM ruoli
    WHERE LOWER(nome) IN ('member', 'membres', 'utente', 'user')
    LIMIT 1;
  END IF;
  
  -- 5. Se ancora nulla, prendi il primo ruolo in assoluto
  IF default_role_id IS NULL THEN
    SELECT id INTO default_role_id
    FROM ruoli
    ORDER BY created_date ASC
    LIMIT 1;
  END IF;
  
  -- 6. Assegna il ruolo trovato
  IF default_role_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id, created_date, updated_date)
    VALUES (NEW.id, default_role_id, NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;
    
    RAISE NOTICE 'Ruolo default % assegnato all''utente %', default_role_id, NEW.email;
  ELSE
    RAISE WARNING 'Nessun ruolo disponibile nel sistema!';
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Errore in assign_role: % - %', SQLSTATE, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ricrea il trigger
CREATE TRIGGER on_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION assign_role_to_new_user();

-- ============================================
-- DEBUG: Verifica ruoli esistenti
-- ============================================

-- Esegui questo per vedere quali ruoli hai:
-- SELECT id, nome, is_default FROM ruoli;
