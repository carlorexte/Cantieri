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

  const getCellStyle = (count, critici) => {
    if (count === 0) return 'bg-slate-100 text-slate-400';
    
    const intensity = count / maxCount;
    
    if (critici > 0) {
      if (intensity > 0.7) return 'bg-[#ff7675] text-white';
      if (intensity > 0.4) return 'bg-[#ff7675]/70 text-white';
      return 'bg-[#ff7675]/40 text-slate-900';
    } else {
      if (intensity > 0.7) return 'bg-[#6c5ce7] text-white';
      if (intensity > 0.4) return 'bg-[#6c5ce7]/70 text-white';
      return 'bg-[#6c5ce7]/40 text-slate-900';
    }
  };

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow bg-white rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-slate-800">
          <div className="w-10 h-10 rounded-xl bg-[#fdcb6e] flex items-center justify-center shadow-sm">
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
                relative p-3 rounded-xl transition-all cursor-pointer
                ${getCellStyle(mese.count, mese.critici)}
                hover:shadow-md
              `}
              title={`${mese.meseCompleto}: ${mese.count} documenti in scadenza${mese.critici > 0 ? ` (${mese.critici} critici)` : ''}`}
            >
              <div className="text-center">
                <p className="text-xs font-semibold uppercase">
                  {mese.mese}
                </p>
                <p className="text-2xl font-bold mt-1">
                  {mese.count}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-slate-100 rounded"></div>
            <span className="text-xs text-slate-600">Nessuna</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#6c5ce7]/40 rounded"></div>
            <span className="text-xs text-slate-600">Bassa</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#6c5ce7] rounded"></div>
            <span className="text-xs text-slate-600">Alta</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#ff7675] rounded"></div>
            <span className="text-xs text-slate-600">Critica</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}