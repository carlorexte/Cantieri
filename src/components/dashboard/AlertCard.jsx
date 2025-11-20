import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, FileText, Calendar, CheckCircle2, Clock } from "lucide-react";

const alertIcons = {
  scadenza: FileText,
  task_scadenza: Calendar,
};

export default function AlertCard({ alerts }) {
  return (
    <Card 
      className="border-0 shadow-lg overflow-hidden" 
      style={{ 
        borderRadius: '16px',
        background: alerts && alerts.length === 0 ? 'linear-gradient(180deg, #FFF9F0 0%, #FFFFFF 100%)' : '#FFFFFF'
      }}
    >
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold" style={{ color: '#17171C' }}>
          Allarmi e Notifiche
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts && alerts.length > 0 ? (
          <div className="space-y-3">
            {alerts.map((alert, idx) => {
              const Icon = alertIcons[alert.tipo] || AlertTriangle;
              const CardIcon = alert.priorita === 'critico' ? AlertTriangle : Clock;
              
              return (
                <div 
                  key={idx} 
                  className={`p-4 rounded-xl border transition-all duration-200 hover:scale-[1.02] ${
                    alert.priorita === 'critico' 
                      ? 'bg-red-50/50 border-red-200' 
                      : 'bg-amber-50/50 border-amber-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-lg shrink-0 ${
                      alert.priorita === 'critico' ? 'bg-red-100' : 'bg-amber-100'
                    }`}>
                      <CardIcon className={`w-5 h-5 ${
                        alert.priorita === 'critico' ? 'text-red-600' : 'text-amber-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 mb-1.5 line-clamp-2">
                        {alert.messaggio}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate font-medium">{alert.cantiere}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div 
            className="text-center py-8 border-2 border-dashed rounded-2xl"
            style={{ borderColor: '#FFE0B2', background: 'transparent' }}
          >
            <div 
              className="inline-flex items-center justify-center rounded-full mb-4"
              style={{ 
                width: '64px', 
                height: '64px',
                background: 'linear-gradient(135deg, #2ECC71 0%, #27AE60 100%)',
                boxShadow: '0 4px 12px rgba(46, 204, 113, 0.3)'
              }}
            >
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <p className="text-lg font-semibold text-slate-900 mb-1">Nessun allarme attivo</p>
            <p className="text-sm text-slate-600">Tutto procede regolarmente</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}