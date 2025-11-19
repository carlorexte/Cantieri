import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const getColorByAvanzamento = (avanzamento) => {
  if (avanzamento >= 75) return '#10b981';
  if (avanzamento >= 50) return '#FF902C';
  if (avanzamento >= 25) return '#FFC60D';
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
        <div className="bg-white p-3 border-0 rounded-xl shadow-xl" style={{ borderRadius: '12px' }}>
          <p className="font-semibold mb-1" style={{ color: '#17171C' }}>{payload[0].payload.nomeCompleto}</p>
          <p className="text-sm font-semibold" style={{ color: '#FF902C' }}>
            Avanzamento: {payload[0].payload.avanzamento}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-0 shadow-lg bg-white" style={{ borderRadius: '16px' }}>
      <CardHeader className="pb-4 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold" style={{ color: '#17171C' }}>
          Avanzamento Cantieri Attivi
          <span className="text-sm font-normal ml-2" style={{ color: '#626671' }}>
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
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
            <XAxis 
              type="number" 
              domain={[0, 100]} 
              tick={{ fontSize: 11, fill: '#626671' }}
              axisLine={{ stroke: '#E5E7EB' }}
              tickLine={false}
            />
            <YAxis 
              type="category" 
              dataKey="nome" 
              width={140}
              tick={{ fontSize: 11, fill: '#2C2E33' }}
              axisLine={{ stroke: '#E5E7EB' }}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 144, 44, 0.06)' }} />
            <Bar 
              dataKey="avanzamento" 
              radius={[0, 8, 8, 0]} 
              barSize={20}
              animationBegin={0}
              animationDuration={800}
              animationEasing="ease-out"
            >
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