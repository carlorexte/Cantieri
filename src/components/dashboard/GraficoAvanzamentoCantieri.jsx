import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3 } from 'lucide-react';

export default function GraficoAvanzamentoCantieri({ cantieri }) {
  const chartData = useMemo(() => {
    if (!cantieri || cantieri.length === 0) return [];

    return cantieri
      .filter(c => c.stato === 'attivo')
      .slice(0, 10)
      .map(cantiere => ({
        nome: cantiere.denominazione.length > 25 
          ? cantiere.denominazione.substring(0, 25) + '...' 
          : cantiere.denominazione,
        avanzamento: cantiere.avanzamento || 0,
        importo: (cantiere.importo_contratto || 0) / 1000
      }))
      .sort((a, b) => b.avanzamento - a.avanzamento);
  }, [cantieri]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-sm p-4 border-none rounded-2xl shadow-2xl">
          <p className="font-semibold text-slate-900 mb-2">{payload[0].payload.nome}</p>
          <p className="text-sm text-purple-600 font-medium">
            Avanzamento: {payload[0].value}%
          </p>
          <p className="text-sm text-slate-600">
            Importo: €{Number(payload[0].payload.importo * 1000).toLocaleString('it-IT')}
          </p>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm rounded-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            Avanzamento Cantieri Attivi
          </CardTitle>
        </CardHeader>
        <CardContent className="p-12 text-center">
          <BarChart3 className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500">Nessun cantiere attivo</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg hover:shadow-xl transition-all bg-white/80 backdrop-blur-sm rounded-3xl overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-800">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          Avanzamento Cantieri Attivi
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart 
            data={chartData}
            layout="horizontal"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              type="number"
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: '#64748b' }}
              stroke="#cbd5e1"
              label={{ value: 'Avanzamento (%)', position: 'insideBottom', offset: -5 }}
            />
            <YAxis 
              type="category"
              dataKey="nome"
              tick={{ fontSize: 11, fill: '#64748b' }}
              stroke="#cbd5e1"
              width={150}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="avanzamento" 
              fill="#8b5cf6"
              radius={[0, 12, 12, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={
                    entry.avanzamento >= 75 ? '#10b981' :
                    entry.avanzamento >= 50 ? '#3b82f6' :
                    entry.avanzamento >= 25 ? '#f59e0b' :
                    '#ef4444'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}