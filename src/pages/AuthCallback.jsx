import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallback() {
  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Implicit flow: #access_token=... in hash
        const hash = window.location.hash;
        if (hash) {
          const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          if (access_token && refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token });
            window.location.replace('/');
            return;
          }
        }

        // PKCE flow: ?code=... in query string
        const code = new URLSearchParams(window.location.search).get('code');
        if (code) {
          await supabase.auth.exchangeCodeForSession(window.location.href);
          window.location.replace('/');
          return;
        }

        // No token/code found — just go home
        window.location.replace('/');
      } catch (err) {
        console.error('AuthCallback error:', err);
        window.location.replace('/');
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}
