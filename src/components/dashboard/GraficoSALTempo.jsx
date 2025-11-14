import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function GraficoSALTempo({ cantieri, salList }) {
  const chartData = useMemo(() => {
    if (!salList || salList.length === 0) return [];

    const salByCantiere = {};
    
    salList.forEach(sal => {
      if (sal.tipo_sal_dettaglio === 'anticipazione') return;
      
      if (!salByCantiere[sal.cantiere_id]) {
        salByCantiere[sal.cantiere_id] = [];
      }
      salByCantiere[sal.cantiere_id].push(sal);
    });

    const allDataPoints = new Map();
    
    Object.entries(salByCantiere).forEach(([cantiereId, sals]) => {
      const cantiere = cantieri.find(c => c.id === cantiereId);
      if (!cantiere) return;
      
      const sortedSals = [...sals].sort((a, b) => 
        new Date(a.data_sal) - new Date(b.data_sal)
      );
      
      let cumulativo = 0;
      sortedSals.forEach(sal => {
        cumulativo += sal.imponibile || 0;
        const dataKey = sal.data_sal;
        
        if (!allDataPoints.has(dataKey)) {
          allDataPoints.set(dataKey, { data: dataKey });
        }
        
        const punto = allDataPoints.get(dataKey);
        punto[cantiere.denominazione] = cumulativo;
      });
    });

    return Array.from(allDataPoints.values())
      .sort((a, b) => new Date(a.data) - new Date(b.data))
      .map(punto => ({
        ...punto,
        dataFormatted: format(new Date(punto.data), 'MMM yyyy', { locale: it })
      }));
  }, [salList, cantieri]);

  const cantieriAttivi = useMemo(() => {
    const cantieriConSAL = new Set(salList.map(s => s.cantiere_id));
    return cantieri.filter(c => cantieriConSAL.has(c.id)).slice(0, 5);
  }, [cantieri, salList]);

  const colors = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

  if (chartData.length === 0) {
    return (
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm rounded-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            Andamento SAL nel Tempo
          </CardTitle>
        </CardHeader>
        <CardContent className="p-12 text-center">
          <TrendingUp className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500">Nessun dato SAL disponibile</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg hover:shadow-xl transition-all bg-white/80 backdrop-blur-sm rounded-3xl overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-800">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          Andamento SAL nel Tempo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={chartData}>
            <defs>
              {cantieriAttivi.map((cantiere, idx) => (
                <linearGradient key={cantiere.id} id={`color${idx}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors[idx]} stopOpacity={0.4}/>
                  <stop offset="95%" stopColor={colors[idx]} stopOpacity={0.05}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="dataFormatted" 
              tick={{ fontSize: 12, fill: '#64748b' }}
              stroke="#cbd5e1"
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#64748b' }}
              stroke="#cbd5e1"
              tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                border: 'none',
                borderRadius: '16px',
                boxShadow: '0 8px 24px -4px rgba(103, 126, 234, 0.2)',
                padding: '12px'
              }}
              formatter={(value) => [`€${Number(value).toLocaleString('it-IT')}`, '']}
              labelStyle={{ fontWeight: 'bold', marginBottom: '8px', color: '#1e293b' }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />
            {cantieriAttivi.map((cantiere, idx) => (
              <Area
                key={cantiere.id}
                type="monotone"
                dataKey={cantiere.denominazione}
                stroke={colors[idx]}
                strokeWidth={3}
                fill={`url(#color${idx})`}
                name={cantiere.denominazione}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}