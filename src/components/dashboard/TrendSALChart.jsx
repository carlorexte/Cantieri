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
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-md">
          <p className="font-semibold text-slate-800 mb-2">{payload[0].payload.month}</p>
          <p className="text-sm text-indigo-600">Fatturato: <span className="font-bold">€{payload[0].value}K</span></p>
          <p className="text-sm text-emerald-600">Incassato: <span className="font-bold">€{payload[1].value}K</span></p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-slate-900">Trend SAL Ultimi 12 Mesi</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ left: 10, right: 10, bottom: 20 }}>
            <defs>
              <linearGradient id="colorFatturato" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorIncassato" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 11, fill: '#64748b' }}
              angle={-45}
              textAnchor="end"
              height={80}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
              label={{ value: 'Migliaia €', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#64748b' } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            <Line 
              type="monotone" 
              dataKey="fatturato" 
              stroke="#6366f1" 
              strokeWidth={3}
              name="Fatturato"
              dot={false}
              activeDot={{ r: 5, fill: '#6366f1' }}
              fillOpacity={1} 
              fill="url(#colorFatturato)"
              animationBegin={0}
              animationDuration={1000}
              animationEasing="ease-in-out"
            />
            <Line 
              type="monotone" 
              dataKey="incassato" 
              stroke="#10b981" 
              strokeWidth={3}
              name="Incassato"
              dot={false}
              activeDot={{ r: 5, fill: '#10b981' }}
              fillOpacity={1} 
              fill="url(#colorIncassato)"
              animationBegin={100}
              animationDuration={1000}
              animationEasing="ease-in-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}