import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

const CustomTooltip = ({ active, payload, label }) => {
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
          {label}
        </p>
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: 'linear-gradient(135deg, #FF6B6B, #EE5A5A)' }} />
            <span className="text-sm font-medium text-slate-600">Costi</span>
          </div>
          <span className="text-sm font-bold" style={{ color: '#FF6B6B' }}>
            €{payload[0].value}K
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export default function CostiMensiliChart({ costiData }) {
  const data = React.useMemo(() => {
    if (!costiData || costiData.length === 0) return [];

    const monthlyCosts = {};
    const today = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = format(date, 'MMM yyyy', { locale: it });
      monthlyCosts[monthKey] = { month: monthKey, costi: 0 };
    }

    costiData.forEach(costo => {
      if (!costo.data_sostenimento) return;

      try {
        const costoDate = parseISO(costo.data_sostenimento);
        const monthKey = format(startOfMonth(costoDate), 'MMM yyyy', { locale: it });

        if (monthlyCosts[monthKey]) {
          monthlyCosts[monthKey].costi += costo.importo || 0;
        }
      } catch (error) {
        console.error('Errore parsing data costo:', error);
      }
    });

    return Object.values(monthlyCosts).map(m => ({
      month: m.month,
      costi: parseFloat((m.costi / 1000).toFixed(1))
    }));
  }, [costiData]);

  return (
    <Card className="border-0 shadow-lg bg-white overflow-hidden" style={{ borderRadius: '16px' }}>
      <CardHeader className="pb-4">
        <div>
          <CardTitle className="text-2xl font-bold mb-1" style={{ color: '#17171C' }}>
            Andamento Costi
          </CardTitle>
          <p className="text-sm font-medium" style={{ color: '#6C757D' }}>
            Spese mensili degli ultimi 12 mesi
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ left: 10, right: 20, top: 10, bottom: 20 }}>
            <defs>
              <linearGradient id="colorCosti" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF6B6B" stopOpacity={0.4}/>
                <stop offset="100%" stopColor="#FF6B6B" stopOpacity={0.05}/>
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
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#FF6B6B', strokeWidth: 2, strokeDasharray: '5 5' }} />
            <Area 
              type="monotone" 
              dataKey="costi" 
              stroke="#FF6B6B" 
              strokeWidth={3}
              name="Costi"
              dot={{ r: 4, fill: '#FF6B6B', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 7, fill: '#FF6B6B', strokeWidth: 3, stroke: '#fff', filter: 'drop-shadow(0 4px 6px rgba(255, 107, 107, 0.4))' }}
              fill="url(#colorCosti)"
              animationBegin={0}
              animationDuration={1200}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}