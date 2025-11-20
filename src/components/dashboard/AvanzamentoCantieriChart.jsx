import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const getColorByAvanzamento = (avanzamento) => {
  if (avanzamento >= 75) return { start: '#2ECC71', end: '#27AE60' };
  if (avanzamento >= 50) return { start: '#FF8C42', end: '#FF6B6B' };
  if (avanzamento >= 25) return { start: '#4ECDC4', end: '#3ABDB3' };
  return { start: '#FF6B6B', end: '#EE5A5A' };
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
      const colors = getColorByAvanzamento(payload[0].payload.avanzamento);
      return (
        <div 
          className="bg-white p-4 rounded-2xl border-0" 
          style={{ 
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <p className="font-bold text-base mb-3" style={{ color: '#2C3E50' }}>
            {payload[0].payload.nomeCompleto}
          </p>
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ background: `linear-gradient(135deg, ${colors.start}, ${colors.end})` }} 
              />
              <span className="text-sm font-medium text-slate-600">Avanzamento</span>
            </div>
            <span className="text-sm font-bold" style={{ color: colors.start }}>
              {payload[0].payload.avanzamento}%
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-0 shadow-lg bg-white overflow-hidden" style={{ borderRadius: '16px' }}>
      <CardHeader className="pb-4 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-2xl font-bold mb-1" style={{ color: '#17171C' }}>
            Avanzamento Cantieri Attivi
          </CardTitle>
          <p className="text-sm font-medium" style={{ color: '#6C757D' }}>
            Monitoraggio {allData.length} cantieri in corso
          </p>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={currentPage === 0}
              className="h-8 w-8 p-0 hover:bg-orange-50 hover:border-orange-200"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold text-slate-700 min-w-[60px] text-center">
              {currentPage + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages - 1}
              className="h-8 w-8 p-0 hover:bg-orange-50 hover:border-orange-200"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={450}>
          <BarChart data={data} layout="vertical" margin={{ left: 150, right: 50, top: 10, bottom: 10 }}>
            <defs>
              <filter id="barShadow">
                <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.2"/>
              </filter>
              {data.map((entry, index) => {
                const colors = getColorByAvanzamento(entry.avanzamento);
                return (
                  <linearGradient key={`gradient-${index}`} id={`barGradient-${index}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={colors.start} />
                    <stop offset="100%" stopColor={colors.end} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" strokeOpacity={0.3} horizontal={false} />
            <XAxis 
              type="number" 
              domain={[0, 100]} 
              tick={{ fontSize: 11, fill: '#6C757D', fontWeight: 500 }}
              axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
              tickLine={false}
              label={{ value: '%', position: 'insideRight', style: { fontSize: 11, fill: '#6C757D', fontWeight: 500 } }}
            />
            <YAxis 
              type="category" 
              dataKey="nome" 
              width={140}
              tick={{ fontSize: 11, fill: '#2C3E50', fontWeight: 600 }}
              axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 140, 66, 0.06)' }} />
            <Bar 
              dataKey="avanzamento" 
              radius={[0, 12, 12, 0]} 
              barSize={28}
              animationBegin={0}
              animationDuration={1000}
              animationEasing="ease-out"
              filter="url(#barShadow)"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={`url(#barGradient-${index})`} />
              ))}
              <LabelList 
                dataKey="avanzamento" 
                position="right" 
                formatter={(value) => `${value}%`}
                style={{ fill: '#2C3E50', fontSize: 11, fontWeight: 700 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}