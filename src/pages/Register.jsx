import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Eye, EyeOff, Mail, User, Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    email: searchParams.get('email') || '',
    full_name: '',
    password: '',
    confirm_password: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Se l'utente è già loggato, reindirizza alla dashboard
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };
    checkSession();
  }, [navigate]);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validazioni
    if (!formData.full_name.trim()) {
      setError('Inserisci il tuo nome completo');
      setIsLoading(false);
      return;
    }

    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Inserisci un indirizzo email valido');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('La password deve contenere almeno 8 caratteri');
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirm_password) {
      setError('Le password non corrispondono');
      setIsLoading(false);
      return;
    }

    try {
      // Sign up con Supabase
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name.trim()
          }
        }
      });

      if (signUpError) throw signUpError;

      toast.success(
        'Registrazione completata! Controlla la tua email per verificare l\'account.',
        { duration: 5000 }
      );

      // Reindirizza al login dopo 3 secondi
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (error) {
      console.error('Errore registrazione:', error);
      
      let errorMessage = error.message || 'Errore durante la registrazione';

      if (error.message?.includes('already been registered') || error.message?.includes('already registered')) {
        errorMessage = 'Questo indirizzo email è già registrato. Vai al login.';
      } else if (error.message?.includes('Invalid email')) {
        errorMessage = 'Indirizzo email non valido';
      } else if (error.message?.includes('Password should be')) {
        errorMessage = error.message;
      } else if (error.message?.includes('invite')) {
        errorMessage = null;
      }
      
      if (errorMessage) {
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center mb-3">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Crea il tuo account</h1>
          <p className="text-sm text-slate-500 mt-1 text-center">
            Completa la registrazione per accedere a Cantieri.pro
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome Completo */}
          <div className="space-y-1">
            <Label htmlFor="full_name">Nome e Cognome *</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="full_name"
                name="full_name"
                type="text"
                placeholder="Mario Rossi"
                value={formData.full_name}
                onChange={handleChange}
                required
                className="pl-10"
                autoFocus
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1">
            <Label htmlFor="email">Email *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="nome@azienda.it"
                value={formData.email}
                onChange={handleChange}
                required
                className="pl-10"
                readOnly={!!searchParams.get('email')}
              />
            </div>
            {searchParams.get('email') && (
              <p className="text-xs text-slate-500">Email precompilata dall'invito</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1">
            <Label htmlFor="password">Password *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimo 8 caratteri"
                value={formData.password}
                onChange={handleChange}
                required
                className="pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Conferma Password */}
          <div className="space-y-1">
            <Label htmlFor="confirm_password">Conferma Password *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="confirm_password"
                name="confirm_password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Ripeti la password"
                value={formData.confirm_password}
                onChange={handleChange}
                required
                className="pl-10"
              />
            </div>
          </div>

          {/* Errore */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Submit */}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Registrazione in corso...
              </>
            ) : (
              'Registrati'
            )}
          </Button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-slate-600">
          Hai già un account?{' '}
          <Link to="/login" className="text-orange-600 hover:text-orange-700 font-medium">
            Accedi
          </Link>
        </div>
      </div>
    </div>
  );
}
