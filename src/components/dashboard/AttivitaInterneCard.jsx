import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, AlertCircle, Clock, CheckCircle2, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const priorityColors = {
  bassa: "bg-slate-100 text-slate-600 border-slate-200",
  media: "bg-blue-100 text-blue-700 border-blue-200",
  alta: "bg-amber-100 text-amber-700 border-amber-200",
  critica: "bg-red-100 text-red-700 border-red-200"
};

const statusConfig = {
  da_fare: { label: 'Da Fare', icon: Clock, color: 'text-slate-600' },
  in_corso: { label: 'In Corso', icon: Clock, color: 'text-blue-600' },
  completato: { label: 'Completato', icon: CheckCircle2, color: 'text-green-600' },
  bloccato: { label: 'Bloccato', icon: AlertCircle, color: 'text-red-600' },
  in_revisione: { label: 'In Revisione', icon: Clock, color: 'text-amber-600' }
};

export default function AttivitaInterneCard({ attivita, cantieri, isLoading }) {
  const getCantiereNome = (cantiereId) => {
    if (!cantiereId) return 'Attività Generale';
    const cantiere = cantieri.find(c => c.id === cantiereId);
    return cantiere?.denominazione || 'N/D';
  };

  const isOverdue = (task) => {
    if (!task.data_scadenza || task.stato === 'completato') return false;
    return new Date(task.data_scadenza) < new Date();
  };

  const attivitaDaCompletare = attivita.filter(a => a.stato !== 'completato');

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Attività Interne
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-slate-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (attivitaDaCompletare.length === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Attività Interne
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
            <p className="text-slate-600">Nessuna attività da completare</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-500 bg-white overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"></div>
      
      <CardHeader className="pb-5 pt-7">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-200/50">
              <ClipboardList className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-xl font-bold">Attività Interne</span>
          </CardTitle>
          <Badge className="px-4 py-2 text-sm font-bold shadow-lg" style={{backgroundColor: '#F5A623', color: 'white'}}>
            {attivitaDaCompletare.length} da completare
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {attivitaDaCompletare.slice(0, 10).map((task) => {
            const StatusIcon = statusConfig[task.stato]?.icon || Clock;
            const overdue = isOverdue(task);
            
            return (
              <div 
                key={task.id}
                className="p-5 rounded-2xl border-2 border-slate-100 bg-white hover:shadow-xl transition-all duration-500 hover:scale-[1.02]"
                style={overdue ? {borderLeftWidth: '5px', borderLeftColor: '#EF4444'} : {}}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <h4 className="font-bold text-slate-900 truncate text-base">
                        {task.descrizione}
                      </h4>
                      <Badge 
                        variant="outline" 
                        className={`${priorityColors[task.priorita]} border-2 text-xs font-bold px-3 py-1`}
                      >
                        {task.priorita}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                      <div className={`flex items-center gap-2 font-semibold ${statusConfig[task.stato]?.color}`}>
                        <StatusIcon className="w-4 h-4" />
                        <span>{statusConfig[task.stato]?.label}</span>
                      </div>
                      
                      {task.data_scadenza && (
                        <div className={`flex items-center gap-2 ${overdue ? 'text-red-600 font-bold' : 'font-medium'}`}>
                          <Calendar className="w-4 h-4" />
                          <span>
                            {new Date(task.data_scadenza).toLocaleDateString('it-IT')}
                          </span>
                          {overdue && <span className="ml-1 font-extrabold">SCADUTA</span>}
                        </div>
                      )}
                      
                      <div className="text-slate-500 font-medium">
                        {getCantiereNome(task.cantiere_id)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-4 pt-4 border-t">
          <Link to={createPageUrl('AttivitaInterne')}>
            <button className="w-full text-sm font-medium hover:underline" style={{color: '#F5A623'}}>
              Vedi tutte le attività →
            </button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}