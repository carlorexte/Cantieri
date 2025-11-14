import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ClipboardList, Calendar, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';

const statusColors = {
  da_fare: 'bg-slate-100 text-slate-700 border-slate-300',
  in_corso: 'bg-blue-100 text-blue-700 border-blue-300',
  completato: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  bloccato: 'bg-rose-100 text-rose-700 border-rose-300',
  in_revisione: 'bg-amber-100 text-amber-700 border-amber-300'
};

const priorityColors = {
  bassa: 'bg-slate-100 text-slate-700',
  media: 'bg-blue-100 text-blue-700',
  alta: 'bg-amber-100 text-amber-700',
  critica: 'bg-rose-100 text-rose-700'
};

const TaskPersonali = React.memo(({ tasks, cantieri, isLoading }) => {
  const getCantiereNome = (cantiereId) => {
    if (!cantiereId) return 'Generale';
    const cantiere = cantieri.find(c => c.id === cantiereId);
    return cantiere?.denominazione || 'N/D';
  };

  const getDeadlineInfo = (dataScadenza, stato) => {
    if (!dataScadenza || stato === 'completato') return null;
    
    const oggi = new Date();
    const scadenza = new Date(dataScadenza);
    const giorniRimanenti = differenceInDays(scadenza, oggi);
    
    if (giorniRimanenti < 0) {
      return { text: 'Scaduto', color: 'text-rose-600', icon: AlertCircle };
    } else if (giorniRimanenti === 0) {
      return { text: 'Scade oggi', color: 'text-amber-600', icon: Calendar };
    } else if (giorniRimanenti <= 3) {
      return { text: `${giorniRimanenti}gg`, color: 'text-amber-600', icon: Calendar };
    }
    return { text: format(scadenza, 'dd MMM', { locale: it }), color: 'text-slate-500', icon: Calendar };
  };

  return (
    <Card className="border-0 shadow-lg hover:shadow-xl transition-all bg-white/80 backdrop-blur-sm rounded-3xl overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-800">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          I Miei Compiti
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="animate-pulse p-4 bg-slate-100 rounded-2xl">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-100 to-green-100 flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="text-slate-600 font-medium">Nessun compito assegnato</p>
            <p className="text-sm text-slate-400 mt-1">Sei libero! 🎉</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-4">
              {tasks.slice(0, 5).map((task) => {
                const deadlineInfo = getDeadlineInfo(task.data_scadenza, task.stato);
                const DeadlineIcon = deadlineInfo?.icon;

                return (
                  <Link 
                    key={task.id}
                    to={createPageUrl(`AttivitaInterne?id=${task.id}`)}
                    className="block"
                  >
                    <div className="p-4 rounded-2xl border border-slate-200 hover:border-cyan-300 hover:shadow-lg transition-all bg-gradient-to-br from-white to-slate-50/50 group">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-slate-900 text-sm group-hover:text-cyan-600 transition-colors flex-1">
                          {task.descrizione}
                        </h4>
                        <Badge variant="outline" className={`ml-2 text-xs ${priorityColors[task.priorita]}`}>
                          {task.priorita}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs">
                        <Badge variant="outline" className={statusColors[task.stato]}>
                          {task.stato.replace('_', ' ')}
                        </Badge>
                        
                        <div className="flex items-center gap-3">
                          <span className="text-slate-500">{getCantiereNome(task.cantiere_id)}</span>
                          {deadlineInfo && (
                            <span className={`flex items-center gap-1 font-medium ${deadlineInfo.color}`}>
                              <DeadlineIcon className="w-3 h-3" />
                              {deadlineInfo.text}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {tasks.length > 5 && (
              <Link to={createPageUrl('AttivitaInterne')}>
                <button className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-50 to-blue-50 hover:from-cyan-100 hover:to-blue-100 text-cyan-700 font-medium text-sm transition-all border border-cyan-200">
                  Visualizza tutti i compiti ({tasks.length})
                </button>
              </Link>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
});

TaskPersonali.displayName = 'TaskPersonali';

export default TaskPersonali;