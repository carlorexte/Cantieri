import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { format, startOfMonth, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

export default function TrendSALChart({ salData }) {
  const data = React.useMemo(() => {
    if (!salData || salData.length === 0) return [];

    const last12Months = [];
    const today = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      last12Months.push({
        month: format(date, 'MMM yyyy', { locale: it }),
        date: date,
        fatturato: 0,
        incassato: 0
      });
    }

    salData.forEach(sal => {
      if (!sal.data_sal) return;
      
      try {
        const salDate = parseISO(sal.data_sal);
        const monthKey = format(startOfMonth(salDate), 'MMM yyyy', { locale: it });
        
        const monthData = last12Months.find(m => m.month === monthKey);
        if (monthData) {
          if (sal.tipo_sal_dettaglio !== 'anticipazione') {
            if (sal.stato_pagamento === 'fatturato' || sal.stato_pagamento === 'incassato') {
              monthData.fatturato += sal.imponibile || 0;
            }
            if (sal.stato_pagamento === 'incassato') {
              monthData.incassato += sal.importo_pagato || sal.imponibile || 0;
            }
          }
        }
      } catch (error) {
        console.error('Errore parsing data SAL:', error);
      }
    });

    return last12Months.map(m => ({
      month: m.month,
      fatturato: parseFloat((m.fatturato / 1000).toFixed(1)),
      incassato: parseFloat((m.incassato / 1000).toFixed(1))
    }));
  }, [salData]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="font-semibold text-slate-900 mb-2">{payload[0].payload.month}</p>
          <p className="text-sm text-blue-600">Fatturato: €{payload[0].value}K</p>
          <p className="text-sm text-green-600">Incassato: €{payload[1].value}K</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-0 shadow-lg bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
          Trend SAL (Ultimi 12 Mesi)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ left: 10, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              label={{ value: 'Migliaia €', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="fatturato" 
              stroke="#3b82f6" 
              strokeWidth={2}
              name="Fatturato"
              dot={{ r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="incassato" 
              stroke="#10b981" 
              strokeWidth={2}
              name="Incassato"
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}