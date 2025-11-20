import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, AlertCircle, Clock, CheckCircle2, Calendar, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const priorityColors = {
  bassa: "bg-slate-100 text-slate-700",
  media: "bg-blue-100 text-blue-700",
  alta: "bg-amber-100 text-amber-700",
  critica: "bg-red-100 text-red-700"
};

const statusConfig = {
  da_fare: { label: 'Da Fare', icon: Clock, color: '#6C757D' },
  in_corso: { label: 'In Corso', icon: Clock, color: '#4ECDC4' },
  completato: { label: 'Completato', icon: CheckCircle2, color: '#2ECC71' },
  bloccato: { label: 'Bloccato', icon: AlertCircle, color: '#FF6B6B' },
  in_revisione: { label: 'In Revisione', icon: Clock, color: '#FF8C42' }
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
      <Card className="border-0 shadow-lg bg-white" style={{ borderRadius: '16px' }}>
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2" style={{ color: '#17171C' }}>
            <ClipboardList className="w-5 h-5" />
            Attività Interne
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-slate-200/60 rounded-xl"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (attivitaDaCompletare.length === 0) {
    return (
      <Card className="border-0 shadow-lg bg-white" style={{ borderRadius: '16px' }}>
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2" style={{ color: '#17171C' }}>
            <ClipboardList className="w-5 h-5" />
            Attività Interne
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
            <p className="text-slate-600 font-medium">Nessuna attività da completare</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg bg-white" style={{ borderRadius: '16px' }}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-2" style={{ color: '#17171C' }}>
            <ClipboardList className="w-5 h-5" />
            Attività Interne
          </CardTitle>
          <Badge variant="secondary" className="text-xs px-2.5 py-1">
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
                className="p-4 rounded-xl border border-slate-200 hover:shadow-md hover:scale-[1.01] transition-all duration-200"
                style={overdue ? {borderLeft: '3px solid #FF6B6B'} : {}}
              >
                <div className="flex items-start gap-3">
                  <div 
                    className="shrink-0 rounded-full flex items-center justify-center"
                    style={{ 
                      width: '40px', 
                      height: '40px',
                      backgroundColor: statusConfig[task.stato]?.color + '20' || '#F1F5F9'
                    }}
                  >
                    <StatusIcon 
                      className="w-5 h-5" 
                      style={{ color: statusConfig[task.stato]?.color || '#64748b' }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-slate-900 mb-2 line-clamp-2" style={{ fontWeight: 600 }}>
                      {task.descrizione}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className={`px-2.5 py-1 rounded-full font-medium ${priorityColors[task.priorita]}`}>
                        {task.priorita}
                      </span>
                      <span 
                        className="px-2.5 py-1 rounded-full font-medium"
                        style={{ 
                          backgroundColor: statusConfig[task.stato]?.color + '20',
                          color: statusConfig[task.stato]?.color
                        }}
                      >
                        {statusConfig[task.stato]?.label}
                      </span>
                      {task.data_scadenza && (
                        <span className={`flex items-center gap-1 ${overdue ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(task.data_scadenza).toLocaleDateString('it-IT')}
                        </span>
                      )}
                      {task.cantiere_id && (
                        <span className="flex items-center gap-1 text-slate-500 truncate">
                          <Building2 className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate text-xs">{getCantiereNome(task.cantiere_id)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-4 pt-4 border-t">
          <Link to={createPageUrl('AttivitaInterne')}>
            <button 
              className="w-full text-sm font-medium text-[#FF8C42] hover:text-[#FF6B6B] transition-colors flex items-center justify-center gap-2 group"
            >
              <span>Vedi tutte le attività</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}