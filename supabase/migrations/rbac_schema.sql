-- ============================================================
-- RBAC MIGRATION v2 - idempotente (sicuro da eseguire più volte)
-- ============================================================

BEGIN;

-- ============================================================
-- 1. TABELLA RUOLI
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ruoli (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT NOT NULL UNIQUE,
  descrizione TEXT,
  permessi    JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_system   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ruoli_is_system ON public.ruoli(is_system);

-- ============================================================
-- 2. TABELLA PROFILES (aggiunge colonne se già esiste)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Aggiunge le colonne mancanti (safe se già esistono)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email                   TEXT,
  ADD COLUMN IF NOT EXISTS full_name               TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url              TEXT,
  ADD COLUMN IF NOT EXISTS role                    TEXT NOT NULL DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS ruolo_id                UUID,
  ADD COLUMN IF NOT EXISTS force_all_cantieri_view BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cantieri_assegnati      UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Aggiunge constraint CHECK su role se non esiste
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_role_check' AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'member'));
  END IF;
END$$;

-- Aggiunge FK su ruolo_id se non esiste
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_ruolo_id_fkey' AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_ruolo_id_fkey
      FOREIGN KEY (ruolo_id) REFERENCES public.ruoli(id) ON DELETE SET NULL;
  END IF;
END$$;

-- Aggiorna email dai dati auth per righe esistenti senza email
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');

CREATE INDEX IF NOT EXISTS idx_profiles_email  ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role   ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_ruolo  ON public.profiles(ruolo_id);

-- ============================================================
-- 3. TABELLA TEAMS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.teams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT NOT NULL,
  descrizione TEXT,
  colore      TEXT DEFAULT '#3b82f6',
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 4. TABELLA TEAM_MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.team_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  profile_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ruolo_id    UUID REFERENCES public.ruoli(id) ON DELETE SET NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team    ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_profile ON public.team_members(profile_id);

-- ============================================================
-- 5. TABELLA TEAM_CANTIERI
-- ============================================================
CREATE TABLE IF NOT EXISTS public.team_cantieri (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  cantiere_id UUID NOT NULL REFERENCES public.cantieri(id) ON DELETE CASCADE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, cantiere_id)
);

CREATE INDEX IF NOT EXISTS idx_team_cantieri_team     ON public.team_cantieri(team_id);
CREATE INDEX IF NOT EXISTS idx_team_cantieri_cantiere ON public.team_cantieri(cantiere_id);

-- ============================================================
-- 6. HELPER FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.force_all_cantieri_view_check()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND force_all_cantieri_view = true
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_cantiere_ids()
RETURNS UUID[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ARRAY(
    SELECT DISTINCT unnest_id FROM (
      SELECT unnest(cantieri_assegnati) AS unnest_id
      FROM public.profiles WHERE id = auth.uid()
      UNION
      SELECT tc.cantiere_id AS unnest_id
      FROM public.team_members tm
      JOIN public.team_cantieri tc ON tc.team_id = tm.team_id
      WHERE tm.profile_id = auth.uid()
    ) AS combined
  );
$$;

-- ============================================================
-- 7. TRIGGER: crea/aggiorna profile al signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM public.profiles LIMIT 1) THEN 'admin'
      ELSE 'member'
    END
  )
  ON CONFLICT (id) DO UPDATE
    SET email     = EXCLUDED.email,
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS set_ruoli_updated_at    ON public.ruoli;
DROP TRIGGER IF EXISTS set_teams_updated_at    ON public.teams;
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_ruoli_updated_at    BEFORE UPDATE ON public.ruoli    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_teams_updated_at    BEFORE UPDATE ON public.teams    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 8. ROW LEVEL SECURITY
-- ============================================================

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select"       ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;
CREATE POLICY "profiles_select"        ON public.profiles FOR SELECT USING (id = auth.uid() OR is_admin());
CREATE POLICY "profiles_update_own"    ON public.profiles FOR UPDATE USING (id = auth.uid() OR is_admin());
CREATE POLICY "profiles_insert_admin"  ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "profiles_delete_admin"  ON public.profiles FOR DELETE USING (is_admin());

-- RUOLI
ALTER TABLE public.ruoli ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ruoli_select"      ON public.ruoli;
DROP POLICY IF EXISTS "ruoli_write_admin" ON public.ruoli;
CREATE POLICY "ruoli_select"       ON public.ruoli FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ruoli_write_admin"  ON public.ruoli FOR ALL    USING (is_admin()) WITH CHECK (is_admin());

-- TEAMS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "teams_select"      ON public.teams;
DROP POLICY IF EXISTS "teams_write_admin" ON public.teams;
CREATE POLICY "teams_select"       ON public.teams FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "teams_write_admin"  ON public.teams FOR ALL    USING (is_admin()) WITH CHECK (is_admin());

-- TEAM_MEMBERS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "team_members_select"      ON public.team_members;
DROP POLICY IF EXISTS "team_members_write_admin" ON public.team_members;
CREATE POLICY "team_members_select"      ON public.team_members FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "team_members_write_admin" ON public.team_members FOR ALL    USING (is_admin()) WITH CHECK (is_admin());

-- TEAM_CANTIERI
ALTER TABLE public.team_cantieri ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "team_cantieri_select"      ON public.team_cantieri;
DROP POLICY IF EXISTS "team_cantieri_write_admin" ON public.team_cantieri;
CREATE POLICY "team_cantieri_select"      ON public.team_cantieri FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "team_cantieri_write_admin" ON public.team_cantieri FOR ALL    USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================
-- 9. SEED RUOLI DI SISTEMA
-- ============================================================
INSERT INTO public.ruoli (id, nome, descrizione, permessi, is_system) VALUES
(
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Amministratore',
  'Accesso completo a tutti i moduli e funzionalità',
  '{
    "dashboard":        {"view": true},
    "cantieri":         {"view": true, "edit": true, "create": true, "admin": {"delete": true, "archive": true}},
    "sal":              {"view": true, "edit": true, "create": true, "admin": {"delete": true, "approve": true}},
    "costi":            {"view": true, "edit": true, "create": true, "admin": {"delete": true}},
    "documenti":        {"view": true, "edit": true, "create": true, "admin": {"delete": true, "archive": true}},
    "imprese":          {"view": true, "edit": true, "create": true, "admin": {"delete": true}},
    "persone":          {"view": true, "edit": true, "create": true, "admin": {"delete": true}},
    "subappalti":       {"view": true, "edit": true, "create": true, "admin": {"delete": true}},
    "attivita_interne": {"view": true, "edit": true, "create": true, "admin": {"delete": true}},
    "ordini_materiale": {"view": true, "edit": true, "create": true, "admin": {"delete": true, "accept": true}},
    "cronoprogramma":   {"view": true, "edit": true},
    "profilo_azienda":  {"view": true, "edit": true},
    "user_management":  {"view": true, "manage_users": true, "manage_roles": true, "manage_cantiere_permissions": true},
    "ai_assistant":     {"view": true}
  }'::jsonb,
  true
),
(
  '00000000-0000-0000-0000-000000000002'::uuid,
  'Direttore Cantiere',
  'Accesso completo al cantiere assegnato: cronoprogramma, ordini, task',
  '{
    "dashboard":        {"view": true},
    "cantieri":         {"view": true, "edit": true},
    "sal":              {"view": true, "edit": true, "create": true},
    "costi":            {"view": true, "edit": true, "create": true},
    "documenti":        {"view": true, "edit": true, "create": true},
    "imprese":          {"view": true},
    "persone":          {"view": true},
    "subappalti":       {"view": true, "edit": true, "create": true},
    "attivita_interne": {"view": true, "edit": true, "create": true, "admin": {"delete": true}},
    "ordini_materiale": {"view": true, "edit": true, "create": true, "admin": {"accept": true}},
    "cronoprogramma":   {"view": true, "edit": true},
    "profilo_azienda":  {"view": true},
    "user_management":  {"view": false},
    "ai_assistant":     {"view": true}
  }'::jsonb,
  true
),
(
  '00000000-0000-0000-0000-000000000003'::uuid,
  'Visualizzatore',
  'Accesso in sola lettura a tutti i moduli',
  '{
    "dashboard":        {"view": true},
    "cantieri":         {"view": true},
    "sal":              {"view": true},
    "costi":            {"view": true},
    "documenti":        {"view": true},
    "imprese":          {"view": true},
    "persone":          {"view": true},
    "subappalti":       {"view": true},
    "attivita_interne": {"view": true},
    "ordini_materiale": {"view": true},
    "cronoprogramma":   {"view": true},
    "profilo_azienda":  {"view": true},
    "user_management":  {"view": false},
    "ai_assistant":     {"view": false}
  }'::jsonb,
  true
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 10. CREA PROFILI PER UTENTI GIA' ESISTENTI
-- ============================================================
INSERT INTO public.profiles (id, email, full_name, role)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  CASE
    WHEN ROW_NUMBER() OVER (ORDER BY u.created_at) = 1 THEN 'admin'
    ELSE 'member'
  END
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

COMMIT;
