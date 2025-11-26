import React, { useState, useEffect, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Building2, Euro, TrendingUp, AlertTriangle, FileText, CheckCircle2, Clock, ChevronDown, ChevronUp, Filter } from "lucide-react";
import { useData } from "@/components/shared/DataContext";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

import KPICard from "../components/dashboard/KPICard";
import AlertCard from "../components/dashboard/AlertCard";
import CantieriAttivi from "../components/dashboard/CantieriAttivi";
import TaskPersonali from "../components/dashboard/TaskPersonali";
import AttivitaInterneCard from "../components/dashboard/AttivitaInterneCard";
import CantieriPerStatoChart from "../components/dashboard/CantieriPerStatoChart";
import ValorePerCommittenteChart from "../components/dashboard/ValorePerCommittenteChart";
import AvanzamentoCantieriChart from "../components/dashboard/AvanzamentoCantieriChart";
import DashboardFilters from "../components/dashboard/DashboardFilters";
// Nuovi Grafici
import CashFlowChart from "../components/dashboard/CashFlowChart";
import CostBreakdownChart from "../components/dashboard/CostBreakdownChart";
import PerformanceMatrixChart from "../components/dashboard/PerformanceMatrixChart";
import TimelineOverview from "../components/dashboard/TimelineOverview";

export default function Dashboard() {
  const { cantieri: allCantieri, currentUser, isLoading: contextLoading } = useData();
  const [cantieri, setCantieri] = useState([]);
  const [taskPersonali, setTaskPersonali] = useState([]);
  const [attivitaInterne, setAttivitaInterne] = useState([]);
  const [documenti, setDocumenti] = useState([]);
  const [salData, setSalData] = useState([]);
  const [costiData, setCostiData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    stato: 'tutti',
    committente: 'tutti',
    anno: 'tutti',
    valoreMin: ''
  });
  const [kpis, setKpis] = useState({
    cantieriAttivi: 0,
    valorePortafoglio: 0,
    avanzamentoMedio: 0,
    documentiInScadenza: 0
  });
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const loadAdminDashboard = useCallback(async () => {
    // OPTIMIZATION: Use cached cantieri from context instead of fetching again
    const cantieriAttivi = allCantieri.filter(c => c.stato === 'attivo').slice(0, 30);

    const [salDataResult, documentiData, attivitaData, costiDataResult] = await Promise.all([
      base44.entities.SAL.list("-data_sal", 200),
      base44.entities.Documento.filter({}, "-data_scadenza", 50),
      base44.entities.AttivitaInterna.filter({}, "-data_scadenza", 100),
      base44.entities.Costo.list("-data_sostenimento", 200)
    ]);

    setSalData(salDataResult);
    setDocumenti(documentiData);
    setAttivitaInterne(attivitaData);
    setCostiData(costiDataResult);

    const salByCantiere = new Map();
    salDataResult.forEach(sal => {
      if (sal.tipo_sal_dettaglio !== 'anticipazione') {
        const current = salByCantiere.get(sal.cantiere_id) || 0;
        salByCantiere.set(sal.cantiere_id, current + (sal.imponibile || 0));
      }
    });

    const cantieriConAvanzamento = cantieriAttivi.map(cantiere => {
      const totaleSAL = salByCantiere.get(cantiere.id) || 0;
      const importoContratto = cantiere.importo_contrattuale_oltre_iva || 0;
      
      let avanzamento = 0;
      if (importoContratto > 0) {
        avanzamento = Math.min(Math.round((totaleSAL / importoContratto) * 100), 100);
      }
      
      return { ...cantiere, avanzamento };
    });
    
    setCantieri(cantieriConAvanzamento);
    
    const valorePortafoglio = allCantieri.reduce((sum, c) => sum + (c.importo_contratto || 0), 0);
    
    const totalValueOfActiveContracts = cantieriConAvanzamento.reduce((sum, c) => sum + (c.importo_contrattuale_oltre_iva || 0), 0);
    const weightedProgressSum = cantieriConAvanzamento.reduce((sum, c) => {
      return sum + (c.avanzamento * (c.importo_contrattuale_oltre_iva || 0) / 100);
    }, 0);
    
    const avanzamentoMedio = totalValueOfActiveContracts > 0
      ? Math.round((weightedProgressSum / totalValueOfActiveContracts) * 100)
      : 0;

    const oggi = Date.now();
    const trentaGiorniMs = 30 * 24 * 60 * 60 * 1000;
    
    const documentiInScadenza = documentiData.reduce((count, doc) => {
      if (!doc.data_scadenza) return count;
      const scadenzaMs = new Date(doc.data_scadenza).getTime();
      const diff = scadenzaMs - oggi;
      return (diff >= 0 && diff <= trentaGiorniMs) ? count + 1 : count;
    }, 0);

    setKpis({
      cantieriAttivi: cantieriConAvanzamento.length,
      valorePortafoglio,
      avanzamentoMedio,
      documentiInScadenza
    });
  }, [allCantieri]);

  const loadUserDashboard = useCallback(async (user) => {
    // OPTIMIZATION: Parallelize requests and use cached cantieri
    const [taskData, documentiData] = await Promise.all([
      base44.entities.AttivitaInterna.filter({ assegnatario_id: user.id }, "-data_scadenza", 30),
      base44.entities.Documento.filter({}, "-data_scadenza", 30)
    ]);

    setTaskPersonali(taskData);
    setDocumenti(documentiData);
    
    const cantieriIds = new Set(taskData.map(t => t.cantiere_id).filter(Boolean));
    // Use cached cantieri
    const cantieriConTask = allCantieri.filter(cantiere => cantieriIds.has(cantiere.id));
    setCantieri(cantieriConTask);

    let taskCompletati = 0, taskInCorso = 0, taskInRitardo = 0;
    const oggi = Date.now();
    
    taskData.forEach(t => {
      if (t.stato === 'completato') taskCompletati++;
      else if (t.stato === 'in_corso') taskInCorso++;
      
      if (t.data_scadenza && t.stato !== 'completato') {
        if (new Date(t.data_scadenza).getTime() < oggi) taskInRitardo++;
      }
    });

    setKpis({
      taskTotali: taskData.length,
      taskCompletati,
      taskInCorso,
      taskInRitardo
    });
  }, [allCantieri]);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (currentUser?.role === 'admin') {
        await loadAdminDashboard();
      } else if (currentUser) {
        await loadUserDashboard(currentUser);
      }
    } catch (error) {
      console.error("Errore caricamento dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, loadAdminDashboard, loadUserDashboard]);

  useEffect(() => {
    // Wait for context to load before fetching dashboard specific data
    if (currentUser && !contextLoading) {
      loadDashboardData();
    }
  }, [currentUser, contextLoading, loadDashboardData]);

  const getAlertsForUser = useMemo(() => {
    if (!currentUser) return [];

    const oggi = Date.now();

    if (currentUser.role === 'admin') {
      const cantieriMap = new Map(cantieri.map(c => [c.id, c]));
      const alerts = [];
      const setteGiorniMs = 7 * 24 * 60 * 60 * 1000;

      documenti.forEach(doc => {
        if (!doc.data_scadenza) return;
        
        const scadenzaMs = new Date(doc.data_scadenza).getTime();
        const diff = scadenzaMs - oggi;
        
        let shouldAdd = false;
        let priorita = "medio";
        let messaggio = "";
        
        if (diff < 0) {
          shouldAdd = true;
          priorita = "critico";
          messaggio = `${doc.nome_documento} - SCADUTO`;
        } else if (diff <= setteGiorniMs) {
          shouldAdd = true;
          const diffGiorni = Math.ceil(diff / (24 * 60 * 60 * 1000));
          priorita = diffGiorni <= 3 ? "critico" : "medio";
          messaggio = `${doc.nome_documento} - Scade tra ${diffGiorni} giorni`;
        }
        
        if (shouldAdd && alerts.length < 5) {
          const cantiere = cantieriMap.get(doc.entita_collegata_id);
          alerts.push({
            tipo: "scadenza",
            messaggio,
            cantiere: cantiere?.denominazione || doc.entita_collegata_tipo || "N/D",
            priorita
          });
        }
      });

      return alerts;
    } else {
      const cantieriMap = new Map(cantieri.map(c => [c.id, c]));
      const treGiorniMs = 3 * 24 * 60 * 60 * 1000;
      
      return taskPersonali
        .filter(task => {
          if (!task.data_scadenza || task.stato === 'completato') return false;
          const diff = new Date(task.data_scadenza).getTime() - oggi;
          return diff >= 0 && diff <= treGiorniMs;
        })
        .slice(0, 3)
        .map(task => ({
          tipo: "task_scadenza",
          messaggio: `Task in scadenza: ${task.descrizione}`,
          cantiere: cantieriMap.get(task.cantiere_id)?.denominazione || "Generale",
          priorita: task.priorita === 'critica' ? 'critico' : 'medio'
        }));
    }
  }, [currentUser, taskPersonali, documenti, cantieri]);

  const filteredCantieri = useMemo(() => {
    let filtered = allCantieri;

    if (filters.stato !== 'tutti') {
      filtered = filtered.filter(c => c.stato === filters.stato);
    }

    if (filters.committente !== 'tutti') {
      filtered = filtered.filter(c => c.committente_ragione_sociale === filters.committente);
    }

    if (filters.anno !== 'tutti') {
      filtered = filtered.filter(c => {
        if (!c.data_inizio) return false;
        const year = new Date(c.data_inizio).getFullYear().toString();
        return year === filters.anno;
      });
    }

    if (filters.valoreMin) {
      const minVal = parseFloat(filters.valoreMin);
      filtered = filtered.filter(c => (c.importo_contratto || 0) >= minVal);
    }

    // Calcola avanzamento per i cantieri filtrati
    const salByCantiere = new Map();
    salData.forEach(sal => {
      if (sal.tipo_sal_dettaglio !== 'anticipazione') {
        const current = salByCantiere.get(sal.cantiere_id) || 0;
        salByCantiere.set(sal.cantiere_id, current + (sal.imponibile || 0));
      }
    });

    return filtered.map(cantiere => {
      const totaleSAL = salByCantiere.get(cantiere.id) || 0;
      const importoContratto = cantiere.importo_contrattuale_oltre_iva || 0;
      
      let avanzamento = 0;
      if (importoContratto > 0) {
        avanzamento = Math.min(Math.round((totaleSAL / importoContratto) * 100), 100);
      }
      
      return { ...cantiere, avanzamento };
    });
  }, [allCantieri, filters, salData]);

  const committentiList = useMemo(() => {
    const committenti = new Set(
      allCantieri
        .map(c => c.committente_ragione_sociale)
        .filter(Boolean)
    );
    return Array.from(committenti).sort();
  }, [allCantieri]);

  const handleResetFilters = useCallback(() => {
    setFilters({
      stato: 'tutti',
      committente: 'tutti',
      anno: 'tutti',
      valoreMin: ''
    });
  }, []);

  const renderAdminDashboard = useCallback(() => (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2" style={{ color: '#17171C' }}>Dashboard</h1>
        <p className="text-base" style={{ color: '#626671' }}>Panoramica generale dell'attività aziendale</p>
      </div>

      <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen} className="mb-8">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between space-x-4 px-5 py-3 rounded-xl border border-slate-200 bg-white shadow-sm cursor-pointer hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <h4 className="text-sm font-semibold text-slate-900">Filtri Analisi</h4>
            </div>
            <div className="w-9 h-9 flex items-center justify-center">
              {isFiltersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <DashboardFilters
            filters={filters}
            onFiltersChange={setFilters}
            onReset={handleResetFilters}
            committenti={committentiList}
          />
        </CollapsibleContent>
      </Collapsible>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <KPICard
          title="Cantieri Attivi"
          value={kpis.cantieriAttivi}
          subtitle="In corso di esecuzione"
          icon={Building2}
          colorScheme="orange"
        />
        <KPICard
          title="Valore Portafoglio"
          value={`€ ${(kpis.valorePortafoglio / 1000000).toFixed(1)}M`}
          subtitle="Totale contratti"
          icon={Euro}
          colorScheme="emerald"
        />
        <KPICard
          title="Avanzamento Medio"
          value={`${kpis.avanzamentoMedio}%`}
          subtitle="Media ponderata"
          icon={TrendingUp}
          colorScheme="cyan"
        />
        <KPICard
          title="Documenti in Scadenza"
          value={kpis.documentiInScadenza}
          subtitle="Prossimi 30 giorni"
          icon={AlertTriangle}
          colorScheme="amber"
        />
      </div>

      {/* Nuova Sezione Finanziaria Avanzata */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <CashFlowChart salData={salData} costiData={costiData} />
        </div>
        <div>
          <CostBreakdownChart costiData={costiData} />
        </div>
      </div>

      {/* Nuova Sezione Performance Operativa */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <PerformanceMatrixChart cantieri={filteredCantieri} />
        <CantieriPerStatoChart cantieri={filteredCantieri} />
      </div>

      {/* Timeline e Avanzamento */}
      <div className="mb-8">
        <TimelineOverview cantieri={filteredCantieri} />
      </div>

      {/* Analisi Secondaria */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ValorePerCommittenteChart cantieri={filteredCantieri} />
        <AvanzamentoCantieriChart cantieri={filteredCantieri} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CantieriAttivi 
            cantieri={cantieri}
            isLoading={isLoading}
          />
        </div>
        <div className="space-y-6">
          <AlertCard alerts={getAlertsForUser} />
          <AttivitaInterneCard 
            attivita={attivitaInterne}
            cantieri={allCantieri}
            isLoading={isLoading}
          />
        </div>
      </div>
    </>
  ), [kpis, cantieri, filteredCantieri, salData, costiData, isLoading, getAlertsForUser, filters, committentiList, handleResetFilters, attivitaInterne, allCantieri, isFiltersOpen]);

  const renderUserDashboard = useCallback(() => (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">I Miei Compiti</h1>
        <p className="text-slate-500 text-sm mt-1">Benvenuto {currentUser?.full_name || currentUser?.email}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Totale Compiti"
          value={kpis.taskTotali || 0}
          subtitle="Assegnati a te"
          icon={FileText}
          colorScheme="indigo"
        />
        <KPICard
          title="In Corso"
          value={kpis.taskInCorso || 0}
          subtitle="Attualmente in lavorazione"
          icon={Clock}
          colorScheme="cyan"
        />
        <KPICard
          title="Completati"
          value={kpis.taskCompletati || 0}
          subtitle="Portati a termine"
          icon={CheckCircle2}
          colorScheme="emerald"
        />
        <KPICard
          title="In Ritardo"
          value={kpis.taskInRitardo || 0}
          subtitle="Scaduti o in scadenza"
          icon={AlertTriangle}
          colorScheme="rose"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TaskPersonali 
            tasks={taskPersonali}
            cantieri={cantieri}
            isLoading={isLoading}
          />
        </div>
        <div>
          <AlertCard alerts={getAlertsForUser} />
        </div>
      </div>
    </>
  ), [kpis, currentUser, taskPersonali, cantieri, isLoading, getAlertsForUser]);

  return (
    <div className="min-h-screen" style={{ background: '#F8FAFC' }}>
      <div className="p-8">
        <div className="max-w-[1600px] mx-auto">
          {isLoading ? (
            <div className="animate-pulse space-y-8">
              <div className="h-12 bg-slate-200/60 rounded-2xl w-80"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {Array(4).fill(0).map((_, i) => (
                  <div key={i} className="h-32 bg-slate-200/60 rounded-2xl"></div>
                ))}
              </div>
              <div className="h-96 bg-slate-200/60 rounded-2xl"></div>
            </div>
          ) : currentUser?.role === 'admin' ? renderAdminDashboard() : renderUserDashboard()}
        </div>
      </div>
    </div>
  );
}