import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Global Error Boundary Caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const isMetaMask = this.state.error?.message?.includes("MetaMask") || 
                         this.state.error?.message?.includes("ethereum");
      
      return (
        <div className="flex flex-col items-center justify-center min-h-full h-full bg-slate-50 p-6 rounded-lg">
          <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Qualcosa è andato storto</h2>
            <p className="text-slate-600 mb-6 text-sm">
              {this.state.error?.message || "Si è verificato un errore imprevisto."}
            </p>
            
            {isMetaMask && (
               <div className="text-left text-amber-700 text-xs mb-6 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                 <p className="font-semibold mb-1">Problema MetaMask rilevato</p>
                 <p>Sembra che l'estensione del browser MetaMask stia interferendo con l'applicazione. Questo errore non dipende dal gestionale.</p>
                 <p className="mt-1">Prova a:</p>
                 <ul className="list-disc pl-4 mt-1 space-y-0.5">
                   <li>Ricaricare la pagina</li>
                   <li>Disabilitare MetaMask per questo sito</li>
                   <li>Usare una finestra di navigazione in incognito</li>
                 </ul>
               </div>
            )}

            <Button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Ricarica Pagina
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}