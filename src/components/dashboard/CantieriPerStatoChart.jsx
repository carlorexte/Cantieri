import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { TrendingUp } from 'lucide-react';

const COLORS = {
  attivo: '#10b981',
  sospeso: '#f59e0b',
  completato: '#3b82f6',
  in_gara: '#8b5cf6'
};

const STATUS_LABELS = {
  attivo: 'Attivi',
  sospeso: 'Sospesi',
  completato: 'Completati',
  in_gara: 'In Gara'
};

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

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
    <Card className="border-0 shadow-lg bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
          Distribuzione per Stato
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}