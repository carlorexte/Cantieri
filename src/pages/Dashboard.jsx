import React, { useState, useEffect, useMemo } from "react";
import { useData } from "@/components/shared/DataContext";
import { base44 } from "@/api/base44Client";
import {
  Building2,
  Wallet,
  TrendingUp,
  AlertTriangle,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Components
import KPICard from "@/components/dashboard/KPICard";
import CashFlowChart from "@/components/dashboard/CashFlowChart";
import CostBreakdownChart from "@/components/dashboard/CostBreakdownChart";
import PerformanceMatrixChart from "@/components/dashboard/PerformanceMatrixChart";
import AlertCard from "@/components/dashboard/AlertCard";
import AttivitaInterneCard from "@/components/dashboard/AttivitaInterneCard";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import DashboardWidgetManager from "@/components/dashboard/DashboardWidgetManager";

export default function Dashboard() {
  const { currentUser } = useData();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState({
    cantieri: [],
    sal: [],
    costi: [],
    documenti: [],
    attivitaInterne: [],
  });
  
  const [filters, setFilters] = useState({
    stato: "attivo",
    committente: "tutti",
    anno: "tutti",
    valoreMin: ""
  });

  const [widgets, setWidgets] = useState([
    { id: 'kpi', visible: true, order: 0, label: 'KPI Cards' },
    { id: 'charts_row_1', visible: true, order: 1, label: 'Flusso Cassa & Costi' },
    { id: 'charts_row_2', visible: true, order: 2, label: 'Performance & Attività' }
  ]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    
    // Helper to fetch safe
    const fetchSafe = async (promise, fallback = []) => {
      try {
        return await promise;
      } catch (e) {
        console.warn("Failed to fetch entity:", e);
        return fallback;
      }
    };

    try {
      // Use Promise.all but wrap individual calls to prevent one failure from breaking all
      const [cantieri, sal, costi, documenti, attivitaInterne] = await Promise.all([
        fetchSafe(base44.entities.Cantiere.list()),
        fetchSafe(base44.entities.SAL.list()),
        fetchSafe(base44.entities.Costo.list()),
        fetchSafe(base44.entities.Documento.list()),
        fetchSafe(base44.entities.AttivitaInterna.list())
      ]);

      // Enrich cantieri with advanced calculation if needed
      const enrichedCantieri = cantieri.map(c => {
        const cantiereSals = sal.filter(s => s.cantiere_id === c.id);
        const maxAvanzamento = cantiereSals.reduce((max, s) => 
          Math.max(max, s.percentuale_avanzamento || 0), 0);
        
        return {
          ...c,
          avanzamento: maxAvanzamento
        };
      });

      setData({
        cantieri: enrichedCantieri,
        sal,
        costi,
        documenti,
        attivitaInterne
      });
    } catch (error) {
      console.error("Critical error in dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter Logic
  const filteredData = useMemo(() => {
    let filteredCantieri = data.cantieri;

    if (filters.stato !== "tutti") {
      filteredCantieri = filteredCantieri.filter(c => c.stato === filters.stato);
    }

    if (filters.committente !== "tutti") {
      filteredCantieri = filteredCantieri.filter(c => c.committente_ragione_sociale === filters.committente);
    }

    if (filters.anno !== "tutti") {
      filteredCantieri = filteredCantieri.filter(c => {
        const startYear = c.data_inizio ? new Date(c.data_inizio).getFullYear() : null;
        return startYear === parseInt(filters.anno);
      });
    }

    if (filters.valoreMin) {
      filteredCantieri = filteredCantieri.filter(c => (c.importo_contratto || 0) >= parseFloat(filters.valoreMin));
    }

    // Also filter related data based on filtered cantieri IDs
    const cantiereIds = new Set(filteredCantieri.map(c => c.id));
    
    return {
      cantieri: filteredCantieri,
      sal: data.sal.filter(s => cantiereIds.has(s.cantiere_id)),
      costi: data.costi.filter(c => cantiereIds.has(c.cantiere_id)),
      documenti: data.documenti, // Keep all documents for now or filter if needed
      attivitaInterne: data.attivitaInterne.filter(a => !a.cantiere_id || cantiereIds.has(a.cantiere_id))
    };
  }, [data, filters]);

  // KPI Calculations
  const stats = useMemo(() => {
    const activeCantieri = filteredData.cantieri.filter(c => c.stato === 'attivo');
    const totalValue = activeCantieri.reduce((sum, c) => sum + (c.importo_contratto || 0), 0);
    
    const avgProgress = activeCantieri.length > 0
      ? activeCantieri.reduce((sum, c) => sum + (c.avanzamento || 0), 0) / activeCantieri.length
      : 0;

    // Expiring documents (next 30 days)
    const today = new Date();
    const next30Days = new Date();
    next30Days.setDate(today.getDate() + 30);
    
    const expiringDocs = filteredData.documenti.filter(d => {
      if (!d.data_scadenza) return false;
      const scadenza = new Date(d.data_scadenza);
      return scadenza >= today && scadenza <= next30Days;
    });

    return {
      activeCount: activeCantieri.length,
      totalValue,
      avgProgress,
      expiringCount: expiringDocs.length
    };
  }, [filteredData]);

  // Alerts Generation
  const alerts = useMemo(() => {
    const list = [];
    
    // Document alerts
    filteredData.documenti.forEach(d => {
       if (d.data_scadenza && new Date(d.data_scadenza) < new Date()) {
         list.push({
           tipo: 'scadenza',
           priorita: 'critico',
           messaggio: `${d.nome_documento} - SCADUTO`,
           cantiere: 'Documento' // Or verify if document is linked to cantiere
         });
       }
    });

    // Cantiere delays
    filteredData.cantieri.forEach(c => {
       if (c.stato === 'attivo' && c.data_fine_prevista && new Date(c.data_fine_prevista) < new Date() && (c.avanzamento || 0) < 100) {
         list.push({
           tipo: 'scadenza',
           priorita: 'medio',
           messaggio: `Cantiere in ritardo`,
           cantiere: c.denominazione
         });
       }
    });

    return list.slice(0, 5); // Limit alerts
  }, [filteredData]);

  const uniqueCommittenti = useMemo(() => {
    const comm = new Set(data.cantieri.map(c => c.committente_ragione_sociale).filter(Boolean));
    return Array.from(comm);
  }, [data.cantieri]);

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-[1600px] mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-500 mt-1">Panoramica generale dell'attività aziendale</p>
          </div>
          {currentUser?.role === 'admin' && (
            <DashboardWidgetManager 
              currentConfig={widgets} 
              availableWidgets={[
                { id: 'kpi', label: 'KPI Cards' },
                { id: 'charts_row_1', label: 'Flusso Cassa & Costi' },
                { id: 'charts_row_2', label: 'Performance & Attività' }
              ]}
              onSave={setWidgets}
            />
          )}
        </div>

        {/* Filters */}
        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
          <DashboardFilters 
            filters={filters} 
            onFiltersChange={setFilters} 
            onReset={() => setFilters({ stato: "tutti", committente: "tutti", anno: "tutti", valoreMin: "" })}
            committenti={uniqueCommittenti}
          />
        </div>

        {/* Content based on Widgets config */}
        <div className="space-y-6">
          {widgets.sort((a, b) => a.order - b.order).map(widget => {
            if (!widget.visible) return null;

            switch(widget.id) {
              case 'kpi':
                return (
                  <div key="kpi" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KPICard 
                      title="Cantieri Attivi" 
                      value={stats.activeCount}
                      subtitle="In corso di esecuzione"
                      icon={Building2}
                      colorScheme="orange"
                    />
                    <KPICard 
                      title="Valore Portafoglio" 
                      value={`€ ${(stats.totalValue / 1000000).toFixed(1)}M`}
                      subtitle="Totale contratti"
                      icon={Wallet}
                      colorScheme="emerald"
                    />
                    <KPICard 
                      title="Avanzamento Medio" 
                      value={`${stats.avgProgress.toFixed(0)}%`}
                      subtitle="Media ponderata"
                      icon={TrendingUp}
                      colorScheme="cyan"
                    />
                    <KPICard 
                      title="Documenti in Scadenza" 
                      value={stats.expiringCount}
                      subtitle="Prossimi 30 giorni"
                      icon={AlertTriangle}
                      colorScheme="amber"
                    />
                  </div>
                );
              
              case 'charts_row_1':
                return (
                  <div key="charts_row_1" className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
                    <div className="lg:col-span-2 h-full">
                      <CashFlowChart salData={filteredData.sal} costiData={filteredData.costi} />
                    </div>
                    <div className="h-full">
                      <CostBreakdownChart costiData={filteredData.costi} />
                    </div>
                  </div>
                );

              case 'charts_row_2':
                return (
                  <div key="charts_row_2" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 h-[450px]">
                      <PerformanceMatrixChart cantieri={filteredData.cantieri} />
                    </div>
                    <div className="space-y-6">
                      <AlertCard alerts={alerts} />
                      <AttivitaInterneCard 
                        attivita={filteredData.attivitaInterne} 
                        cantieri={filteredData.cantieri}
                        isLoading={isLoading}
                      />
                    </div>
                  </div>
                );
                
              default:
                return null;
            }
          })}
        </div>
      </div>
    </div>
  );
}