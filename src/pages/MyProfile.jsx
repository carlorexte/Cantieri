import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, User as UserIcon, LogIn } from "lucide-react";
import { toast } from "sonner";

export default function MyProfilePage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    role: ""
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      // Check if we are authenticated
      const isAuthenticated = await base44.auth.isAuthenticated();
      if (!isAuthenticated) {
        setIsGuest(true);
        setIsLoading(false);
        return;
      }

      const user = await base44.auth.me();
      setCurrentUser(user);
      setFormData({
        full_name: user.full_name || "",
        email: user.email || "",
        role: user.role || ""
      });
      setIsGuest(false);
    } catch (error) {
      console.error("Errore caricamento profilo:", error);
      // If 401/403, we are simply not logged in
      if (error?.status === 401 || error?.status === 403) {
        setIsGuest(true);
      } else {
        toast.error("Impossibile caricare il profilo utente.");
      }
    }
    setIsLoading(false);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.full_name.trim()) {
      toast.error("Il nome completo è obbligatorio.");
      return;
    }

    setIsSaving(true);
    try {
      await base44.auth.updateMe({
        full_name: formData.full_name.trim()
        // Note: email and role cannot be updated directly
      });
      toast.success("Profilo aggiornato con successo.");
      loadUserData(); // Ricarica i dati aggiornati
    } catch (error) {
      console.error("Errore salvataggio profilo:", error);
      toast.error("Errore durante il salvataggio del profilo.");
    }
    setIsSaving(false);
  };

  const handleLoginRedirect = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-64 mb-6"></div>
            <div className="h-64 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Il Mio Profilo</h1>

        {isGuest ? (
          <Card className="border-0 shadow-lg border-l-4 border-l-orange-500">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
                <div className="p-3 bg-orange-100 rounded-full">
                  <UserIcon className="w-8 h-8 text-orange-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-800">Accesso Richiesto</h2>
                <p className="text-slate-600 max-w-sm">
                  Per visualizzare e modificare il tuo profilo, devi effettuare l'accesso.
                </p>
                <Button onClick={handleLoginRedirect} className="bg-orange-600 hover:bg-orange-700">
                  <LogIn className="w-4 h-4 mr-2" />
                  Vai al Login
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-blue-600" />
                  Dati Anagrafici
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="full_name">Nome Completo</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleChange('full_name', e.target.value)}
                    placeholder="Inserisci il tuo nome completo"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={formData.email}
                    disabled
                    className="mt-1 bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    L'email non può essere modificata. Contatta l'amministratore per modifiche.
                  </p>
                </div>

                <div>
                  <Label htmlFor="role">Ruolo</Label>
                  <Input
                    id="role"
                    value={formData.role === 'admin' ? 'Amministratore' : 'Utente'}
                    disabled
                    className="mt-1 bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Il ruolo è assegnato dall'amministratore del sistema.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-blue-600 hover:bg-blue-700 shadow-lg"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? "Salvataggio..." : "Salva Modifiche"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Informazioni aggiuntive sul profilo */}
            <Card className="border-0 shadow-lg mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Informazioni Account</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-slate-700">Data Registrazione:</span>
                    <div className="text-slate-600">
                      {currentUser?.created_date
                        ? new Date(currentUser.created_date).toLocaleDateString('it-IT')
                        : 'N/D'
                      }
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">Ultimo Aggiornamento:</span>
                    <div className="text-slate-600">
                      {currentUser?.updated_date
                        ? new Date(currentUser.updated_date).toLocaleDateString('it-IT')
                        : 'N/D'
                      }
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}