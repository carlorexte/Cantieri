import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock, Calendar, ShieldAlert } from "lucide-react";
import { usePermissions } from '@/components/shared/PermissionGuard';

export default function RoadmapPage() {
  const { isAdmin } = usePermissions();

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <ShieldAlert className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Accesso Riservato</h1>
          <p className="text-slate-600">Questa pagina è visibile solo agli amministratori del sistema.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Roadmap di Progetto</h1>
          <p className="text-slate-600 mt-1">Stato avanzamento lavori, funzionalità implementate e pianificazione futura.</p>
        </div>

        <div className="grid gap-8">
          
          {/* SEZIONE 1: IMPLEMENTATO */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">1. Funzionalità Implementate (Stato Attuale)</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-l-4 border-l-emerald-500">
                <CardHeader>
                  <CardTitle className="text-lg">Core & Infrastruttura</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" /> Autenticazione & Gestione Utenti</li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" /> RBAC (Ruoli e Permessi granulari)</li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" /> Layout Responsive & Sidebar Dinamica</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-emerald-500">
                <CardHeader>
                  <CardTitle className="text-lg">Moduli Gestionale</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" /> Cantieri (CRUD, Dashboard, Team)</li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" /> Anagrafiche (Imprese, Professionisti)</li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" /> Subappalti & Contratti</li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" /> Documentale (Upload, Categorie)</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-emerald-500">
                <CardHeader>
                  <CardTitle className="text-lg">Contabilità & Controllo</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" /> SAL (Attivi/Passivi, Calcoli)</li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" /> Costi & Spese</li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" /> Ordini Materiali (Workflow)</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-emerald-500">
                <CardHeader>
                  <CardTitle className="text-lg">Pianificazione & Operatività</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" /> Cronoprogramma (Gantt Interattivo)</li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" /> Attività Interne (Task Management)</li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" /> Dashboard KPI & Grafici</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* SEZIONE 2: IN CORSO */}
          <section>
            <div className="flex items-center gap-3 mb-4 mt-4">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">2. In Corso / Da Completare (Short Term)</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-l-4 border-l-amber-500 bg-amber-50/30">
                <CardHeader>
                  <CardTitle className="text-lg">User Experience</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li className="flex items-start gap-2"><Circle className="w-4 h-4 text-amber-500 mt-0.5" /> Ottimizzazione Mobile (PWA)</li>
                    <li className="flex items-start gap-2"><Circle className="w-4 h-4 text-amber-500 mt-0.5" /> Raffinamento UI/UX (Feedback loop)</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-amber-500 bg-amber-50/30">
                <CardHeader>
                  <CardTitle className="text-lg">Funzionalità Avanzate</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li className="flex items-start gap-2"><Circle className="w-4 h-4 text-amber-500 mt-0.5" /> AI Assistant (Chat completa su dati progetto)</li>
                    <li className="flex items-start gap-2"><Circle className="w-4 h-4 text-amber-500 mt-0.5" /> Reporting Avanzato (Export PDF SAL/Cantieri)</li>
                    <li className="flex items-start gap-2"><Circle className="w-4 h-4 text-amber-500 mt-0.5" /> Sistema di Notifiche (In-app & Email)</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* SEZIONE 3: FUTURO */}
          <section>
            <div className="flex items-center gap-3 mb-4 mt-4">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Calendar className="w-6 h-6 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">3. Roadmap Futura (Mid/Long Term)</h2>
            </div>

            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <div className="mt-1">
                  <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200">Q2 2026</Badge>
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">Integrazione & Automazione</h3>
                  <p className="text-slate-600 text-sm">Ingestione automatica fatture via email, Workflow approvativi automatici, OCR avanzato per estrazione dati.</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="mt-1">
                  <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200">Q3 2026</Badge>
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">Espansione</h3>
                  <p className="text-slate-600 text-sm">Modulo Gare (Bandi & Offerte), Connettori ERP esterni (Zucchetti/TeamSystem), App Mobile Nativa Offline-first.</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="mt-1">
                  <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200">Q4 2026</Badge>
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">Intelligence</h3>
                  <p className="text-slate-600 text-sm">Business Intelligence Direzionale, Previsionale Cash Flow con AI, Analisi predittiva rischi commessa.</p>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}