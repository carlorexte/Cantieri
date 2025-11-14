
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ClipboardList, Calendar, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { format, isPast, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';

const statoColors = {
  da_fare: "bg-slate-50 text-slate-700 border-slate-200",
  in_corso: "bg-blue-50 text-blue-700 border-blue-200",
  in_revisione: "bg-purple-50 text-purple-700 border-purple-200",
  completato: "bg-emerald-50 text-emerald-700 border-emerald-200",
  bloccato: "bg-red-50 text-red-700 border-red-200"
};

const prioritaColors = {
  bassa: "bg-blue-50 text-blue-700 border-blue-200",
  media: "bg-amber-50 text-amber-700 border-amber-200",
  alta: "bg-orange-50 text-orange-700 border-orange-200",
  critica: "bg-red-50 text-red-700 border-red-200"
};

const TaskPersonali = React.memo(({ tasks, cantieri, isLoading }) => {
  const getCantiereNome = (cantiereId) => {
    const cantiere = cantieri.find(c => c.id === cantiereId);
    return cantiere?.denominazione || 'Generale';
  };

  const getScadenzaInfo = (dataScadenza, stato) => {
    if (!dataScadenza || stato === 'completato') return null;
    
    const scadenza = new Date(dataScadenza);
    const oggi = new Date();
    const giorni = differenceInDays(scadenza, oggi);

    if (isPast(scadenza)) {
      return { text: `Scaduto da ${Math.abs(giorni)} giorni`, color: 'text-red-600', icon: AlertCircle };
    }
    if (giorni <= 3) {
      return { text: `Scade tra ${giorni} giorni`, color: 'text-amber-600', icon: Clock };
    }
    return { text: format(scadenza, 'd MMM', { locale: it }), color: 'text-slate-600', icon: Calendar };
  };

  return (
    <Card className="shadow-sm border-0 bg-white">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-900">I Miei Compiti</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse"></div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="mx-auto w-12 h-12 text-slate-300 mb-3" />
            <p className="text-slate-500">Nessun compito assegnato al momento.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.slice(0, 5).map(task => {
              const scadenzaInfo = getScadenzaInfo(task.data_scadenza, task.stato);
              const ScadenzaIcon = scadenzaInfo?.icon;
              
              return (
                <Link 
                  to={createPageUrl('AttivitaInterne')} 
                  key={task.id} 
                  className="block p-4 rounded-lg border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className="font-semibold text-slate-900 flex-1">{task.descrizione}</h4>
                    <Badge 
                      variant="secondary" 
                      className={`${statoColors[task.stato]} border text-xs`}
                    >
                      {task.stato.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <span className="text-slate-500">{getCantiereNome(task.cantiere_id)}</span>
                    <Badge 
                      variant="secondary" 
                      className={`${prioritaColors[task.priorita]} border text-xs`}
                    >
                      {task.priorita}
                    </Badge>
                    {scadenzaInfo && ScadenzaIcon && (
                      <div className={`flex items-center gap-1.5 ${scadenzaInfo.color} font-medium`}>
                        <ScadenzaIcon className="w-3.5 h-3.5" />
                        <span className="text-xs">{scadenzaInfo.text}</span>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
            
            {tasks.length > 5 && (
              <Link to={createPageUrl('AttivitaInterne')}>
                <div className="text-center pt-4 border-t border-slate-100">
                  <span className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                    Vedi tutti i compiti ({tasks.length})
                  </span>
                </div>
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

TaskPersonali.displayName = 'TaskPersonali';

export default TaskPersonali;
