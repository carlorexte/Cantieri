import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').trim();
    const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({ error: 'Variabili di ambiente mancanti: VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY' });
    }

    // Verifica che il chiamante sia un admin tramite il suo JWT
    const authHeader = req.headers.authorization || '';
    const callerToken = authHeader.replace('Bearer ', '').trim();
    if (!callerToken) {
      return res.status(401).json({ error: 'Token di autenticazione mancante' });
    }

    const anonKey = (process.env.VITE_SUPABASE_ANON_KEY || '').trim();
    const supabaseAnon = createClient(supabaseUrl, anonKey);
    const { data: { user: callerUser }, error: callerError } = await supabaseAnon.auth.getUser(callerToken);
    if (callerError || !callerUser) {
      return res.status(401).json({ error: 'Token non valido' });
    }

    // Controlla che il chiamante sia admin su profiles (role legacy o RBAC)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, ruolo:ruoli(nome, permessi)')
      .eq('id', callerUser.id)
      .single();

    const isLegacyAdmin = callerProfile?.role === 'admin';
    const isRbacAdmin = callerProfile?.ruolo?.nome?.toLowerCase() === 'admin' ||
      callerProfile?.ruolo?.permessi?.is_admin === true;

    if (!isLegacyAdmin && !isRbacAdmin) {
      return res.status(403).json({ error: 'Solo gli admin possono invitare utenti' });
    }

    const { email, redirectTo } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Email non valida' });
    }

    const inviteOptions = {};
    if (redirectTo) inviteOptions.redirectTo = redirectTo;

    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, inviteOptions);
    if (error) {
      if (error.message?.includes('already been registered')) {
        return res.status(409).json({ error: 'Questo indirizzo email è già registrato' });
      }
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ success: true, userId: data.user?.id });

  } catch (error) {
    console.error('[invite-user] Error:', error);
    return res.status(500).json({ error: error.message || 'Errore interno del server' });
  }
}
