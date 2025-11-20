import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = [
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#14b8a6', // Teal
  '#f59e0b', // Amber
  '#f43f5e', // Rose
  '#3b82f6', // Blue
];

export default function CostBreakdownChart({ costiData }) {
  const data = useMemo(() => {
    const aggregated = costiData.reduce((acc, curr) => {
      const category = curr.categoria || 'Altro';
      acc[category] = (acc[category] || 0) + (curr.importo || 0);
      return acc;
    }, {});

    return Object.entries(aggregated)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' '),
        value
      }))
      .sort((a, b) => b.value - a.value);
  }, [costiData]);

  const totalCosts = data.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const percent = ((item.value / totalCosts) * 100).toFixed(1);
      return (
        <div className="bg-white p-2 border-0 rounded-lg shadow-lg">
          <span className="font-semibold text-slate-700">{item.name}</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-bold text-indigo-600">€{item.value.toLocaleString('it-IT')}</span>
            <span className="text-xs text-slate-500">({percent}%)</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-0 shadow-lg bg-white rounded-2xl h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold text-slate-900">Ripartizione Costi</CardTitle>
        <p className="text-sm text-slate-500">Spese per categoria</p>
      </CardHeader>
      <CardContent className="flex items-center justify-center">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={85}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                layout="vertical" 
                verticalAlign="middle" 
                align="right"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '12px', color: '#64748b' }}
              />
              <text 
                x="50%" 
                y="50%" 
                textAnchor="middle" 
                dominantBaseline="middle"
                className="fill-slate-900 font-bold text-lg"
              >
                €{(totalCosts / 1000).toFixed(0)}k
              </text>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] w-full flex items-center justify-center text-slate-400 text-sm">
            Nessun dato sui costi disponibile
          </div>
        )}
      </CardContent>
    </Card>
  );
}