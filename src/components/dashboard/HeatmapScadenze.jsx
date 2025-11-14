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
    const fineRange = endOfMonth(addMonths(oggi, 11));

    const mesi = eachMonthOfInterval({ start: inizioRange, end: fineRange });

    return mesi.map(mese => {
      const inizioMese = startOfMonth(mese);
      const fineMese = endOfMonth(mese);

      const documentiInScadenza = documenti.filter(doc => {
        if (!doc.data_scadenza) return false;
        const scadenza = new Date(doc.data_scadenza);
        return scadenza >= inizioMese && scadenza <= fineMese;
      });

      const count = documentiInScadenza.length;
      
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

  const getIntensityStyle = (count, critici) => {
    if (count === 0) return 'bg-slate-50 border-slate-200';
    
    const intensity = count / maxCount;
    
    if (critici > 0) {
      if (intensity > 0.7) return 'bg-gradient-to-br from-rose-500 to-red-600 shadow-lg shadow-rose-500/30';
      if (intensity > 0.4) return 'bg-gradient-to-br from-rose-400 to-red-500 shadow-md shadow-rose-400/30';
      return 'bg-gradient-to-br from-rose-300 to-red-400 shadow-sm';
    } else {
      if (intensity > 0.7) return 'bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/30';
      if (intensity > 0.4) return 'bg-gradient-to-br from-purple-400 to-indigo-500 shadow-md shadow-purple-400/30';
      return 'bg-gradient-to-br from-purple-300 to-indigo-400 shadow-sm';
    }
  };

  const getTextColor = (count, critici) => {
    if (count === 0) return 'text-slate-400';
    
    const intensity = count / maxCount;
    
    if (critici > 0) {
      return intensity > 0.4 ? 'text-white' : 'text-red-900';
    } else {
      return intensity > 0.4 ? 'text-white' : 'text-purple-900';
    }
  };

  return (
    <Card className="border-0 shadow-lg hover:shadow-xl transition-all bg-white/80 backdrop-blur-sm rounded-3xl overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-800">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          Heatmap Scadenze Documenti
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {heatmapData.map((mese, idx) => (
            <div
              key={idx}
              className={`
                relative p-4 rounded-2xl transition-all duration-300 cursor-pointer border
                ${getIntensityStyle(mese.count, mese.critici)}
                hover:scale-105 hover:shadow-xl
              `}
              title={`${mese.meseCompleto}: ${mese.count} documenti in scadenza${mese.critici > 0 ? ` (${mese.critici} critici)` : ''}`}
            >
              <div className="text-center">
                <p className={`text-xs font-bold uppercase tracking-wide ${getTextColor(mese.count, mese.critici)}`}>
                  {mese.mese}
                </p>
                <p className={`text-3xl font-bold mt-1 ${getTextColor(mese.count, mese.critici)}`}>
                  {mese.count}
                </p>
                {mese.critici > 0 && (
                  <div className="absolute -top-2 -right-2 bg-gradient-to-br from-red-500 to-rose-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold shadow-lg">
                    !
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-6 mt-8 pt-6 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-slate-50 border-2 border-slate-200 rounded-lg"></div>
            <span className="text-sm text-slate-600">Nessuna</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gradient-to-br from-purple-300 to-indigo-400 rounded-lg shadow-sm"></div>
            <span className="text-sm text-slate-600">Bassa</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg shadow-md"></div>
            <span className="text-sm text-slate-600">Alta</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gradient-to-br from-rose-500 to-red-600 rounded-lg shadow-lg"></div>
            <span className="text-sm text-slate-600">Critica</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}