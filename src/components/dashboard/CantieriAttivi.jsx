import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Building2, MapPin, Calendar, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { differenceInDays, format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Progress } from "@/components/ui/progress";

const CantieriAttivi = React.memo(({ cantieri, isLoading }) => {
  const getStatusInfo = (cantiere) => {
    if (!cantiere.data_fine_prevista) {
      return { text: 'Da definire', color: 'text-slate-500', bgColor: 'bg-slate-100' };
    }

    const oggi = new Date();
    const dataFine = new Date(cantiere.data_fine_prevista);
    const giorniRimanenti = differenceInDays(dataFine, oggi);

    if (giorniRimanenti < 0) {
      return { text: 'Scaduto', color: 'text-rose-600', bgColor: 'bg-rose-100' };
    } else if (giorniRimanenti <= 7) {
      return { text: `Scade tra ${giorniRimanenti}gg`, color: 'text-amber-600', bgColor: 'bg-amber-100' };
    } else if (giorniRimanenti <= 30) {
      return { text: `${giorniRimanenti} giorni`, color: 'text-blue-600', bgColor: 'bg-blue-100' };
    } else {
      return { text: `${giorniRimanenti} giorni`, color: 'text-emerald-600', bgColor: 'bg-emerald-100' };
    }
  };

  return (
    <Card className="border-0 shadow-lg hover:shadow-xl transition-all bg-white/80 backdrop-blur-sm rounded-3xl overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-800">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          Cantieri Attivi
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="animate-pulse p-4 bg-slate-100 rounded-2xl">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-3"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : cantieri.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500">Nessun cantiere attivo</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cantieri.slice(0, 5).map((cantiere) => {
              const status = getStatusInfo(cantiere);
              const avanzamento = cantiere.avanzamento || 0;

              return (
                <Link 
                  key={cantiere.id}
                  to={createPageUrl(`CantiereDashboard?id=${cantiere.id}`)}
                  className="block"
                >
                  <div className="p-4 rounded-2xl border border-slate-200 hover:border-purple-300 hover:shadow-lg transition-all bg-gradient-to-br from-white to-slate-50/50 group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 truncate group-hover:text-purple-600 transition-colors">
                          {cantiere.denominazione}
                        </h4>
                        {cantiere.indirizzo_citta && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                            <MapPin className="w-3 h-3" />
                            <span>{cantiere.indirizzo_citta}</span>
                          </div>
                        )}
                      </div>
                      <div className={`px-3 py-1 rounded-xl text-xs font-semibold ${status.bgColor} ${status.color}`}>
                        {status.text}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Avanzamento
                        </span>
                        <span className="font-bold text-purple-600">{avanzamento}%</span>
                      </div>
                      <Progress value={avanzamento} className="h-2 bg-slate-100" />
                    </div>
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