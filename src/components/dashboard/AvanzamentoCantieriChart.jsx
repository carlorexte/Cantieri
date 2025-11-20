import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const getColorByAvanzamento = (avanzamento) => {
  if (avanzamento >= 75) return { from: '#2ECC71', to: '#27AE60', label: 'Eccellente' };
  if (avanzamento >= 50) return { from: '#FF8C42', to: '#FF6B6B', label: 'Buono' };
  if (avanzamento >= 25) return { from: '#4ECDC4', to: '#3ABDB3', label: 'In corso' };
  return { from: '#E11D48', to: '#BE123C', label: 'Critico' };
};

const CircularProgress = ({ cantiere }) => {
  const percentage = cantiere.avanzamento || 0;
  const colors = getColorByAvanzamento(percentage);
  
  const circumference = 2 * Math.PI * 32;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="group relative">
      <div className="flex flex-col items-center p-5 bg-white rounded-2xl border border-slate-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
        <div className="relative mb-4">
          <svg width="80" height="80" className="transform -rotate-90">
            <defs>
              <linearGradient id={`gradient-${cantiere.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={colors.from} />
                <stop offset="100%" stopColor={colors.to} />
              </linearGradient>
              <filter id={`shadow-${cantiere.id}`}>
                <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.25" floodColor={colors.from} />
              </filter>
            </defs>
            
            {/* Background circle */}
            <circle
              cx="40"
              cy="40"
              r="32"
              stroke="#E5E7EB"
              strokeWidth="6"
              fill="none"
            />
            
            {/* Progress circle */}
            <circle
              cx="40"
              cy="40"
              r="32"
              stroke={`url(#gradient-${cantiere.id})`}
              strokeWidth="6"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              filter={`url(#shadow-${cantiere.id})`}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold" style={{ color: colors.from }}>
              {percentage}%
            </span>
          </div>
        </div>

        <div className="w-full text-center space-y-2">
          <h4 className="text-sm font-semibold text-slate-900 line-clamp-2 min-h-[40px] px-2 leading-tight">
            {cantiere.denominazione}
          </h4>
          
          <div className="flex items-center justify-center gap-2">
            <div 
              className="px-3 py-1 rounded-full text-xs font-medium"
              style={{ 
                backgroundColor: `${colors.from}15`,
                color: colors.from 
              }}
            >
              {colors.label}
            </div>
          </div>

          {cantiere.indirizzo_citta && (
            <p className="text-xs text-slate-500 flex items-center justify-center gap-1 mt-1">
              <Building2 className="w-3 h-3" />
              {cantiere.indirizzo_citta}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default function AvanzamentoCantieriChart({ cantieri }) {
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 8;

  const allData = React.useMemo(() => {
    return cantieri
      .filter(c => c.stato === 'attivo')
      .sort((a, b) => (b.avanzamento || 0) - (a.avanzamento || 0));
  }, [cantieri]);

  const totalPages = Math.ceil(allData.length / ITEMS_PER_PAGE);
  const data = allData.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  };

  return (
    <Card className="border-0 shadow-lg bg-white overflow-hidden" style={{ borderRadius: '16px' }}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
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
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data.map((cantiere) => (
            <CircularProgress key={cantiere.id} cantiere={cantiere} />
          ))}
        </div>

        {data.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 mx-auto mb-3 text-slate-400" />
            <p className="text-slate-500 text-sm">Nessun cantiere attivo</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}