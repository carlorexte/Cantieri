import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, MapPin, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CantieriAttivi({ cantieri, isLoading }) {
  const cantieriAttivi = cantieri.filter(c => c.stato === 'attivo');

  const getGiorniRimanentiInfo = (cantiere) => {
    if (!cantiere.data_fine_prevista) {
      return { text: 'Da definire', color: 'slate', icon: Clock };
    }
    
    const oggi = new Date();
    const dataFine = new Date(cantiere.data_fine_prevista);
    const diffTime = dataFine - oggi;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { text: 'Scaduto', color: 'red', icon: AlertTriangle };
    } else if (diffDays <= 30) {
      return { text: `${diffDays}g rimanenti`, color: 'red', icon: AlertTriangle };
    } else if (diffDays <= 90) {
      return { text: `${diffDays}g rimanenti`, color: 'yellow', icon: Clock };
    } else {
      return { text: `${diffDays}g rimanenti`, color: 'green', icon: CheckCircle };
    }
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg bg-white" style={{ borderRadius: '16px' }}>
        <CardHeader className="pb-4">
          <CardTitle className="text-[28px] font-bold" style={{ color: '#17171C', fontWeight: 700 }}>
            Cantieri Attivi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-slate-200/60 rounded-xl"></div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (cantieriAttivi.length === 0) {
    return (
      <Card className="border-0 shadow-lg bg-white" style={{ borderRadius: '16px' }}>
        <CardHeader className="pb-4">
          <CardTitle className="text-[28px] font-bold" style={{ color: '#17171C', fontWeight: 700 }}>
            Cantieri Attivi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Building2 className="w-12 h-12 mx-auto mb-3 text-slate-400" />
            <p className="text-slate-500 text-sm">Nessun cantiere attivo al momento</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg bg-white" style={{ borderRadius: '16px' }}>
      <CardHeader className="pb-4">
        <div>
          <CardTitle className="text-[28px] font-bold mb-1" style={{ color: '#17171C', fontWeight: 700 }}>
            Avanzamento Cantieri Attivi
          </CardTitle>
          <p className="text-base font-medium" style={{ color: '#6C757D' }}>
            Monitoraggio {cantieriAttivi.length} cantieri in corso
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {cantieriAttivi.map((cantiere) => {
          const giorniInfo = getGiorniRimanentiInfo(cantiere);
          const avanzamento = cantiere.avanzamento || 0;
          const GiorniIcon = giorniInfo.icon;
          
          const borderColor = 
            avanzamento >= 75 ? '#2ECC71' :
            avanzamento >= 50 ? '#FF8C42' :
            avanzamento >= 25 ? '#4ECDC4' : '#FF6B6B';

          return (
            <Link 
              key={cantiere.id} 
              to={createPageUrl('CantiereDashboard') + `?id=${cantiere.id}`}
              className="block group"
            >
              <div 
                className="p-5 bg-white border border-slate-200 hover:shadow-lg hover:scale-[1.01] transition-all duration-300 rounded-xl"
                style={{ borderLeft: `4px solid ${borderColor}` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div 
                      className="p-2.5 rounded-lg transition-all duration-300 group-hover:scale-110"
                      style={{ backgroundColor: `${borderColor}15` }}
                    >
                      <Building2 className="w-5 h-5" style={{ color: borderColor }} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-base text-slate-900 group-hover:text-[#FF8C42] transition-colors mb-1 line-clamp-2">
                        {cantiere.denominazione}
                      </h3>
                      {cantiere.indirizzo_citta && (
                        <p className="text-sm text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {cantiere.indirizzo_citta}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge 
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap ${
                      giorniInfo.color === 'green' ? 'bg-[#D4EDDA] text-[#155724]' :
                      giorniInfo.color === 'yellow' ? 'bg-[#FFF3CD] text-[#856404]' :
                      giorniInfo.color === 'red' ? 'bg-[#F8D7DA] text-[#721C24]' :
                      'bg-slate-100 text-slate-700'
                    }`}
                  >
                    <GiorniIcon className="w-3.5 h-3.5" />
                    {giorniInfo.text}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600">Avanzamento</span>
                    <span className="font-bold text-slate-900">{avanzamento}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{ 
                        width: `${avanzamento}%`,
                        background: `linear-gradient(90deg, ${borderColor}, ${borderColor}dd)`
                      }}
                    />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}