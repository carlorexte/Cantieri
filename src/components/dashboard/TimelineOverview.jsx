import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, parseISO, differenceInDays, addDays, isValid } from 'date-fns';
import { it } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function TimelineOverview({ cantieri }) {
  // Filtriamo solo cantieri validi per la timeline
  const validCantieri = cantieri
    .filter(c => c.stato === 'attivo' && c.data_inizio && c.data_fine_prevista)
    .sort((a, b) => new Date(a.data_fine_prevista) - new Date(b.data_fine_prevista))
    .slice(0, 8); // Mostriamo max 8 cantieri per non intasare

  if (validCantieri.length === 0) return null;

  // Calcoliamo il range temporale globale per la visualizzazione
  const now = new Date();
  const startDate = new Date(Math.min(...validCantieri.map(c => new Date(c.data_inizio).getTime()), now.getTime() - 1000 * 60 * 60 * 24 * 30)); // Minimo un mese fa
  const endDate = new Date(Math.max(...validCantieri.map(c => new Date(c.data_fine_prevista).getTime()), now.getTime() + 1000 * 60 * 60 * 24 * 30)); // Minimo un mese avanti

  const totalDurationMs = endDate - startDate;

  const getPosition = (dateString) => {
    const date = new Date(dateString);
    if (!isValid(date)) return 0;
    const diff = date - startDate;
    return Math.max(0, Math.min((diff / totalDurationMs) * 100, 100));
  };

  const todayPos = getPosition(now.toISOString());

  return (
    <Card className="border-0 shadow-lg bg-white rounded-2xl">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-center">
            <div>
                <CardTitle className="text-lg font-bold text-slate-900">Timeline Cantieri Attivi</CardTitle>
                <p className="text-sm text-slate-500">Prossime scadenze e stato avanzamento</p>
            </div>
            <div className="text-xs font-medium px-3 py-1 bg-slate-100 rounded-full text-slate-600">
                Oggi: {format(now, 'd MMM yyyy', { locale: it })}
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-6 min-h-[200px]">
            
          {/* Linea "Oggi" verticale */}
          <div 
            className="absolute top-0 bottom-0 w-px bg-indigo-500 z-10 border-l border-dashed border-indigo-500"
            style={{ left: `${todayPos}%` }}
          >
            <div className="absolute -top-2 -left-1 w-2 h-2 bg-indigo-500 rounded-full"></div>
            <div className="absolute -bottom-2 -left-1 w-2 h-2 bg-indigo-500 rounded-full"></div>
          </div>

          {validCantieri.map((cantiere) => {
            const startPos = getPosition(cantiere.data_inizio);
            const endPos = getPosition(cantiere.data_fine_prevista);
            const width = Math.max(endPos - startPos, 1); // Minimo 1% width
            
            const progressWidth = (cantiere.avanzamento || 0); // Percentuale relativa alla larghezza della barra
            
            return (
              <div key={cantiere.id} className="relative group">
                <div className="flex justify-between text-xs mb-1 px-1">
                    <Link to={createPageUrl(`CantiereDashboard?id=${cantiere.id}`)} className="font-semibold text-slate-700 hover:text-indigo-600 truncate max-w-[200px]">
                        {cantiere.denominazione}
                    </Link>
                    <span className="text-slate-400 text-[10px]">
                        {format(parseISO(cantiere.data_fine_prevista), 'MMM yyyy', { locale: it })}
                    </span>
                </div>
                
                {/* Timeline Track */}
                <div className="h-3 w-full bg-slate-50 rounded-full overflow-hidden relative">
                    {/* Barra Durata Progetto */}
                    <div 
                        className="absolute h-full bg-slate-200 rounded-full"
                        style={{ left: `${startPos}%`, width: `${width}%` }}
                    >
                        {/* Barra Avanzamento Reale (dentro la durata) */}
                        <div 
                            className={`h-full rounded-full ${cantiere.avanzamento >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                            style={{ width: `${progressWidth}%` }}
                        ></div>
                    </div>
                </div>
              </div>
            );
          })}
          
          {/* Legenda Mesi (Semplificata: Inizio e Fine) */}
          <div className="flex justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100 mt-4">
            <span>{format(startDate, 'MMM yyyy', { locale: it })}</span>
            <span>{format(endDate, 'MMM yyyy', { locale: it })}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}