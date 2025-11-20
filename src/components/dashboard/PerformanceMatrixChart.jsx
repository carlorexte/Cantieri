import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { differenceInDays, parseISO } from 'date-fns';

export default function PerformanceMatrixChart({ cantieri }) {
  const data = useMemo(() => {
    const today = new Date();
    
    return cantieri
      .filter(c => c.stato === 'attivo' && c.data_inizio && c.data_fine_prevista)
      .map(c => {
        const start = parseISO(c.data_inizio);
        const end = parseISO(c.data_fine_prevista);
        const totalDuration = differenceInDays(end, start);
        const elapsed = differenceInDays(today, start);
        
        let timeProgress = 0;
        if (totalDuration > 0) {
          timeProgress = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 120); // Cap a 120% per evitare grafici rotti
        }

        const workProgress = c.avanzamento || 0;
        
        // Calcola stato performance
        // Se Avanzamento < Tempo trascorso - 10% = Ritardo
        const isDelayed = workProgress < (timeProgress - 10);
        
        return {
          id: c.id,
          name: c.denominazione,
          x: Math.round(timeProgress), // % Tempo
          y: workProgress, // % Lavoro
          z: (c.importo_contratto || 1), // Dimensione bolla
          isDelayed,
          importo: c.importo_contratto
        };
      });
  }, [cantieri]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border-0 rounded-xl shadow-xl max-w-[250px]">
          <p className="font-bold text-sm text-slate-900 mb-1 line-clamp-2">{data.name}</p>
          <div className="space-y-1 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Tempo Trascorso:</span>
              <span className="font-mono font-medium">{data.x}%</span>
            </div>
            <div className="flex justify-between">
              <span>Avanzamento Lavori:</span>
              <span className={`font-mono font-medium ${data.isDelayed ? 'text-red-600' : 'text-emerald-600'}`}>
                {data.y}%
              </span>
            </div>
            {data.isDelayed && (
              <div className="mt-2 pt-2 border-t border-slate-100 text-red-600 font-semibold flex items-center gap-1">
                ⚠️ In Ritardo
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-0 shadow-lg bg-white rounded-2xl h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold text-slate-900">Matrice Performance</CardTitle>
        <p className="text-sm text-slate-500">Avanzamento Lavori (Y) vs Tempo Trascorso (X)</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis 
              type="number" 
              dataKey="x" 
              name="Tempo" 
              unit="%" 
              domain={[0, 100]} 
              tick={{ fill: '#64748b', fontSize: 12 }}
              label={{ value: 'Tempo Trascorso', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 11 }}
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              name="Avanzamento" 
              unit="%" 
              domain={[0, 100]} 
              tick={{ fill: '#64748b', fontSize: 12 }}
              label={{ value: 'Avanzamento', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 100, y: 100 }]} stroke="#cbd5e1" strokeDasharray="3 3" />
            
            {/* Area di "Pericolo" (sotto la diagonale) */}
            
            <Scatter name="Cantieri" data={data}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.isDelayed ? '#ef4444' : '#10b981'} 
                  fillOpacity={0.6}
                  stroke={entry.isDelayed ? '#b91c1c' : '#047857'}
                  strokeWidth={2}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-6 mt-2 text-xs text-slate-500">
            <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 opacity-60 border border-emerald-700"></span>
                <span>In linea / Anticipo</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500 opacity-60 border border-red-700"></span>
                <span>In Ritardo</span>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}