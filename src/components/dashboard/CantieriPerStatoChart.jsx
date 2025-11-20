import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = {
  attivo: "#FF8C42",
  sospeso: "#FFC60D",
  completato: "#2ECC71",
  in_gara: "#4ECDC4"
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
    }));
  }, [cantieri]);

  const totalCantieri = React.useMemo(() => {
    return data.reduce((sum, item) => sum + item.value, 0);
  }, [data]);

  return (
    <Card className="border-0 shadow-lg bg-white overflow-hidden" style={{ borderRadius: '16px' }}>
      <CardHeader className="pb-4">
        <div>
          <CardTitle className="text-2xl font-bold mb-1" style={{ color: '#17171C' }}>Distribuzione Cantieri</CardTitle>
          <p className="text-sm font-medium" style={{ color: '#6C757D' }}>Stato attuale di tutti i progetti</p>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              innerRadius={70}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              strokeWidth={4}
              stroke="#fff"
              animationBegin={0}
              animationDuration={1200}
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
                borderRadius: '16px',
                fontSize: '13px',
                padding: '12px 16px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                backdropFilter: 'blur(10px)'
              }}
            />
            <Legend 
              wrapperStyle={{ fontSize: '13px', color: '#2C2E33' }}
              iconType="circle"
            />
            <text 
              x="50%" 
              y="48%" 
              textAnchor="middle" 
              dominantBaseline="middle"
              style={{ fontSize: '36px', fontWeight: '700', fill: '#17171C' }}
            >
              {totalCantieri}
            </text>
            <text 
              x="50%" 
              y="58%" 
              textAnchor="middle" 
              dominantBaseline="middle"
              style={{ fontSize: '12px', fill: '#6C757D', fontWeight: '500' }}
            >
              Cantieri Attivi
            </text>
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}