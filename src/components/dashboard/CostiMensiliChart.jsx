import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-md">
        <p className="font-semibold text-slate-800 mb-2">{label}</p>
        <p className="text-sm text-red-600">Costi: <span className="font-bold">€{payload[0].value}K</span></p>
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
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-slate-900">Costi Mensili (Ultimi 12 Mesi)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data}>
            <defs>
              <linearGradient id="colorCosti" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
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
            <Line 
              type="monotone" 
              dataKey="costi" 
              stroke="#ef4444" 
              strokeWidth={3}
              name="Costi"
              dot={false}
              activeDot={{ r: 5, fill: '#ef4444' }}
              fillOpacity={1} 
              fill="url(#colorCosti)"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}