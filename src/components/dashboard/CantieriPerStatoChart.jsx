import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = {
  attivo: "#6366f1",
  sospeso: "#f59e0b",
  completato: "#10b981",
  in_gara: "#8b5cf6"
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
      color: COLORS[stato] || '#6b7280'
    }));
  }, [cantieri]);

  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-slate-900">Cantieri per Stato</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={90}
              fill="#8884d8"
              dataKey="value"
              strokeWidth={2}
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
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '12px'
              }}
            />
            <Legend 
              wrapperStyle={{ fontSize: '12px' }}
              iconType="circle"
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}