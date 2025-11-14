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
    <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500"></div>
      
      <CardHeader className="pb-4 pt-6">
        <CardTitle className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg">Cantieri Attivi</span>
        </CardTitle>
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
                  <div className="p-5 rounded-xl border border-slate-200 hover:border-indigo-200 transition-all duration-300 hover:shadow-md bg-gradient-to-br from-white to-slate-50">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1 flex-1">
                        {cantiere.denominazione}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${statusInfo.bgColor} ${statusInfo.color} ml-2`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusInfo.text}
                      </span>
                    </div>
                    
                    {cantiere.indirizzo && (
                      <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="line-clamp-1">{cantiere.indirizzo}</span>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 font-medium">Avanzamento</span>
                        <span className="font-bold text-indigo-600">{cantiere.avanzamento || 0}%</span>
                      </div>
                      <Progress 
                        value={cantiere.avanzamento || 0} 
                        className="h-2.5 bg-slate-100"
                        indicatorClassName="bg-gradient-to-r from-indigo-500 to-indigo-600"
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