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
    <Card className="border-0 shadow-lg bg-white" style={{ borderRadius: '16px' }}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-slate-900">Attività Interne</CardTitle>
          <Badge variant="secondary" className="text-xs">
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
                className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-slate-50/50 transition-all duration-200"
                style={overdue ? {borderLeftWidth: '3px', borderLeftColor: '#EF4444'} : {}}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-slate-900 truncate text-sm">
                        {task.descrizione}
                      </h4>
                      <Badge 
                        variant="outline" 
                        className={`${priorityColors[task.priorita]} text-xs px-2 py-0.5`}
                      >
                        {task.priorita}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <div className={`flex items-center gap-1 ${statusConfig[task.stato]?.color}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        <span>{statusConfig[task.stato]?.label}</span>
                      </div>
                      
                      {task.data_scadenza && (
                        <div className={`flex items-center gap-1 ${overdue ? 'text-red-600 font-semibold' : ''}`}>
                          <Calendar className="w-3.5 h-3.5" />
                          <span>
                            {new Date(task.data_scadenza).toLocaleDateString('it-IT')}
                          </span>
                          {overdue && <span className="ml-1 font-bold">SCADUTA</span>}
                        </div>
                      )}
                      
                      <div className="text-slate-500">
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