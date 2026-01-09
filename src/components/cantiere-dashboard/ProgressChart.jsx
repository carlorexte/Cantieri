import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { format, eachMonthOfInterval, startOfMonth, endOfMonth, isSameMonth, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export default function ProgressChart({ cantiere, salList }) {
  const data = useMemo(() => {
    if (!cantiere?.data_inizio || !cantiere?.data_fine_prevista) return [];

    const startDate = parseISO(cantiere.data_inizio);
    const endDate = parseISO(cantiere.data_fine_prevista);
    const today = new Date();
    
    // Genera intervallo di mesi
    const months = eachMonthOfInterval({
      start: startOfMonth(startDate),
      end: endOfMonth(endDate > today ? endDate : today)
    });

    const totalAmount = cantiere.importo_contrattuale_oltre_iva || 0;
    const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);

    let cumulativeSal = 0;

    return months.map(month => {
      const monthEnd = endOfMonth(month);
      
      // Calcola valore previsto (lineare)
      let expectedValue = 0;
      if (monthEnd >= startDate) {
        const daysPassed = Math.max(0, (monthEnd - startDate) / (1000 * 60 * 60 * 24));
        const progress = Math.min(1, daysPassed / totalDays);
        expectedValue = totalAmount * progress;
      }

      // Calcola valore reale (SAL cumulativi fino a questo mese)
      const salsInMonth = salList.filter(sal => {
        const salDate = parseISO(sal.data_sal);
        return salDate <= monthEnd && sal.tipo_sal_dettaglio !== 'anticipazione';
      });
      
      // Ricalcoliamo il cumulativo corretto basandoci sulla lista completa filtrata per data
      const currentSalTotal = salsInMonth.reduce((sum, sal) => sum + (sal.imponibile || 0), 0);

      // Mostra il dato reale solo se il mese è passato o corrente
      const isPastOrCurrent = month <= endOfMonth(today);

      return {
        name: format(month, 'MMM yy', { locale: it }),
        previsto: Math.round(expectedValue),
        reale: isPastOrCurrent ? Math.round(currentSalTotal) : null,
        fullDate: month
      };
    });
  }, [cantiere, salList]);

  if (!cantiere?.importo_contrattuale_oltre_iva) {
    return null;
  }

  return (
    <Card className="shadow-lg border-0 h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="w-5 h-5 text-indigo-600" />
          Andamento Lavori (Temporale vs Economico)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis 
                dataKey="name" 
                stroke="#64748B"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="#64748B"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value) => [`€ ${Number(value).toLocaleString('it-IT')}`, undefined]}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="previsto" 
                name="Previsto (Teorico)" 
                stroke="#94A3B8" 
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="reale" 
                name="Reale (SAL)" 
                stroke="#4F46E5" 
                strokeWidth={3}
                dot={{ r: 4, fill: '#4F46E5', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6, fill: '#4F46E5', strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}