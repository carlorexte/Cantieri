import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Calendar, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function DocumentiScadenzaWidget({ dashboardData }) {
  const { documentiInScadenza = [] } = dashboardData || {};

  const getGiorniRimanenti = (dataScadenza) => {
    const oggi = new Date();
    const scadenza = new Date(dataScadenza);
    const diff = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-red-500 to-rose-500"></div>
      
      <CardHeader className="pb-4 pt-6">
        <CardTitle className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-200">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg">Documenti in Scadenza</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {documentiInScadenza.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center">
              <FileText className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-sm text-slate-600">Nessun documento in scadenza</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documentiInScadenza.slice(0, 5).map((doc, idx) => {
              const giorniRimanenti = getGiorniRimanenti(doc.data_scadenza);
              const isUrgente = giorniRimanenti <= 7;
              const isScaduto = giorniRimanenti < 0;
              
              return (
                <div 
                  key={idx}
                  className={`p-3 rounded-xl border transition-all ${
                    isScaduto 
                      ? 'bg-red-50 border-red-200' 
                      : isUrgente 
                      ? 'bg-amber-50 border-amber-200' 
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle className={`w-4 h-4 mt-0.5 ${
                      isScaduto ? 'text-red-600' : isUrgente ? 'text-amber-600' : 'text-slate-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-900 line-clamp-1">
                        {doc.nome_documento}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <p className="text-xs text-slate-600">
                          {new Date(doc.data_scadenza).toLocaleDateString('it-IT')}
                        </p>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${
                            isScaduto 
                              ? 'bg-red-100 text-red-700' 
                              : isUrgente 
                              ? 'bg-amber-100 text-amber-700' 
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isScaduto 
                            ? 'Scaduto' 
                            : giorniRimanenti === 0 
                            ? 'Oggi' 
                            : `${giorniRimanenti}g`
                          }
                        </Badge>
                      </div>
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
}