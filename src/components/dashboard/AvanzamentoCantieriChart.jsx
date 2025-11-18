import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const getColorByAvanzamento = (avanzamento) => {
  if (avanzamento >= 75) return '#10b981';
  if (avanzamento >= 50) return '#3b82f6';
  if (avanzamento >= 25) return '#f59e0b';
  return '#ef4444';
};

export default function AvanzamentoCantieriChart({ cantieri }) {
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 10;

  const allData = React.useMemo(() => {
    return cantieri
      .filter(c => c.stato === 'attivo')
      .map(cantiere => ({
        nome: cantiere.denominazione.length > 30 
          ? cantiere.denominazione.substring(0, 27) + '...' 
          : cantiere.denominazione,
        nomeCompleto: cantiere.denominazione,
        avanzamento: cantiere.avanzamento || 0
      }))
      .sort((a, b) => a.avanzamento - b.avanzamento);
  }, [cantieri]);

  const totalPages = Math.ceil(allData.length / ITEMS_PER_PAGE);
  const data = allData.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  };

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
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="pb-4 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold text-slate-900">
          Avanzamento Cantieri Attivi
          <span className="text-sm font-normal text-slate-500 ml-2">
            ({allData.length} cantieri)
          </span>
        </CardTitle>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={currentPage === 0}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-slate-600">
              {currentPage + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages - 1}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data} layout="vertical" margin={{ left: 150, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis 
              type="number" 
              domain={[0, 100]} 
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
            />
            <YAxis 
              type="category" 
              dataKey="nome" 
              width={140}
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="avanzamento" radius={[0, 6, 6, 0]} barSize={18}>
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