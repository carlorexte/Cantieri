import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3 } from 'lucide-react';

const getColorByAvanzamento = (avanzamento) => {
  if (avanzamento >= 75) return '#10b981';
  if (avanzamento >= 50) return '#3b82f6';
  if (avanzamento >= 25) return '#f59e0b';
  return '#ef4444';
};

export default function AvanzamentoCantieriChart({ cantieri }) {
  const data = React.useMemo(() => {
    return cantieri
      .filter(c => c.stato === 'attivo')
      .map(cantiere => ({
        nome: cantiere.denominazione.length > 30 
          ? cantiere.denominazione.substring(0, 27) + '...' 
          : cantiere.denominazione,
        nomeCompleto: cantiere.denominazione,
        avanzamento: cantiere.avanzamento || 0
      }))
      .sort((a, b) => a.avanzamento - b.avanzamento)
      .slice(0, 15);
  }, [cantieri]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="font-semibold text-slate-900 mb-1">{payload[0].payload.nomeCompleto}</p>
          <p className="text-sm text-indigo-600 font-semibold">
            Avanzamento: {payload[0].payload.avanzamento}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-0 shadow-lg bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-600" />
          Avanzamento Cantieri Attivi
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data} layout="vertical" margin={{ left: 150, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, 100]} />
            <YAxis 
              type="category" 
              dataKey="nome" 
              width={140}
              tick={{ fontSize: 11 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="avanzamento" radius={[0, 8, 8, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColorByAvanzamento(entry.avanzamento)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}