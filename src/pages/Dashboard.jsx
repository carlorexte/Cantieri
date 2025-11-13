import React, { useState, useEffect, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Building2, Euro, TrendingUp, Calendar, AlertTriangle, FileText, CheckCircle2, Clock } from "lucide-react";

import KPICard from "../components/dashboard/KPICard";
import AlertCard from "../components/dashboard/AlertCard";
import CantieriAttivi from "../components/dashboard/CantieriAttivi";
import TaskPersonali from "../components/dashboard/TaskPersonali";

export default function Dashboard() {
  const [cantieri, setCantieri] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [taskPersonali, setTaskPersonali] = useState([]);
  const [documenti, setDocumenti] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [kpis, setKpis] = useState({
    cantieriAttivi: 0,
    valorePortafoglio: 0,
    avanzamentoMedio: 0,
    documentiInScadenza: 0
  });

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);

      if (user.role === 'admin') {
        await loadAdminDashboard();
      } else {
        await loadUserDashboard(user);
      }
    } catch (error) {
      console.error("Errore caricamento dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const loadAdminDashboard = async () => {
    const [cantieriData, salData, documentiData] = await Promise.all([
      base44.entities.Cantiere.list("-created_date"),
      base44.entities.SAL.list(),
      base44.entities.Documento.list()
    ]);

    setDocumenti(documentiData);

    // Calcola il totale certificato per ogni cantiere (solo imponibile)
    const salByCantiere = salData.reduce((acc, sal) => {
      if (!acc[sal.cantiere_id]) {
        acc[sal.cantiere_id] = 0;
      }
      
      if (sal.tipo_sal_dettaglio !== 'anticipazione') {
        acc[sal.cantiere_id] += sal.imponibile || 0;
      }
      
      return acc;
    }, {});

    const cantieriConAvanzamento = cantieriData.map(cantiere => {
      const totaleSAL = salByCantiere[cantiere.id] || 0;
      const importoContratto = cantiere.importo_contrattuale_oltre_iva || 0;
      
      let avanzamento = 0;
      if (importoContratto > 0) {
        const percentualeCalcolata = (totaleSAL / importoContratto) * 100;
        avanzamento = Math.min(Math.round(percentualeCalcolata), 100);
      }
      
      return { ...cantiere, avanzamento };
    });
    
    setCantieri(cantieriConAvanzamento);
    
    const cantieriAttiviData = cantieriConAvanzamento.filter(c => c.stato === 'attivo');
    const cantieriAttivi = cantieriAttiviData.length;
    const valorePortafoglio = cantieriData.reduce((sum, c) => sum + (c.importo_contratto || 0), 0);
    
    const totalValueOfActiveContracts = cantieriAttiviData.reduce((sum, c) => sum + (c.importo_contrattuale_oltre_iva || 0), 0);
    const weightedProgressSum = cantieriAttiviData.reduce((sum, c) => {
      return sum + (c.avanzamento * (c.importo_contrattuale_oltre_iva || 0) / 100);
    }, 0);
    
    const avanzamentoMedio = totalValueOfActiveContracts > 0
      ? Math.round((weightedProgressSum / totalValueOfActiveContracts) * 100)
      : 0;

    // Calcola documenti in scadenza (prossimi 30 giorni)
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    const documentiInScadenza = documentiData.filter(doc => {
      if (!doc.data_scadenza) return false;
      const scadenza = new Date(doc.data_scadenza);
      scadenza.setHours(0, 0, 0, 0);
      const diffGiorni = Math.ceil((scadenza.getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));
      return diffGiorni >= 0 && diffGiorni <= 30;
    }).length;

    setKpis({
      cantieriAttivi,
      valorePortafoglio,
      avanzamentoMedio,
      documentiInScadenza
    });
  };

  const loadUserDashboard = async (user) => {
    const [taskData, cantieriData, documentiData] = await Promise.all([
      base44.entities.AttivitaInterna.filter({ assegnatario_id: user.id }, "-data_scadenza"),
      base44.entities.Cantiere.list("-created_date"),
      base44.entities.Documento.list()
    ]);

    setTaskPersonali(taskData);
    setDocumenti(documentiData);
    
    const cantieriConTask = cantieriData.filter(cantiere => 
      taskData.some(task => task.cantiere_id === cantiere.id)
    );
    setCantieri(cantieriConTask);

    const taskCompletati = taskData.filter(t => t.stato === 'completato').length;
    const taskInCorso = taskData.filter(t => t.stato === 'in_corso').length;
    const taskInRitardo = taskData.filter(t => {
      if (!t.data_scadenza) return false;
      return new Date(t.data_scadenza) < new Date() && t.stato !== 'completato';
    }).length;

    setKpis({
      taskTotali: taskData.length,
      taskCompletati,
      taskInCorso,
      taskInRitardo
    });
  };

  const getAlertsForUser = useMemo(() => {
    if (!currentUser) return [];

    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);

    if (currentUser.role === 'admin') {
      // Alert per documenti in scadenza
      const documentiScaduti = documenti
        .filter(doc => {
          if (!doc.data_scadenza) return false;
          const scadenza = new Date(doc.data_scadenza);
          scadenza.setHours(0, 0, 0, 0);
          const diffGiorni = Math.ceil((scadenza.getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));
          return diffGiorni < 0;
        })
        .map(doc => {
          const cantiere = cantieri.find(c => c.id === doc.entita_collegata_id);
          return {
            tipo: "scadenza",
            messaggio: `${doc.nome_documento} - SCADUTO`,
            cantiere: cantiere?.denominazione || doc.entita_collegata_tipo || "N/D",
            priorita: "critico"
          };
        });

      const documentiInScadenza = documenti
        .filter(doc => {
          if (!doc.data_scadenza) return false;
          const scadenza = new Date(doc.data_scadenza);
          scadenza.setHours(0, 0, 0, 0);
          const diffGiorni = Math.ceil((scadenza.getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));
          return diffGiorni >= 0 && diffGiorni <= 7;
        })
        .map(doc => {
          const cantiere = cantieri.find(c => c.id === doc.entita_collegata_id);
          const scadenza = new Date(doc.data_scadenza);
          scadenza.setHours(0, 0, 0, 0);
          const diffGiorni = Math.ceil((scadenza.getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));
          return {
            tipo: "scadenza",
            messaggio: `${doc.nome_documento} - Scade tra ${diffGiorni} giorni`,
            cantiere: cantiere?.denominazione || doc.entita_collegata_tipo || "N/D",
            priorita: diffGiorni <= 3 ? "critico" : "medio"
          };
        });

      return [...documentiScaduti, ...documentiInScadenza].slice(0, 5);
    } else {
      const alertsFromTasks = taskPersonali
        .filter(task => {
          if (!task.data_scadenza) return false;
          const scadenza = new Date(task.data_scadenza);
          const diffGiorni = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
          return diffGiorni <= 3 && diffGiorni >= 0 && task.stato !== 'completato';
        })
        .map(task => {
          const cantiere = cantieri.find(c => c.id === task.cantiere_id);
          return {
            tipo: "task_scadenza",
            messaggio: `Task in scadenza: ${task.descrizione}`,
            cantiere: cantiere?.denominazione || "Generale",
            priorita: task.priorita === 'critica' ? 'critico' : 'medio'
          };
        });

      return alertsFromTasks.slice(0, 3);
    }
  }, [currentUser, taskPersonali, documenti, cantieri]);

  const renderAdminDashboard = () => (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-1">Panoramica generale e monitoraggio KPI</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Cantieri Attivi"
          value={kpis.cantieriAttivi}
          subtitle="In corso di esecuzione"
          icon={Building2}
          colorScheme="indigo"
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

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CantieriAttivi 
            cantieri={cantieri}
            isLoading={isLoading}
          />
        </div>
        <div>
          <AlertCard alerts={getAlertsForUser} />
        </div>
      </div>
    </>
  );

  const renderUserDashboard = () => (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">I Miei Compiti</h1>
        <p className="text-slate-600 mt-1">Benvenuto {currentUser?.full_name || currentUser?.email}</p>
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
  );

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {isLoading ? (
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-64"></div>
            <div className="grid grid-cols-4 gap-6">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>
              ))}
            </div>
            <div className="h-96 bg-slate-200 rounded-xl"></div>
          </div>
        ) : currentUser?.role === 'admin' ? renderAdminDashboard() : renderUserDashboard()}
      </div>
    </div>
  );
}