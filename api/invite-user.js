import { createClient } from '@supabase/supabase-js'

const SMTP_CONFIG = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
}

function parseAllowedOrigins(req) {
  const configured = [
    process.env.ALLOWED_ORIGINS || '',
    process.env.APP_URL || '',
    process.env.VITE_APP_URL || '',
    process.env.VITE_SITE_URL || '',
    process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '',
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
  ]
    .join(',')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (process.env.NODE_ENV !== 'production') {
    configured.push('http://localhost:5173', 'http://localhost:4173');
  }

  return Array.from(new Set(configured));
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  const allowedOrigins = parseAllowedOrigins(req);

  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
}

async function sendEmail(to, subject, html) {
  const nodemailer = await import('nodemailer');
  
  const transporter = nodemailer.default.createTransport({
    host: SMTP_CONFIG.host,
    port: SMTP_CONFIG.port,
    secure: SMTP_CONFIG.secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: `"Cantieri.pro" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html
  });

  await transporter.close();
}

export default async function handler(req, res) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').trim();
    const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({ error: 'Variabili di ambiente mancanti' });
    }

    const authHeader = req.headers.authorization || '';
    const callerToken = authHeader.replace('Bearer ', '').trim();
    if (!callerToken) {
      return res.status(401).json({ error: 'Token mancante' });
    }

    const anonKey = (process.env.VITE_SUPABASE_ANON_KEY || '').trim();
    const supabaseAnon = createClient(supabaseUrl, anonKey);
    const { data: { user: callerUser }, error: callerError } = await supabaseAnon.auth.getUser(callerToken);
    if (callerError || !callerUser) {
      return res.status(401).json({ error: 'Token non valido' });
    }

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

    const { email, role_id } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Email non valida' });
    }

    // Controlla se l'utente esiste già
    const { data: existingUsers } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (existingUsers) {
      return res.status(409).json({ error: 'Questo indirizzo email è già registrato' });
    }

    // Salva il ruolo per quando l'utente si registrerà
    if (role_id) {
      await supabaseAdmin
        .from('user_invite_roles')
        .upsert([{
          email: email.toLowerCase().trim(),
          role_id: role_id,
          created_at: new Date().toISOString()
        }], { onConflict: 'email' });
    }

    // Invia email personalizzata con link alla registrazione
    const appUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL 
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'https://rcs.cantieri.pro';
    
    const registerUrl = `${appUrl}/register?email=${encodeURIComponent(email)}&invited=true`;

    await sendEmail(
      email,
      'Invito a Cantieri.pro',
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f97316;">Benvenuto su Cantieri.pro!</h2>
          <p>Ciao,</p>
          <p>Sei stato invitato a unirti a <strong>Cantieri.pro</strong>.</p>
          <p>Clicca sul pulsante sottostante per completare la registrazione e impostare la tua password:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${registerUrl}" style="display: inline-block; padding: 14px 28px; background-color: #f97316; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
              🚀 Registrati ora
            </a>
          </p>
          <p>Oppure copia e incolla questo link nel browser:</p>
          <p style="word-break: break-all; color: #666; background: #f3f4f6; padding: 10px; border-radius: 4px;">${registerUrl}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #6b7280; font-size: 14px;">
            Dopo la registrazione potrai accedere con la tua password ogni volta che vuoi.
          </p>
          <p style="color: #6b7280; font-size: 14px;">
            Se non ti aspetti questa email, puoi tranquillamente ignorarla.
          </p>
          <p><strong>Cantieri.pro Team</strong></p>
        </div>
      `
    );

    return res.status(200).json({ 
      success: true, 
      message: 'Email di invito inviata con successo',
      registerUrl
    });

  } catch (error) {
    console.error('[invite-user] Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Errore interno',
      hint: 'Verifica che le variabili SMTP_USER e SMTP_PASS siano configurate su Vercel'
    });
  }
}
