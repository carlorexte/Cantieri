import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, Clock, FileWarning, CheckCircle2, ExternalLink } from "lucide-react";
import { differenceInDays, isPast, parseISO, format } from 'date-fns';
import { it } from 'date-fns/locale';
import { createPageUrl } from '@/utils';

const AZIONI = {
  attivita_scaduta:   'Verifica il cronoprogramma e aggiorna lo stato dell\'attività o segnala il ritardo.',
  attivita_scadenza:  'L\'attività è in scadenza imminente. Assicurati che sia in corso o completa.',
  documento_scaduto:  'Rinnova o archivia il documento scaduto al più presto.',
  documento_scadenza: 'Il documento scade a breve. Avvia il processo di rinnovo.',
};

export default function AlertScadenzeCard({ documenti, attivita, cantiereId }) {
  const docAlerts = documenti
    .filter(doc => doc.data_scadenza)
    .map(doc => ({ ...doc, type: 'documento', date_ref: doc.data_scadenza, name_ref: doc.nome_documento }));

  const taskAlerts = (attivita || [])
    .filter(task => task.data_fine && task.stato !== 'completata')
    .map(task => ({ ...task, type: 'attivita', date_ref: task.data_fine, name_ref: task.descrizione }));

  const alerts = [...docAlerts, ...taskAlerts]
    .map(item => {
      const scadenza = parseISO(item.date_ref);
      const giorniRimanenti = differenceInDays(scadenza, new Date());
      const isExpired = isPast(scadenza);

      let priorita = 'basso';
      let messaggio = `Scade tra ${giorniRimanenti} giorni`;
      let icon = Clock;
      let azioneKey = item.type === 'attivita' ? 'attivita_scadenza' : 'documento_scadenza';

      if (isExpired) {
        priorita = 'critico';
        messaggio = `Scaduto da ${Math.abs(giorniRimanenti)} giorni`;
        icon = AlertTriangle;
        azioneKey = item.type === 'attivita' ? 'attivita_scaduta' : 'documento_scaduto';
      } else if (giorniRimanenti <= 7) {
        priorita = 'critico';
        messaggio = `In scadenza tra ${giorniRimanenti} giorni`;
        icon = AlertTriangle;
      } else if (giorniRimanenti <= 30) {
        priorita = 'medio';
        icon = FileWarning;
      }

      // Costruisce il link contestuale
      let link = null;
      if (item.type === 'attivita' && cantiereId) {
        link = createPageUrl('Cronoprogramma') + `?cantiere_id=${cantiereId}`;
      } else if (item.type === 'documento' && cantiereId) {
        link = createPageUrl('CantiereDashboard') + `?id=${cantiereId}`;
      }

      return { ...item, priorita, messaggio, icon, scadenza, link, azione: AZIONI[azioneKey] };
    })
    .filter(item => item.priorita === 'critico' || item.priorita === 'medio')
    .sort((a, b) => a.scadenza - b.scadenza);

  const alertColors = {
    critico: "bg-red-50 border-red-200 text-red-800",
    medio: "bg-orange-50 border-orange-200 text-orange-800",
  };

  if (alerts.length === 0) {
    return (
      <Card className="border-0 shadow-lg bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-slate-900">Allarmi e Notifiche</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate-500">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nessun allarme attivo</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-slate-900">
          Allarmi e Notifiche
          <span className="ml-2 text-sm font-normal text-slate-500">({alerts.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <TooltipProvider>
          {alerts.map(alert => {
            const Icon = alert.icon;

            const inner = (
              <div className={`flex items-start gap-3 p-3 rounded-lg border transition-all duration-150 group ${
                alert.link ? 'hover:shadow-md cursor-pointer' : ''
              } ${alert.priorita === 'critico'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-orange-50 border-orange-200'
              }`}>
                <div className="flex-shrink-0">
                  <Icon className={`w-5 h-5 mt-0.5 ${alert.priorita === 'critico' ? 'text-red-500' : 'text-orange-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900 leading-snug">{alert.name_ref}</p>
                    {alert.type === 'attivita' && (
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5">Task</Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">{alert.messaggio}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Data: {format(alert.scadenza, 'PPP', { locale: it })}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="secondary" className={alertColors[alert.priorita]}>
                    {alert.priorita}
                  </Badge>
                  {alert.link && (
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </div>
            );

            return (
              <Tooltip key={alert.id} delayDuration={300}>
                <TooltipTrigger asChild>
                  <div>
                    {alert.link ? <Link to={alert.link}>{inner}</Link> : inner}
                  </div>
                </TooltipTrigger>
                {alert.azione && (
                  <TooltipContent side="left" className="max-w-xs bg-slate-900 text-white border-slate-700">
                    <p className="text-xs font-semibold mb-1">Azione consigliata</p>
                    <p className="text-xs">{alert.azione}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
