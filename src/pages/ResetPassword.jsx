import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, ArrowLeft, Mail } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const isRecovered = searchParams.get('recovered') === 'true';
  
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Se l'utente arriva dal link di recovery, Supabase gestisce già il reset
    if (isRecovered) {
      // Mostra un messaggio di benvenuto per il reset
      console.log('Utente arrivato da recovery password');
    }
  }, [isRecovered]);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback#recover-password`
      });

      if (error) throw error;

      setIsSuccess(true);
    } catch (error) {
      console.error('Errore reset password:', error);
      setError(error.message || 'Si è verificato un errore. Riprova.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center mb-3">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Recupera Password</h1>
          <p className="text-sm text-slate-500 mt-1 text-center">
            {isSuccess 
              ? 'Controlla la tua email' 
              : 'Inserisci la tua email per recuperare la password'}
          </p>
        </div>

        {!isSuccess ? (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
              <div className="flex gap-2">
                <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800">
                  Ti invieremo un link per reimpostare la password all'indirizzo email fornito.
                </p>
              </div>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nome@azienda.it"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Invio in corso...' : 'Invia Link di Recupero'}
              </Button>
            </form>

            <div className="mt-6">
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 text-sm text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="w-4 h-4" />
                Torna al login
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <Mail className="w-12 h-12 text-green-600 mx-auto mb-2" />
              <p className="text-sm text-green-800 font-medium">
                Email inviata con successo!
              </p>
              <p className="text-xs text-green-700 mt-2">
                Controlla la tua casella di posta e clicca sul link per reimpostare la password.
              </p>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setIsSuccess(false);
                setEmail('');
              }}
            >
              Invia un'altra email
            </Button>

            <Link
              to="/login"
              className="flex items-center justify-center gap-2 text-sm text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Torna al login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
