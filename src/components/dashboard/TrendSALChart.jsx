import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
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
        <div 
          className="bg-white p-4 rounded-2xl border-0" 
          style={{ 
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <p className="font-bold text-base mb-3" style={{ color: '#2C3E50' }}>
            {payload[0].payload.month}
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: 'linear-gradient(135deg, #FF8C42, #FF6B6B)' }} />
                <span className="text-sm font-medium text-slate-600">Fatturato</span>
              </div>
              <span className="text-sm font-bold" style={{ color: '#FF8C42' }}>
                €{payload[0].value}K
              </span>
            </div>
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: 'linear-gradient(135deg, #2ECC71, #27AE60)' }} />
                <span className="text-sm font-medium text-slate-600">Incassato</span>
              </div>
              <span className="text-sm font-bold" style={{ color: '#2ECC71' }}>
                €{payload[1].value}K
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-0 shadow-lg bg-white overflow-hidden group" style={{ borderRadius: '16px' }}>
      <CardHeader className="pb-4">
        <div>
          <CardTitle className="text-2xl font-bold mb-1" style={{ color: '#17171C' }}>
            Trend SAL Mensile
          </CardTitle>
          <p className="text-sm font-medium" style={{ color: '#6C757D' }}>
            Fatturato e incassi degli ultimi 12 mesi
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ left: 10, right: 20, top: 10, bottom: 20 }}>
            <defs>
              <linearGradient id="colorFatturato" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF8C42" stopOpacity={0.4}/>
                <stop offset="100%" stopColor="#FF8C42" stopOpacity={0.05}/>
              </linearGradient>
              <linearGradient id="colorIncassato" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2ECC71" stopOpacity={0.4}/>
                <stop offset="100%" stopColor="#2ECC71" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" strokeOpacity={0.3} vertical={false} />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 11, fill: '#6C757D', fontWeight: 500 }}
              angle={-45}
              textAnchor="end"
              height={80}
              axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: '#6C757D', fontWeight: 500 }}
              axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
              tickLine={false}
              label={{ 
                value: 'Migliaia €', 
                angle: -90, 
                position: 'insideLeft', 
                style: { fontSize: 11, fill: '#6C757D', fontWeight: 500 } 
              }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#FF8C42', strokeWidth: 2, strokeDasharray: '5 5' }} />
            <Legend 
              wrapperStyle={{ 
                fontSize: '13px', 
                paddingTop: '20px', 
                fontWeight: 600
              }} 
              iconType="circle"
            />
            <Area 
              type="monotone" 
              dataKey="fatturato" 
              stroke="#FF8C42" 
              strokeWidth={3}
              name="Fatturato"
              dot={{ r: 4, fill: '#FF8C42', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 7, fill: '#FF8C42', strokeWidth: 3, stroke: '#fff', filter: 'drop-shadow(0 4px 6px rgba(255, 140, 66, 0.4))' }}
              fill="url(#colorFatturato)"
              animationBegin={0}
              animationDuration={1200}
              animationEasing="ease-out"
            />
            <Area 
              type="monotone" 
              dataKey="incassato" 
              stroke="#2ECC71" 
              strokeWidth={3}
              name="Incassato"
              dot={{ r: 4, fill: '#2ECC71', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 7, fill: '#2ECC71', strokeWidth: 3, stroke: '#fff', filter: 'drop-shadow(0 4px 6px rgba(46, 204, 113, 0.4))' }}
              fill="url(#colorIncassato)"
              animationBegin={200}
              animationDuration={1200}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}