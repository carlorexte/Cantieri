import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Building2, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { differenceInDays, isPast, parseISO, isValid } from 'date-fns';

const CantieriAttivi = React.memo(({ cantieri, isLoading }) => {
  const getStatus = (cantiere) => {
    // Check if data_fine_prevista exists and is valid
    if (!cantiere.data_fine_prevista) {
      return { text: 'Da definire', color: 'text-slate-500', icon: <Clock className="w-3 h-3" /> };
    }
    
    try {
      const dataFine = parseISO(cantiere.data_fine_prevista);
      
      // Validate the parsed date
      if (!isValid(dataFine)) {
        return { text: 'Data non valida', color: 'text-slate-500', icon: <Clock className="w-3 h-3" /> };
      }
      
      const oggi = new Date();
      oggi.setHours(0, 0, 0, 0);
      dataFine.setHours(0, 0, 0, 0);
      
      const giorniRimanenti = differenceInDays(dataFine, oggi);

      if (giorniRimanenti < 0) {
        return { text: `Scaduto da ${Math.abs(giorniRimanenti)} giorni`, color: 'text-rose-600', icon: <AlertTriangle className="w-3 h-3" /> };
      }
      if (giorniRimanenti <= 7) {
        return { text: `Scade tra ${giorniRimanenti} giorni`, color: 'text-amber-600', icon: <Clock className="w-3 h-3" /> };
      }
      return { text: `${giorniRimanenti} giorni rimanenti`, color: 'text-emerald-600', icon: <Calendar className="w-3 h-3" /> };
    } catch (error) {
      console.error('Errore nel parsing della data:', error, cantiere.data_fine_prevista);
      return { text: 'Errore data', color: 'text-slate-500', icon: <Clock className="w-3 h-3" /> };
    }
  };

  return (
    <Card className="shadow-sm border-0 bg-white">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-900">Cantieri Attivi</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-100 rounded-lg animate-pulse"></div>
            ))}
          </div>
        ) : cantieri.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="mx-auto w-12 h-12 text-slate-300 mb-3" />
            <p className="text-slate-500">Nessun cantiere attivo al momento.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cantieri.map(cantiere => {
              const status = getStatus(cantiere);
              const avanzamento = cantiere.avanzamento || 0;

              return (
                <Link 
                  to={createPageUrl(`CantiereDashboard?id=${cantiere.id}`)} 
                  key={cantiere.id} 
                  className="block p-4 rounded-lg border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">{cantiere.denominazione}</h3>
                      <p className="text-sm text-slate-500">{cantiere.indirizzo_citta}</p>
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs font-medium ${status.color}`}>
                      {status.icon}
                      <span>{status.text}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500"
                        style={{ width: `${avanzamento}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-slate-700 min-w-[45px] text-right">
                      {avanzamento}%
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

CantieriAttivi.displayName = 'CantieriAttivi';

export default CantieriAttivi;