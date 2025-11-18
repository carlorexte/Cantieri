import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Building2 } from 'lucide-react';

export default function ValorePerCommittenteChart({ cantieri }) {
  const data = React.useMemo(() => {
    const grouped = cantieri.reduce((acc, cantiere) => {
      const committente = cantiere.committente_ragione_sociale || 'Non Specificato';
      const importo = cantiere.importo_contratto || 0;
      
      if (!acc[committente]) {
        acc[committente] = { committente, valore: 0, count: 0 };
      }
      acc[committente].valore += importo;
      acc[committente].count += 1;
      
      return acc;
    }, {});

    return Object.values(grouped)
      .sort((a, b) => b.valore - a.valore)
      .slice(0, 10)
      .map(item => ({
        ...item,
        valoreM: parseFloat((item.valore / 1000000).toFixed(2))
      }));
  }, [cantieri]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="font-semibold text-slate-900">{payload[0].payload.committente}</p>
          <p className="text-sm text-slate-600">Cantieri: {payload[0].payload.count}</p>
          <p className="text-sm text-indigo-600 font-semibold">
            Valore: €{payload[0].payload.valoreM.toFixed(2)}M
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-slate-900">Valore per Committente (Top 10)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data} layout="vertical" margin={{ left: 150, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis 
              type="number" 
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
              label={{ value: 'Milioni €', position: 'insideBottom', offset: -5, style: { fontSize: 11, fill: '#64748b' } }}
            />
            <YAxis 
              type="category" 
              dataKey="committente" 
              width={140}
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="valoreM" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}