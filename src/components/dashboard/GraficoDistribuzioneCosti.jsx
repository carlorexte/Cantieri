import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';

const categorieDocumenti = {
  permessi: { label: "Permessi", color: "#a855f7" },
  contratti: { label: "Contratti", color: "#3b82f6" },
  polizze: { label: "Polizze", color: "#10b981" },
  certificazioni: { label: "Certificazioni", color: "#06b6d4" },
  fatture: { label: "Fatture", color: "#f97316" },
  sal: { label: "SAL", color: "#8b5cf6" },
  sicurezza: { label: "Sicurezza", color: "#ef4444" },
  tecnici: { label: "Tecnici", color: "#14b8a6" },
  foto: { label: "Foto", color: "#ec4899" },
  corrispondenza: { label: "Corrispondenza", color: "#f59e0b" },
  legale: { label: "Legale", color: "#f43f5e" },
  altro: { label: "Altro", color: "#64748b" }
};

export default function GraficoDistribuzioneCosti({ documenti, salList }) {
  const chartData = useMemo(() => {
    if (!documenti || documenti.length === 0) return [];

    const distribuzionePerCategoria = {};
    
    documenti.forEach(doc => {
      const categoria = doc.categoria_principale || 'altro';
      if (!distribuzionePerCategoria[categoria]) {
        distribuzionePerCategoria[categoria] = {
          categoria: categorieDocumenti[categoria]?.label || categoria,
          count: 0,
          valore: 0
        };
      }
      distribuzionePerCategoria[categoria].count++;
    });

    if (salList && salList.length > 0) {
      salList.forEach(sal => {
        if (sal.imponibile) {
          if (!distribuzionePerCategoria['sal']) {
            distribuzionePerCategoria['sal'] = {
              categoria: 'SAL',
              count: 0,
              valore: 0
            };
          }
          distribuzionePerCategoria['sal'].valore += sal.imponibile;
          
          if (sal.stato_pagamento !== 'da_fatturare' && sal.totale_fattura) {
            if (!distribuzionePerCategoria['fatture']) {
              distribuzionePerCategoria['fatture'] = {
                categoria: 'Fatture',
                count: 0,
                valore: 0
              };
            }
            distribuzionePerCategoria['fatture'].valore += sal.totale_fattura;
          }
        }
      });
    }

    return Object.values(distribuzionePerCategoria)
      .filter(item => item.count > 0 || item.valore > 0)
      .map(item => ({
        name: item.categoria,
        value: item.count,
        valore: item.valore
      }));
  }, [documenti, salList]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/95 backdrop-blur-sm p-4 border-none rounded-2xl shadow-2xl">
          <p className="font-semibold text-slate-900 mb-2">{data.name}</p>
          <p className="text-sm text-slate-600">Documenti: {data.value}</p>
          {data.valore > 0 && (
            <p className="text-sm text-purple-600 font-medium">
              Valore: €{Number(data.valore).toLocaleString('it-IT')}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm rounded-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
              <PieChartIcon className="w-5 h-5 text-white" />
            </div>
            Distribuzione Documenti per Categoria
          </CardTitle>
        </CardHeader>
        <CardContent className="p-12 text-center">
          <PieChartIcon className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500">Nessun documento disponibile</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg hover:shadow-xl transition-all bg-white/80 backdrop-blur-sm rounded-3xl overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-800">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <PieChartIcon className="w-5 h-5 text-white" />
          </div>
          Distribuzione Documenti per Categoria
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => {
                const categoria = Object.keys(categorieDocumenti).find(
                  key => categorieDocumenti[key].label === entry.name
                );
                const color = categoria ? categorieDocumenti[categoria].color : '#64748b';
                return <Cell key={`cell-${index}`} fill={color} />;
              })}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              wrapperStyle={{ paddingTop: '20px' }}
            />
          </PieChart>
        </ResponsiveContainer>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-6">
          {chartData.map((item, idx) => {
            const categoria = Object.keys(categorieDocumenti).find(
              key => categorieDocumenti[key].label === item.name
            );
            const color = categoria ? categorieDocumenti[categoria].color : '#64748b';
            
            return (
              <div key={idx} className="flex items-center gap-2 p-3 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl hover:shadow-md transition-all">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm" 
                  style={{ backgroundColor: color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-600 truncate">{item.name}</p>
                  <p className="text-sm font-semibold text-slate-900">{item.value} doc</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}