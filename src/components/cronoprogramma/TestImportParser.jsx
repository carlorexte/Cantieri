/**
 * Test Parser per Debug Importazione Cronoprogramma
 * 
 * Usa questo componente per vedere esattamente cosa viene estratto dal file
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { parseCronoprogrammaAIAgent } from '@/utils/cronoprogrammaAIAgent';

export default function TestImportParser() {
  const [result, setResult] = useState(null);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    const parseResult = await parseCronoprogrammaAIAgent(arrayBuffer, {});
    setResult(parseResult);
  };

  return (
    <Card className="max-w-4xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>🔍 Debug Importazione Cronoprogramma</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-indigo-300 rounded-lg cursor-pointer hover:bg-indigo-50">
            <Upload className="w-5 h-5" />
            <span>Seleziona file XLSX</span>
            <input type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
          </label>
        </div>

        {result && (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <h3 className="font-bold mb-2">{result.success ? '✅ Parsing riuscito' : '❌ Parsing fallito'}</h3>
              {!result.success && <p className="text-red-700">{result.error}</p>}
            </div>

            {result.metadata && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-slate-50 rounded">
                  <div className="text-xs text-slate-500">Metodo</div>
                  <div className="font-mono text-sm">{result.metadata.metodo || result.metadata.method}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded">
                  <div className="text-xs text-slate-500">Attività</div>
                  <div className="font-mono text-sm">{result.attivita?.length || 0}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded">
                  <div className="text-xs text-slate-500">Copertura date</div>
                  <div className={`font-mono text-sm ${result.metadata.dateCoverage >= 90 ? 'text-green-600' : result.metadata.dateCoverage >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                    {result.metadata.dateCoverage || 0}%
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded">
                  <div className="text-xs text-slate-500">Confidence</div>
                  <div className={`font-mono text-sm uppercase ${result.metadata.confidence === 'high' ? 'text-green-600' : result.metadata.confidence === 'medium' ? 'text-amber-600' : 'text-red-600'}`}>
                    {result.metadata.confidence || 'N/A'}
                  </div>
                </div>
              </div>
            )}

            {result.logs && result.logs.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 text-sm">📋 Log parsing:</h4>
                <ul className="bg-slate-50 rounded p-3 space-y-1 max-h-40 overflow-auto font-mono text-xs">
                  {result.logs.map((log, i) => (
                    <li key={i} className={log.includes('✗') ? 'text-red-600' : log.includes('✓') ? 'text-green-600' : 'text-slate-600'}>
                      {log}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.metadata?.debugRows && result.metadata.debugRows.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 text-sm">🔬 Debug righe (prime 10):</h4>
                <div className="overflow-auto max-h-60 border rounded">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="p-2 border text-left">Descrizione</th>
                        <th className="p-2 border">Durata</th>
                        <th className="p-2 border">First Col</th>
                        <th className="p-2 border">Last Col</th>
                        <th className="p-2 border">Data Inizio</th>
                        <th className="p-2 border">Data Fine</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.metadata.debugRows.slice(0, 10).map((row, i) => (
                        <tr key={i} className={!row.dataInizio || !row.dataFine ? 'bg-amber-50' : ''}>
                          <td className="p-2 border">{row.descrizione}</td>
                          <td className="p-2 border text-center">{row.durata}</td>
                          <td className="p-2 border text-center">{row.firstCol}</td>
                          <td className="p-2 border text-center">{row.lastCol}</td>
                          <td className={`p-2 border font-mono ${row.dataInizio ? 'text-green-600' : 'text-red-600'}`}>
                            {row.dataInizio || 'NULL'}
                          </td>
                          <td className={`p-2 border font-mono ${row.dataFine ? 'text-green-600' : 'text-red-600'}`}>
                            {row.dataFine || 'NULL'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {result.attivita && result.attivita.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 text-sm">📊 Attività estratte (prime 20):</h4>
                <div className="overflow-auto max-h-80 border rounded">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="p-2 border text-left">ID</th>
                        <th className="p-2 border text-left">Descrizione</th>
                        <th className="p-2 border">Durata</th>
                        <th className="p-2 border">Data Inizio</th>
                        <th className="p-2 border">Data Fine</th>
                        <th className="p-2 border">Tipo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.attivita.slice(0, 20).map((att, i) => (
                        <tr key={i} className={!att.data_inizio || !att.data_fine ? 'bg-amber-50' : ''}>
                          <td className="p-2 border font-mono">{att.id}</td>
                          <td className="p-2 border">{att.descrizione}</td>
                          <td className="p-2 border text-center">{att.durata_giorni}</td>
                          <td className={`p-2 border font-mono ${att.data_inizio ? 'text-green-600' : 'text-red-600'}`}>
                            {att.data_inizio || 'NULL'}
                          </td>
                          <td className={`p-2 border font-mono ${att.data_fine ? 'text-green-600' : 'text-red-600'}`}>
                            {att.data_fine || 'NULL'}
                          </td>
                          <td className="p-2 border">{att.tipo_attivita}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {result.attivita.length > 20 && (
                  <p className="text-xs text-slate-500 mt-2">...e altre {result.attivita.length - 20} attività</p>
                )}
              </div>
            )}

            {result.metadata?.incompleteDates && result.metadata.incompleteDates.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded">
                <h4 className="font-semibold mb-2 text-amber-800">⚠️ Date incomplete ({result.metadata.incompleteDates.length}):</h4>
                <ul className="text-xs space-y-1 max-h-40 overflow-auto">
                  {result.metadata.incompleteDates.slice(0, 10).map((item, i) => (
                    <li key={i} className="font-mono">
                      - {item.descrizione}: {item.data_inizio || 'null'} → {item.data_fine || 'null'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
