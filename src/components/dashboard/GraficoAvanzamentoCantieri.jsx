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
        <div className="bg-white p-3 border-none rounded-xl shadow-lg">
          <p className="font-semibold text-slate-900 mb-1">{payload[0].payload.nome}</p>
          <p className="text-sm text-[#6c5ce7] font-medium">
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
      <Card className="border-0 shadow-sm bg-white rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-slate-800">
            <div className="w-10 h-10 rounded-xl bg-[#00cec9] flex items-center justify-center">
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
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow bg-white rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-slate-800">
          <div className="w-10 h-10 rounded-xl bg-[#00cec9] flex items-center justify-center shadow-sm">
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
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis 
              type="number"
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: '#94a3b8' }}
              stroke="#e5e7eb"
              axisLine={false}
            />
            <YAxis 
              type="category"
              dataKey="nome"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              stroke="#e5e7eb"
              axisLine={false}
              width={150}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="avanzamento" 
              fill="#6c5ce7"
              radius={[0, 8, 8, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={
                    entry.avanzamento >= 75 ? '#00b894' :
                    entry.avanzamento >= 50 ? '#74b9ff' :
                    entry.avanzamento >= 25 ? '#fdcb6e' :
                    '#ff7675'
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