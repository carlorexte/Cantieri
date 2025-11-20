import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = {
  attivo: "#FF902C",
  sospeso: "#FFC60D",
  completato: "#10b981",
  in_gara: "#6366f1"
};

const STATUS_LABELS = {
  attivo: "Attivi",
  sospeso: "Sospesi",
  completato: "Completati",
  in_gara: "In Gara"
};

export default function CantieriPerStatoChart({ cantieri }) {
  const data = React.useMemo(() => {
    const grouped = cantieri.reduce((acc, cantiere) => {
      const stato = cantiere.stato || 'attivo';
      acc[stato] = (acc[stato] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(grouped).map(([stato, count]) => ({
      name: STATUS_LABELS[stato] || stato,
      value: count,
      color: COLORS[stato] || '#626671'
    })).sort((a, b) => b.value - a.value);
  }, [cantieri]);

  const totalCantieri = React.useMemo(() => {
    return data.reduce((sum, item) => sum + item.value, 0);
  }, [data]);

  return (
    <Card className="border-0 shadow-lg bg-white" style={{ borderRadius: '16px' }}>
      <CardHeader className="pb-4">
        <div>
          <CardTitle className="text-lg font-bold text-slate-900">Distribuzione Cantieri</CardTitle>
          <p className="text-sm text-slate-500">Stato attuale di tutti i progetti</p>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              cx="40%"
              cy="50%"
              labelLine={false}
              innerRadius={70}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              strokeWidth={3}
              stroke="#fff"
              animationBegin={0}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: 'none',
                borderRadius: '12px',
                fontSize: '13px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}
            />
            <Legend 
              layout="vertical"
              verticalAlign="middle"
              align="right"
              wrapperStyle={{ fontSize: '13px', color: '#2C2E33' }}
              iconType="circle"
            />
            <text 
              x="40%" 
              y="45%" 
              textAnchor="middle" 
              dominantBaseline="middle"
              style={{ fontSize: '32px', fontWeight: '700', fill: '#17171C' }}
            >
              {totalCantieri}
            </text>
            <text 
              x="40%" 
              y="55%" 
              textAnchor="middle" 
              dominantBaseline="middle"
              style={{ fontSize: '13px', fill: '#626671' }}
            >
              Totale Cantieri
            </text>
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}