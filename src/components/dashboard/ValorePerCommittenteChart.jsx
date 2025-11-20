import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

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
      .map((item, index) => ({
        ...item,
        valoreM: parseFloat((item.valore / 1000000).toFixed(2)),
        color: index === 0 ? '#FF8C42' : index < 3 ? '#4ECDC4' : '#94A3B8'
      }));
  }, [cantieri]);

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
            {payload[0].payload.committente}
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-slate-600">Cantieri</span>
              <span className="text-sm font-bold text-slate-900">{payload[0].payload.count}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-slate-600">Valore</span>
              <span className="text-sm font-bold" style={{ color: '#FF8C42' }}>
                €{payload[0].payload.valoreM.toFixed(2)}M
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-0 shadow-lg bg-white overflow-hidden" style={{ borderRadius: '16px' }}>
      <CardHeader className="pb-4">
        <div>
          <CardTitle className="text-2xl font-bold mb-1" style={{ color: '#17171C' }}>
            Top Committenti
          </CardTitle>
          <p className="text-sm font-medium" style={{ color: '#6C757D' }}>
            Valore totale contratti per cliente
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data} layout="vertical" margin={{ left: 150, right: 40, top: 10, bottom: 10 }}>
            <defs>
              <linearGradient id="topGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#FF8C42" />
                <stop offset="100%" stopColor="#FF6B6B" />
              </linearGradient>
              <linearGradient id="secondGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#4ECDC4" />
                <stop offset="100%" stopColor="#3ABDB3" />
              </linearGradient>
              <filter id="shadow">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15"/>
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" strokeOpacity={0.3} horizontal={false} />
            <XAxis 
              type="number" 
              tick={{ fontSize: 11, fill: '#6C757D', fontWeight: 500 }}
              axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
              tickLine={false}
              label={{ 
                value: 'Milioni €', 
                position: 'insideBottom', 
                offset: -5, 
                style: { fontSize: 11, fill: '#6C757D', fontWeight: 500 } 
              }}
            />
            <YAxis 
              type="category" 
              dataKey="committente" 
              width={140}
              tick={{ fontSize: 11, fill: '#2C3E50', fontWeight: 600 }}
              axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 140, 66, 0.06)' }} />
            <Bar 
              dataKey="valoreM" 
              radius={[0, 12, 12, 0]} 
              barSize={32}
              animationBegin={0}
              animationDuration={1000}
              animationEasing="ease-out"
              filter="url(#shadow)"
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={index === 0 ? 'url(#topGradient)' : index < 3 ? 'url(#secondGradient)' : entry.color}
                />
              ))}
              <LabelList 
                dataKey="valoreM" 
                position="right" 
                formatter={(value) => `€${value}M`}
                style={{ fill: '#2C3E50', fontSize: 11, fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}