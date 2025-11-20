import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO, startOfMonth, isSameMonth, subMonths } from 'date-fns';
import { it } from 'date-fns/locale';

export default function CashFlowChart({ salData, costiData }) {
  const data = useMemo(() => {
    const today = new Date();
    const last12Months = Array.from({ length: 12 }, (_, i) => {
      const d = subMonths(today, 11 - i);
      return {
        date: d,
        monthLabel: format(d, 'MMM yy', { locale: it }),
        entrate: 0,
        uscite: 0,
        netto: 0
      };
    });

    // Processa Entrate (SAL Incassati o Fatturati)
    // Usiamo data_pagamento se presente (principio di cassa), altrimenti data_sal (competenza/stima)
    // Per questo grafico "Flusso di Cassa" ideale è usare i movimenti reali, ma usiamo data_sal come fallback
    salData.forEach(sal => {
      if (!sal.imponibile) return;
      const date = sal.data_pagamento ? parseISO(sal.data_pagamento) : parseISO(sal.data_sal);
      const monthData = last12Months.find(m => isSameMonth(m.date, date));
      if (monthData) {
        monthData.entrate += sal.imponibile;
      }
    });

    // Processa Uscite (Costi)
    costiData.forEach(costo => {
      if (!costo.importo) return;
      const date = costo.data_sostenimento ? parseISO(costo.data_sostenimento) : new Date();
      const monthData = last12Months.find(m => isSameMonth(m.date, date));
      if (monthData) {
        monthData.uscite += costo.importo;
      }
    });

    // Calcola Netto
    return last12Months.map(m => ({
      ...m,
      netto: m.entrate - m.uscite
    }));
  }, [salData, costiData]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border-0 rounded-xl shadow-xl">
          <p className="font-semibold mb-2 text-slate-900 capitalize">{label}</p>
          <div className="space-y-1 text-sm">
            <p className="text-emerald-600 font-medium">
              Entrate: €{payload.find(p => p.dataKey === 'entrate')?.value.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-rose-500 font-medium">
              Uscite: €{payload.find(p => p.dataKey === 'uscite')?.value.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
            </p>
            <div className="border-t border-slate-100 pt-1 mt-1">
              <p className={`font-bold ${payload.find(p => p.dataKey === 'netto')?.value >= 0 ? 'text-indigo-600' : 'text-amber-600'}`}>
                Netto: €{payload.find(p => p.dataKey === 'netto')?.value.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-0 shadow-lg bg-white rounded-2xl h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold text-slate-900">Flusso di Cassa (12 Mesi)</CardTitle>
        <p className="text-sm text-slate-500">Confronto Entrate vs Uscite</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="monthLabel" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748b', fontSize: 12 }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748b', fontSize: 11 }}
              tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
            <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }}/>
            
            <Bar dataKey="entrate" name="Entrate" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} fillOpacity={0.8} />
            <Bar dataKey="uscite" name="Uscite" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={20} fillOpacity={0.8} />
            <Line 
              type="monotone" 
              dataKey="netto" 
              name="Flusso Netto" 
              stroke="#6366f1" 
              strokeWidth={3} 
              dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }} 
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}