import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, MapPin, Calendar, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CantieriAttivi({ cantieri, isLoading }) {
  const getStatusInfo = (cantiere) => {
    if (!cantiere.data_fine_prevista) {
      return { 
        text: 'Da definire', 
        color: 'text-slate-500',
        bgColor: 'bg-slate-100',
        icon: Calendar 
      };
    }

    try {
      const dataFine = new Date(cantiere.data_fine_prevista);
      if (isNaN(dataFine.getTime())) {
        return { 
          text: 'Data non valida', 
          color: 'text-slate-500',
          bgColor: 'bg-slate-100',
          icon: Calendar 
        };
      }

      const oggi = new Date();
      oggi.setHours(0, 0, 0, 0);
      dataFine.setHours(0, 0, 0, 0);

      const differenzaMs = dataFine.getTime() - oggi.getTime();
      const differenzaGiorni = Math.ceil(differenzaMs / (1000 * 60 * 60 * 24));

      if (differenzaGiorni < 0) {
        return { 
          text: 'Scaduto', 
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          icon: AlertCircle 
        };
      } else if (differenzaGiorni <= 30) {
        return { 
          text: `Scade tra ${differenzaGiorni} giorni`, 
          color: 'text-amber-600',
          bgColor: 'bg-amber-100',
          icon: AlertCircle 
        };
      } else {
        return { 
          text: `${differenzaGiorni} giorni rimanenti`, 
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-100',
          icon: Calendar 
        };
      }
    } catch (error) {
      return { 
        text: 'Errore calcolo data', 
        color: 'text-slate-500',
        bgColor: 'bg-slate-100',
        icon: Calendar 
      };
    }
  };

  return (
    <Card className="border-0 shadow-lg bg-white" style={{ borderRadius: '16px' }}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold" style={{ color: '#17171C' }}>Cantieri Attivi</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-6 bg-slate-200 rounded-lg w-2/3 mb-3"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-2"></div>
                <div className="h-2 bg-slate-200 rounded-full w-full"></div>
              </div>
            ))}
          </div>
        ) : cantieri.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium">Nessun cantiere attivo</p>
            <p className="text-slate-500 text-sm mt-1">I cantieri appariranno qui</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cantieri.map((cantiere) => {
              const statusInfo = getStatusInfo(cantiere);
              const StatusIcon = statusInfo.icon;
              
              return (
                <Link 
                  key={cantiere.id}
                  to={createPageUrl(`CantiereDashboard?id=${cantiere.id}`)}
                  className="block group"
                >
                  <div className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-slate-50/50 transition-all duration-200">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1 flex-1">
                        {cantiere.denominazione}
                      </h3>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 ${statusInfo.bgColor} ${statusInfo.color} ml-2`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusInfo.text}
                      </span>
                    </div>
                    
                    {cantiere.indirizzo && (
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="line-clamp-1">{cantiere.indirizzo}</span>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Avanzamento</span>
                        <span className="font-bold text-indigo-600">{cantiere.avanzamento || 0}%</span>
                      </div>
                      <Progress 
                        value={cantiere.avanzamento || 0} 
                        className="h-2 bg-slate-100"
                        indicatorClassName="bg-indigo-600"
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}