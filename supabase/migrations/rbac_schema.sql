-- ============================================================
-- RBAC MIGRATION: profiles, ruoli, teams, team_members, team_cantieri
-- ============================================================

BEGIN;

-- ============================================================
-- 1. TABELLA RUOLI (prima di profiles per la FK)
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
-- 2. TABELLA PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id                      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                   TEXT NOT NULL,
  full_name               TEXT,
  avatar_url              TEXT,
  role                    TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  ruolo_id                UUID REFERENCES public.ruoli(id) ON DELETE SET NULL,
  force_all_cantieri_view BOOLEAN NOT NULL DEFAULT false,
  cantieri_assegnati      UUID[] NOT NULL DEFAULT '{}',
  created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
-- 6. HELPER FUNCTIONS (prima delle RLS policy)
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
-- 7. TRIGGER: crea profile automaticamente al signup
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
  ON CONFLICT (id) DO NOTHING;
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

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_ruoli_updated_at    BEFORE UPDATE ON public.ruoli    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_teams_updated_at    BEFORE UPDATE ON public.teams    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 8. ROW LEVEL SECURITY
-- ============================================================

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select"        ON public.profiles FOR SELECT USING (id = auth.uid() OR is_admin());
CREATE POLICY "profiles_update_own"    ON public.profiles FOR UPDATE USING (id = auth.uid() OR is_admin());
CREATE POLICY "profiles_insert_admin"  ON public.profiles FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "profiles_delete_admin"  ON public.profiles FOR DELETE USING (is_admin());

-- RUOLI
ALTER TABLE public.ruoli ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ruoli_select"       ON public.ruoli FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ruoli_write_admin"  ON public.ruoli FOR ALL    USING (is_admin()) WITH CHECK (is_admin());

-- TEAMS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teams_select"       ON public.teams FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "teams_write_admin"  ON public.teams FOR ALL    USING (is_admin()) WITH CHECK (is_admin());

-- TEAM_MEMBERS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_members_select"      ON public.team_members FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "team_members_write_admin" ON public.team_members FOR ALL    USING (is_admin()) WITH CHECK (is_admin());

-- TEAM_CANTIERI
ALTER TABLE public.team_cantieri ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_cantieri_select"      ON public.team_cantieri FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "team_cantieri_write_admin" ON public.team_cantieri FOR ALL    USING (is_admin()) WITH CHECK (is_admin());

-- CANTIERI (abilita RLS se non gia' abilitato)
ALTER TABLE public.cantieri ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cantieri_select"       ON public.cantieri;
DROP POLICY IF EXISTS "cantieri_insert_admin" ON public.cantieri;
DROP POLICY IF EXISTS "cantieri_update"       ON public.cantieri;
DROP POLICY IF EXISTS "cantieri_delete_admin" ON public.cantieri;
CREATE POLICY "cantieri_select"       ON public.cantieri FOR SELECT USING (is_admin() OR force_all_cantieri_view_check() OR id = ANY(get_my_cantiere_ids()));
CREATE POLICY "cantieri_insert_admin" ON public.cantieri FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "cantieri_update"       ON public.cantieri FOR UPDATE USING (is_admin() OR id = ANY(get_my_cantiere_ids()));
CREATE POLICY "cantieri_delete_admin" ON public.cantieri FOR DELETE USING (is_admin());

-- ATTIVITA
ALTER TABLE public.attivita ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "attivita_select" ON public.attivita;
DROP POLICY IF EXISTS "attivita_insert" ON public.attivita;
DROP POLICY IF EXISTS "attivita_update" ON public.attivita;
DROP POLICY IF EXISTS "attivita_delete" ON public.attivita;
CREATE POLICY "attivita_select" ON public.attivita FOR SELECT USING (is_admin() OR force_all_cantieri_view_check() OR cantiere_id = ANY(get_my_cantiere_ids()));
CREATE POLICY "attivita_insert" ON public.attivita FOR INSERT WITH CHECK (is_admin() OR cantiere_id = ANY(get_my_cantiere_ids()));
CREATE POLICY "attivita_update" ON public.attivita FOR UPDATE USING (is_admin() OR cantiere_id = ANY(get_my_cantiere_ids()));
CREATE POLICY "attivita_delete" ON public.attivita FOR DELETE USING (is_admin() OR cantiere_id = ANY(get_my_cantiere_ids()));

-- IMPRESE (anagrafica condivisa - tutti la vedono)
ALTER TABLE public.imprese ENABLE ROW LEVEL SECURITY;
CREATE POLICY "imprese_select_auth"  ON public.imprese FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "imprese_write_admin"  ON public.imprese FOR ALL    USING (is_admin()) WITH CHECK (is_admin());

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

COMMIT;
