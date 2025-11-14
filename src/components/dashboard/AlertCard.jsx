import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

const alertStyles = {
  critico: {
    border: 'border-rose-200',
    bg: 'bg-gradient-to-r from-rose-50 to-red-50',
    dot: 'bg-gradient-to-br from-rose-500 to-red-600 shadow-lg shadow-rose-500/40'
  },
  medio: {
    border: 'border-amber-200',
    bg: 'bg-gradient-to-r from-amber-50 to-orange-50',
    dot: 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/40'
  },
  basso: {
    border: 'border-blue-200',
    bg: 'bg-gradient-to-r from-blue-50 to-cyan-50',
    dot: 'bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg shadow-blue-500/40'
  }
};

const AlertCard = React.memo(({ alerts }) => {
  return (
    <Card className="border-0 shadow-lg hover:shadow-xl transition-all bg-white/80 backdrop-blur-sm rounded-3xl overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-800">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-lg">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          Allarmi e Notifiche
        </CardTitle>
      </CardHeader>
      <CardContent>
        {(!alerts || alerts.length === 0) ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-100 to-green-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="text-slate-600 font-medium">Nessun allarme attivo</p>
            <p className="text-sm text-slate-400 mt-1">Tutto sotto controllo!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert, idx) => {
              const style = alertStyles[alert.priorita] || alertStyles.basso;
              return (
                <div 
                  key={idx} 
                  className={`p-4 rounded-2xl border ${style.border} ${style.bg} hover:shadow-md transition-all`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${style.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 mb-1">
                        {alert.messaggio}
                      </p>
                      <p className="text-xs text-slate-600">
                        {alert.cantiere}
                      </p>
                    </div>
                  </div>
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