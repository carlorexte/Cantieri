import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, FileWarning } from "lucide-react";
import { differenceInDays, isPast, parseISO, format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function AlertScadenzeCard({ documenti }) {
  const alerts = documenti
    .filter(doc => doc.data_scadenza)
    .map(doc => {
      const scadenza = parseISO(doc.data_scadenza);
      const giorniRimanenti = differenceInDays(scadenza, new Date());
      const isExpired = isPast(scadenza);
      
      let priorita = 'basso';
      let messaggio = `Scade tra ${giorniRimanenti} giorni`;
      let icon = Clock;

      if (isExpired) {
        priorita = 'critico';
        messaggio = `Scaduto da ${Math.abs(giorniRimanenti)} giorni`;
        icon = AlertTriangle;
      } else if (giorniRimanenti <= 30) {
        priorita = 'medio';
        icon = FileWarning;
      }

      return { ...doc, priorita, messaggio, icon, scadenza };
    })
    .filter(doc => doc.priorita === 'critico' || doc.priorita === 'medio')
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
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nessun allarme attivo</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-slate-900">Allarmi e Notifiche</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map(alert => {
          const Icon = alert.icon;
          return (
            <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex-shrink-0">
                <Icon className="w-5 h-5 mt-0.5 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">{alert.nome_documento}</p>
                <p className="text-sm text-slate-600">{alert.messaggio}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Data: {format(alert.scadenza, 'PPP', { locale: it })}
                </p>
              </div>
              <Badge 
                variant="secondary"
                className={alertColors[alert.priorita]}
              >
                {alert.priorita}
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}