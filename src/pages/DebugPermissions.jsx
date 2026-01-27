import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

export default function DebugPermissions() {
  const [authState, setAuthState] = useState({ loading: true, user: null, error: null });
  const [checks, setChecks] = useState({
    imprese: { status: 'pending', count: 0, error: null },
    persone: { status: 'pending', count: 0, error: null },
    sal: { status: 'pending', count: 0, error: null },
  });

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    // 1. Check Auth
    setAuthState(prev => ({ ...prev, loading: true }));
    let currentUser = null;
    try {
      currentUser = await base44.auth.me();
      setAuthState({ loading: false, user: currentUser, error: null });
    } catch (e) {
      setAuthState({ loading: false, user: null, error: e.message });
      return; // Stop if auth fails
    }

    // 2. Check Entities Access
    const entitiesToCheck = [
      { key: 'imprese', entity: base44.entities.Impresa },
      { key: 'persone', entity: base44.entities.PersonaEsterna },
      { key: 'sal', entity: base44.entities.SAL }
    ];

    for (const item of entitiesToCheck) {
      try {
        setChecks(prev => ({ ...prev, [item.key]: { status: 'loading', count: 0, error: null } }));
        const list = await item.entity.list(null, 5); // Try to fetch 5 items
        setChecks(prev => ({ 
          ...prev, 
          [item.key]: { status: 'success', count: list.length, error: null, dataSample: list } 
        }));
      } catch (e) {
        setChecks(prev => ({ 
          ...prev, 
          [item.key]: { status: 'error', count: 0, error: e.message || "Access Denied / Network Error" } 
        }));
      }
    }
  };

  const renderStatusIcon = (status) => {
    switch (status) {
      case 'loading': return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
      case 'success': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <div className="w-5 h-5 rounded-full bg-slate-200" />;
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Diagnostica Permessi</h1>
      
      <Card>
        <CardHeader><CardTitle>1. Stato Autenticazione</CardTitle></CardHeader>
        <CardContent>
          {authState.loading ? (
            <div className="flex items-center gap-2"><Loader2 className="animate-spin" /> Verifica in corso...</div>
          ) : authState.error ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Errore Auth</AlertTitle>
              <AlertDescription>{authState.error}</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600 font-medium">
                <CheckCircle2 /> Utente Loggato: {authState.user?.email}
              </div>
              <div className="bg-slate-50 p-4 rounded-md overflow-x-auto">
                <p className="text-xs font-mono text-slate-500 mb-2">Permessi Rilevati sull'Oggetto Utente:</p>
                <pre className="text-xs">
                  {JSON.stringify({
                    role: authState.user?.role,
                    imprese_view: authState.user?.imprese_view,
                    persone_view: authState.user?.persone_view,
                    sal_view: authState.user?.sal_view,
                    ruolo_id: authState.user?.ruolo_id
                  }, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>2. Test Accesso Dati</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(checks).map(([key, result]) => (
              <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {renderStatusIcon(result.status)}
                  <div>
                    <p className="font-medium capitalize">{key}</p>
                    <p className="text-sm text-slate-500">
                      {result.status === 'success' 
                        ? `Accesso OK - ${result.count} record recuperati (limite test: 5)` 
                        : result.status === 'error' ? `ERRORE: ${result.error}` : 'In attesa...'}
                    </p>
                    {result.status === 'success' && result.dataSample && (
                        <div className="mt-2 text-xs text-slate-400 bg-slate-900 p-2 rounded">
                            <p>Esempio ID: {result.dataSample[0]?.id}</p>
                        </div>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => runDiagnostics()}>Riprova</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>3. Analisi Utente Specifico (Backend)</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <input 
              type="text" 
              placeholder="Email utente da testare (es. carlorexte@gmail.com)"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              id="targetEmail"
            />
            <Button onClick={async () => {
                const email = document.getElementById('targetEmail').value;
                if(!email) return alert("Inserisci una email");
                
                // Show loading state
                const preNode = document.getElementById('analysisResult');
                if(preNode) preNode.innerText = "Analisi in corso... attendere...";
                
                try {
                    const res = await base44.functions.invoke('checkUserData', { email });
                    if(preNode) preNode.innerText = JSON.stringify(res.data, null, 2);
                } catch(err) {
                     if(preNode) preNode.innerText = "Errore: " + err.message;
                }
            }}>
              Analizza Utente
            </Button>
          </div>
          <div className="bg-slate-900 text-slate-50 p-4 rounded-md overflow-x-auto min-h-[200px]">
            <pre id="analysisResult" className="text-xs font-mono">
              In attesa di input...
            </pre>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
         <Button onClick={() => window.location.href = '/Dashboard'}>Torna alla Dashboard</Button>
      </div>
    </div>
  );
}