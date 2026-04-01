import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, TrendingUp, Lightbulb, Loader2 } from 'lucide-react';
import { backendClient } from '@/api/backendClient';
import { Badge } from '@/components/ui/badge';

export default function AIInsightsWidget() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        const fetchInsights = async () => {
            try {
                // Call the backend function
                const response = await backendClient.functions.invoke('analyzeProjectData');
                setData(response.data);
            } catch (error) {
                console.error("Failed to fetch AI insights", error);
            } finally {
                setLoading(false);
            }
        };

        fetchInsights();
    }, []);

    if (loading) {
        return (
            <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-purple-50">
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
                    <p className="text-sm text-indigo-700 font-medium">L'IA sta analizzando i dati dei cantieri...</p>
                </CardContent>
            </Card>
        );
    }

    if (!data) return null;

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
            {/* Anomalies Card */}
            <Card className="border-0 shadow-md bg-white border-l-4 border-l-amber-400">
                <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        <CardTitle className="text-base font-bold text-slate-800">Anomalie Rilevate</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {data.anomalies?.length > 0 ? (
                            data.anomalies.map((item, idx) => (
                                <div key={idx} className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="text-sm font-semibold text-amber-900">{item.title}</h4>
                                        <Badge variant="outline" className={
                                            item.severity === 'high' ? 'text-red-600 border-red-200 bg-red-50' : 
                                            item.severity === 'medium' ? 'text-amber-600 border-amber-200 bg-amber-50' : 
                                            'text-blue-600 border-blue-200 bg-blue-50'
                                        }>{item.severity}</Badge>
                                    </div>
                                    <p className="text-xs text-amber-800 leading-relaxed">{item.description}</p>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-slate-500 italic">Nessuna anomalia rilevata.</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Suggestions Card */}
            <Card className="border-0 shadow-md bg-white border-l-4 border-l-emerald-400">
                <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-emerald-500" />
                        <CardTitle className="text-base font-bold text-slate-800">Suggerimenti AI</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-2">
                        {data.suggestions?.length > 0 ? (
                            data.suggestions.map((item, idx) => (
                                <li key={idx} className="flex gap-2 text-sm text-slate-600">
                                    <span className="text-emerald-500 font-bold">•</span>
                                    {item.text}
                                </li>
                            ))
                        ) : (
                            <p className="text-sm text-slate-500 italic">Nessun suggerimento al momento.</p>
                        )}
                    </ul>
                </CardContent>
            </Card>

            {/* Forecast Card */}
            <Card className="border-0 shadow-md bg-white border-l-4 border-l-indigo-400">
                <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-indigo-500" />
                        <CardTitle className="text-base font-bold text-slate-800">Previsione Costi</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-4">
                        <p className="text-sm text-slate-500 mb-1">Proiezione prossimo mese</p>
                        <div className="text-3xl font-bold text-indigo-600">
                            € {data.forecast?.next_month_cost_projection?.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
                        </div>
                        <div className="mt-4 flex items-center gap-2 px-3 py-1 bg-indigo-50 rounded-full">
                            <span className="text-xs font-medium text-indigo-700">
                                Confidenza: {data.forecast?.confidence || 'Media'}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}