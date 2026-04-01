-- ============================================
-- TABELLA: Salva i ruoli per gli inviti
-- ============================================

CREATE TABLE IF NOT EXISTS user_invite_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  role_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_invite_roles_email ON user_invite_roles(email);

COMMENT ON TABLE user_invite_roles IS 'Tabella temporanea per salvare il ruolo associato agli inviti email';

-- ============================================
-- TRIGGER: Assegna ruolo automaticamente ai nuovi utenti
-- ============================================

CREATE OR REPLACE FUNCTION assign_role_to_new_user()
RETURNS TRIGGER AS $$
DECLARE
  saved_role_id UUID;
  member_role_id UUID;
BEGIN
  -- Cerca se c'è un ruolo salvato per questa email
  SELECT role_id INTO saved_role_id
  FROM user_invite_roles
  WHERE email = NEW.email;
  
  -- Se trovato, assegna il ruolo
  IF saved_role_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id, created_date, updated_date)
    VALUES (NEW.id, saved_role_id, NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Pulisci il record temporaneo
    DELETE FROM user_invite_roles WHERE email = NEW.email;
    
    RAISE NOTICE 'Ruolo % assegnato all''utente %', saved_role_id, NEW.email;
  ELSE
    -- Nessun ruolo salvato, cerca il ruolo "member"
    SELECT id INTO member_role_id
    FROM ruoli
    WHERE nome = 'member';
    
    -- Assegna member o il primo ruolo disponibile
    IF member_role_id IS NOT NULL THEN
      INSERT INTO user_roles (user_id, role_id, created_date, updated_date)
      VALUES (NEW.id, member_role_id, NOW(), NOW())
      ON CONFLICT (user_id) DO NOTHING;
    ELSE
      -- Se non esiste member, prendi il primo ruolo disponibile
      INSERT INTO user_roles (user_id, role_id, created_date, updated_date)
      SELECT NEW.id, id, NOW(), NOW()
      FROM ruoli
      LIMIT 1
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
    
    RAISE NOTICE 'Ruolo member assegnato di default all''utente %', NEW.email;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crea il trigger su auth.users
DROP TRIGGER IF EXISTS on_user_created ON auth.users;
CREATE TRIGGER on_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION assign_role_to_new_user();
