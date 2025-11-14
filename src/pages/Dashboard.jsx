import React, { useState, useEffect, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import DashboardPersonalizzata from "../components/dashboard/DashboardPersonalizzata";

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
  const [statistiche, setStatistiche] = useState({
    nuoviCantieri: 0,
    cantieriCompletati: 0,
    salEmessi: 0,
    documentiCaricati: 0
  });

  const loadAdminDashboard = useCallback(async () => {
    const [cantieriData, salData, documentiData] = await Promise.all([
      base44.entities.Cantiere.filter({ stato: 'attivo' }, "-created_date", 50),
      base44.entities.SAL.list("-data_sal", 200),
      base44.entities.Documento.list("-created_date", 100)
    ]);

    setDocumenti(documentiData);

    const salByCantiere = new Map();
    salData.forEach(sal => {
      if (sal.tipo_sal_dettaglio !== 'anticipazione') {
        const current = salByCantiere.get(sal.cantiere_id) || 0;
        salByCantiere.set(sal.cantiere_id, current + (sal.imponibile || 0));
      }
    });

    const cantieriConAvanzamento = cantieriData.map(cantiere => {
      const totaleSAL = salByCantiere.get(cantiere.id) || 0;
      const importoContratto = cantiere.importo_contrattuale_oltre_iva || 0;
      
      let avanzamento = 0;
      if (importoContratto > 0) {
        avanzamento = Math.min(Math.round((totaleSAL / importoContratto) * 100), 100);
      }
      
      return { ...cantiere, avanzamento };
    });
    
    setCantieri(cantieriConAvanzamento);
    
    const cantieriAttivi = cantieriConAvanzamento.length;
    
    const allCantieri = await base44.entities.Cantiere.list();
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

    // Calcola statistiche mensili
    const meseFa = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const nuoviCantieri = allCantieri.filter(c => 
      c.created_date && new Date(c.created_date).getTime() >= meseFa
    ).length;
    const cantieriCompletati = allCantieri.filter(c => 
      c.stato === 'completato' && c.updated_date && new Date(c.updated_date).getTime() >= meseFa
    ).length;
    const salEmessi = salData.filter(sal => 
      sal.data_sal && new Date(sal.data_sal).getTime() >= meseFa
    ).length;
    const documentiCaricati = documentiData.filter(doc => 
      doc.created_date && new Date(doc.created_date).getTime() >= meseFa
    ).length;

    setKpis({
      cantieriAttivi,
      valorePortafoglio,
      avanzamentoMedio,
      documentiInScadenza
    });

    setStatistiche({
      nuoviCantieri,
      cantieriCompletati,
      salEmessi,
      documentiCaricati
    });
  }, []);

  const loadUserDashboard = useCallback(async (user) => {
    const [taskData, cantieriData] = await Promise.all([
      base44.entities.AttivitaInterna.filter({ assegnatario_id: user.id }, "-data_scadenza", 50),
      base44.entities.Cantiere.list("-created_date", 20)
    ]);

    setTaskPersonali(taskData);
    
    const documentiData = await base44.entities.Documento.filter({}, "-data_scadenza", 50);
    setDocumenti(documentiData);
    
    const cantieriIds = new Set(taskData.map(t => t.cantiere_id).filter(Boolean));
    const cantieriConTask = cantieriData.filter(cantiere => cantieriIds.has(cantiere.id));
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
      taskInRitardo,
      cantieriAttivi: cantieriData.filter(c => c.stato === 'attivo').length,
      avanzamentoMedio: 0
    });
  }, []);

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
  }, [loadAdminDashboard, loadUserDashboard]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

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

  const documentiInScadenzaList = useMemo(() => {
    const oggi = Date.now();
    const trentaGiorniMs = 30 * 24 * 60 * 60 * 1000;
    
    return documenti
      .filter(doc => {
        if (!doc.data_scadenza) return false;
        const scadenzaMs = new Date(doc.data_scadenza).getTime();
        const diff = scadenzaMs - oggi;
        return diff >= -7 * 24 * 60 * 60 * 1000 && diff <= trentaGiorniMs;
      })
      .sort((a, b) => new Date(a.data_scadenza) - new Date(b.data_scadenza));
  }, [documenti]);

  const dashboardData = useMemo(() => ({
    cantieri,
    taskPersonali,
    documenti,
    documentiInScadenza: documentiInScadenzaList,
    isLoading,
    kpis,
    statistiche,
    alerts: getAlertsForUser
  }), [cantieri, taskPersonali, documenti, documentiInScadenzaList, isLoading, kpis, statistiche, getAlertsForUser]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="p-10">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10">
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
            <p className="text-slate-600 mt-2 text-lg">
              {currentUser?.role === 'admin' 
                ? 'Panoramica generale e monitoraggio KPI' 
                : `Benvenuto ${currentUser?.full_name || currentUser?.email}`}
            </p>
          </div>

          {isLoading ? (
            <div className="animate-pulse space-y-8">
              <div className="h-10 bg-slate-200 rounded-xl w-64"></div>
              <div className="grid grid-cols-4 gap-6">
                {Array(4).fill(0).map((_, i) => (
                  <div key={i} className="h-36 bg-slate-200 rounded-2xl"></div>
                ))}
              </div>
              <div className="h-96 bg-slate-200 rounded-2xl"></div>
            </div>
          ) : (
            <DashboardPersonalizzata 
              currentUser={currentUser}
              dashboardData={dashboardData}
            />
          )}
        </div>
      </div>
    </div>
  );
}