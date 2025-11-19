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
        <div className="bg-white p-3 border-0 rounded-xl shadow-xl" style={{ borderRadius: '12px' }}>
          <p className="font-semibold" style={{ color: '#17171C' }}>{payload[0].payload.committente}</p>
          <p className="text-sm" style={{ color: '#626671' }}>Cantieri: {payload[0].payload.count}</p>
          <p className="text-sm font-semibold" style={{ color: '#FF902C' }}>
            Valore: €{payload[0].payload.valoreM.toFixed(2)}M
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-0 shadow-lg bg-white" style={{ borderRadius: '16px' }}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold" style={{ color: '#17171C' }}>Valore per Committente (Top 10)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data} layout="vertical" margin={{ left: 150, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
            <XAxis 
              type="number" 
              tick={{ fontSize: 11, fill: '#626671' }}
              axisLine={{ stroke: '#E5E7EB' }}
              tickLine={false}
              label={{ value: 'Milioni €', position: 'insideBottom', offset: -5, style: { fontSize: 11, fill: '#626671' } }}
            />
            <YAxis 
              type="category" 
              dataKey="committente" 
              width={140}
              tick={{ fontSize: 11, fill: '#2C2E33' }}
              axisLine={{ stroke: '#E5E7EB' }}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 144, 44, 0.08)' }} />
            <Bar 
              dataKey="valoreM" 
              fill="#FF902C" 
              radius={[0, 8, 8, 0]} 
              barSize={22}
              animationBegin={0}
              animationDuration={800}
              animationEasing="ease-out"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}