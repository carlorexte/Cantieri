import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, addMonths } from 'date-fns';
import { it } from 'date-fns/locale';

export default function HeatmapScadenze({ documenti }) {
  const heatmapData = useMemo(() => {
    if (!documenti || documenti.length === 0) return [];

    const oggi = new Date();
    const inizioRange = startOfMonth(oggi);
    const fineRange = endOfMonth(addMonths(oggi, 11)); // Prossimi 12 mesi

    const mesi = eachMonthOfInterval({ start: inizioRange, end: fineRange });

    return mesi.map(mese => {
      const inizioMese = startOfMonth(mese);
      const fineMese = endOfMonth(mese);

      const documentiInScadenza = documenti.filter(doc => {
        if (!doc.data_scadenza) return false;
        const scadenza = new Date(doc.data_scadenza);
        return scadenza >= inizioMese && scadenza <= fineMese;
      });

      // Calcola intensità (numero documenti in scadenza)
      const count = documentiInScadenza.length;
      
      // Calcola criticità (quanti sono scaduti o in scadenza imminente)
      const critici = documentiInScadenza.filter(doc => {
        const scadenza = new Date(doc.data_scadenza);
        const diffGiorni = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
        return diffGiorni <= 7;
      }).length;

      return {
        mese: format(mese, 'MMM', { locale: it }),
        meseCompleto: format(mese, 'MMMM yyyy', { locale: it }),
        count,
        critici,
        data: mese
      };
    });
  }, [documenti]);

  const maxCount = useMemo(() => 
    Math.max(...heatmapData.map(m => m.count), 1),
    [heatmapData]
  );

  const getIntensityColor = (count, critici) => {
    if (count === 0) return 'bg-slate-50';
    
    const intensity = count / maxCount;
    
    if (critici > 0) {
      // Rosso per mesi con documenti critici
      if (intensity > 0.7) return 'bg-red-600';
      if (intensity > 0.4) return 'bg-red-400';
      return 'bg-red-200';
    } else {
      // Blu per mesi senza criticità
      if (intensity > 0.7) return 'bg-blue-600';
      if (intensity > 0.4) return 'bg-blue-400';
      return 'bg-blue-200';
    }
  };

  const getTextColor = (count, critici) => {
    if (count === 0) return 'text-slate-400';
    
    const intensity = count / maxCount;
    
    if (critici > 0) {
      return intensity > 0.4 ? 'text-white' : 'text-red-900';
    } else {
      return intensity > 0.4 ? 'text-white' : 'text-blue-900';
    }
  };

  return (
    <Card className="border-0 shadow-lg bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          Heatmap Scadenze Documenti
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {heatmapData.map((mese, idx) => (
            <div
              key={idx}
              className={`
                relative p-3 rounded-lg transition-all duration-200 cursor-pointer
                ${getIntensityColor(mese.count, mese.critici)}
                hover:scale-105 hover:shadow-lg
              `}
              title={`${mese.meseCompleto}: ${mese.count} documenti in scadenza${mese.critici > 0 ? ` (${mese.critici} critici)` : ''}`}
            >
              <div className="text-center">
                <p className={`text-xs font-semibold uppercase ${getTextColor(mese.count, mese.critici)}`}>
                  {mese.mese}
                </p>
                <p className={`text-2xl font-bold mt-1 ${getTextColor(mese.count, mese.critici)}`}>
                  {mese.count}
                </p>
                {mese.critici > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    !
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Legenda */}
        <div className="flex items-center justify-center gap-6 mt-6 pt-6 border-t">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-slate-50 border border-slate-200 rounded"></div>
            <span className="text-sm text-slate-600">Nessuna scadenza</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-200 rounded"></div>
            <span className="text-sm text-slate-600">Bassa intensità</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-600 rounded"></div>
            <span className="text-sm text-slate-600">Alta intensità</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-600 rounded"></div>
            <span className="text-sm text-slate-600">Scadenze critiche</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}