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
        <div className="bg-white p-3 border-0 rounded-xl shadow-xl" style={{ borderRadius: '12px' }}>
          <p className="font-semibold mb-2" style={{ color: '#17171C' }}>{payload[0].payload.month}</p>
          <p className="text-sm" style={{ color: '#FF902C' }}>Fatturato: <span className="font-bold">€{payload[0].value}K</span></p>
          <p className="text-sm" style={{ color: '#10b981' }}>Incassato: <span className="font-bold">€{payload[1].value}K</span></p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-0 shadow-lg bg-white" style={{ borderRadius: '16px' }}>
      <CardHeader className="pb-4">
        <div>
          <CardTitle className="text-2xl font-bold mb-1" style={{ color: '#17171C' }}>Trend SAL Mensile</CardTitle>
          <p className="text-sm font-medium" style={{ color: '#626671' }}>Fatturato e incassi degli ultimi 12 mesi</p>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ left: 10, right: 10, bottom: 20 }}>
            <defs>
              <linearGradient id="colorFatturato" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF8C42" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#FF8C42" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorIncassato" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2ECC71" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#2ECC71" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 11, fill: '#626671' }}
              angle={-45}
              textAnchor="end"
              height={80}
              axisLine={{ stroke: '#E5E7EB' }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: '#626671' }}
              axisLine={{ stroke: '#E5E7EB' }}
              tickLine={false}
              label={{ value: 'Migliaia €', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#626671' } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px', color: '#2C2E33' }} />
            <Line 
              type="monotone" 
              dataKey="fatturato" 
              stroke="#FF8C42" 
              strokeWidth={3}
              name="Fatturato"
              dot={false}
              activeDot={{ r: 6, fill: '#FF8C42', strokeWidth: 3, stroke: '#fff' }}
              fillOpacity={1} 
              fill="url(#colorFatturato)"
              animationBegin={0}
              animationDuration={1000}
              animationEasing="ease-out"
              tension={0.4}
            />
            <Line 
              type="monotone" 
              dataKey="incassato" 
              stroke="#2ECC71" 
              strokeWidth={3}
              name="Incassato"
              dot={false}
              activeDot={{ r: 6, fill: '#2ECC71', strokeWidth: 3, stroke: '#fff' }}
              fillOpacity={1} 
              fill="url(#colorIncassato)"
              animationBegin={100}
              animationDuration={1000}
              animationEasing="ease-out"
              tension={0.4}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}