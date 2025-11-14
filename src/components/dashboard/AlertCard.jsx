import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

const alertStyles = {
  critico: {
    bg: 'bg-red-50',
    border: 'border-l-4 border-red-500',
    text: 'text-red-900'
  },
  medio: {
    bg: 'bg-amber-50',
    border: 'border-l-4 border-amber-500',
    text: 'text-amber-900'
  },
  basso: {
    bg: 'bg-blue-50',
    border: 'border-l-4 border-blue-500',
    text: 'text-blue-900'
  }
};

const AlertCard = React.memo(({ alerts }) => {
  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow bg-white rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-slate-800">
          <div className="w-10 h-10 rounded-xl bg-[#ff7675] flex items-center justify-center shadow-sm">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          Allarmi e Notifiche
        </CardTitle>
      </CardHeader>
      <CardContent>
        {(!alerts || alerts.length === 0) ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="text-slate-700 font-medium">Nessun allarme attivo</p>
            <p className="text-sm text-slate-500 mt-1">Tutto sotto controllo</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert, idx) => {
              const style = alertStyles[alert.priorita] || alertStyles.basso;
              return (
                <div 
                  key={idx} 
                  className={`p-3 rounded-lg ${style.bg} ${style.border}`}
                >
                  <p className={`text-sm font-medium ${style.text} mb-1`}>
                    {alert.messaggio}
                  </p>
                  <p className="text-xs text-slate-600">
                    {alert.cantiere}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

AlertCard.displayName = 'AlertCard';

export default AlertCard;