import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabaseDB } from '@/lib/supabaseClient';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Upload, RotateCcw, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PlanningGantt from "../components/cronoprogramma/PlanningGantt";
import ImportCronoprogrammaForm from "../components/cronoprogramma/ImportCronoprogrammaForm";
import AttivitaForm from "../components/cronoprogramma/AttivitaForm";
import { createPlanningActivity, dbActivitiesToPlanning, planningActivitiesToDb } from "@/utils/planningModel";

const statoStats = {
  pianificata: { icon: Building2, color: "bg-slate-100 text-slate-600", label: "Pianificate", accent: "text-slate-700" },
  in_corso: { icon: Building2, color: "bg-blue-100 text-blue-600", label: "In Corso", accent: "text-blue-700" },
  completata: { icon: Building2, color: "bg-emerald-100 text-emerald-600", label: "Completate", accent: "text-emerald-700" }
};

export default function CronoprogrammaPage() {
  const [cantieri, setCantieri] = useState([]);
  const [cantieriAttivita, setCantieriAttivita] = useState({});
  const [cantieriSals, setCantieriSals] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCantiereId, setSelectedCantiereId] = useState(null);
  const [viewMode, setViewMode] = useState("single");
  const [filtroStato, setFiltroStato] = useState("tutti");
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [showImportForm, setShowImportForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAttivitaDialog, setShowAttivitaDialog] = useState(false);
  const [editingAttivita, setEditingAttivita] = useState(null);
  const [isSectionFullView, setIsSectionFullView] = useState(false);

  const currentCantiere = useMemo(() => cantieri.find(c => c.id === selectedCantiereId), [cantieri, selectedCantiereId]);

  const handleToggleSectionFullView = useCallback(() => {
    setIsSectionFullView((current) => !current);
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('📡 Caricamento cantieri da Supabase...');
      const cantieriData = await supabaseDB.cantieri.getAll();
      console.log('✅ Cantieri caricati:', cantieriData.length);

      setCantieri(cantieriData);

      const activeCantiereId = selectedCantiereId || (cantieriData.length > 0 ? cantieriData[0].id : null);

      if (activeCantiereId && activeCantiereId !== selectedCantiereId) {
        setSelectedCantiereId(activeCantiereId);
      }

      if (activeCantiereId) {
        console.log(`📡 Caricamento attività per cantiere: ${activeCantiereId}`);

        // Carica solo attività (SAL temporaneamente disabilitato)
        const attivitaResult = await supabaseDB.attivita.getByCantiere(activeCantiereId);

        console.log(`✅ Attività caricate:`, attivitaResult?.length || 0);

        setCantieriAttivita(prev => ({
          ...prev,
          [activeCantiereId]: attivitaResult || []
        }));

        // SAL disabilitato temporaneamente (tabella non configurata)
        setCantieriSals(prev => ({
          ...prev,
          [activeCantiereId]: []
        }));
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Errore caricamento dati:", error);
      setIsLoading(false);
    }
  }, [selectedCantiereId]);

  useEffect(() => {
    loadData();
  }, [reloadTrigger, loadData]);

  useEffect(() => {
    if (!selectedCantiereId) return;

    let isCancelled = false;

    const loadSalsForCantiere = async () => {
      try {
        const salResult = await supabaseDB.sals.getByCantiere(selectedCantiereId);
        if (isCancelled) return;

        setCantieriSals(prev => ({
          ...prev,
          [selectedCantiereId]: salResult || []
        }));
      } catch (error) {
        if (isCancelled) return;
        console.warn("Caricamento SAL non disponibile:", error);
        setCantieriSals(prev => ({
          ...prev,
          [selectedCantiereId]: prev[selectedCantiereId] || []
        }));
      }
    };

    loadSalsForCantiere();

    return () => {
      isCancelled = true;
    };
  }, [selectedCantiereId, reloadTrigger]);

  const getCantiereStats = useCallback((cantiere) => {
    if (!cantiere || !cantiere.id) return { totale: 0, percentualeCompletamento: 0 };
    const attivita = cantieriAttivita[cantiere.id] || [];
    const stats = Object.keys(statoStats).reduce((acc, stato) => {
      acc[stato] = attivita.filter(a => a.stato === stato).length;
      return acc;
    }, {});
    const totale = attivita.length;
    const completate = stats.completata || 0;
    const percentualeCompletamento = totale > 0 ? Math.round((completate / totale) * 100) : 0;
    return { ...stats, totale, percentualeCompletamento };
  }, [cantieriAttivita]);

  const filteredAttivita = useCallback((attivita) => {
    return filtroStato === "tutti" ? attivita : attivita.filter(att => att.stato === filtroStato);
  }, [filtroStato]);

  const selectedPlanningActivities = useMemo(() => {
    if (!selectedCantiereId) return [];
    const rawActivities = filteredAttivita(cantieriAttivita[selectedCantiereId] || []);
    return dbActivitiesToPlanning(rawActivities);
  }, [selectedCantiereId, cantieriAttivita, filteredAttivita]);

  const getOverallStats = useMemo(() => {
    const allAttivita = Object.values(cantieriAttivita).flat();
    return Object.keys(statoStats).reduce((acc, stato) => {
      acc[stato] = allAttivita.filter(a => a.stato === stato).length;
      return acc;
    }, { totale: allAttivita.length });
  }, [cantieriAttivita]);

  const handleImportSuccess = () => {
    setShowImportForm(false);
    setReloadTrigger(prev => prev + 1);
    toast.success("Cronoprogramma importato con successo!");
  };

  const handleOpenNewAttivita = useCallback(() => {
    if (!selectedCantiereId) {
      toast.info("Seleziona un cantiere prima di creare una nuova attivita.");
      return;
    }
    setEditingAttivita(null);
    setShowAttivitaDialog(true);
  }, [selectedCantiereId]);

  const handleOpenEditAttivita = useCallback((attivita) => {
    if (!attivita) return;
    setEditingAttivita(attivita);
    setShowAttivitaDialog(true);
  }, []);

  const handleAttivitaSubmit = useCallback(async (formPayload) => {
    if (!selectedCantiereId) {
      toast.error("Cantiere non selezionato.");
      return;
    }

    try {
      const planningActivity = createPlanningActivity({
        ...formPayload,
        cantiere_id: selectedCantiereId,
        id: editingAttivita?.id || formPayload.id || undefined
      }, 'manual-form');
      const dbPayload = planningActivitiesToDb([planningActivity])[0];

      let savedActivity;
      if (editingAttivita?.id) {
        savedActivity = await supabaseDB.attivita.update(editingAttivita.id, {
          ...dbPayload,
          cantiere_id: selectedCantiereId,
          updated_date: new Date().toISOString()
        });
      } else {
        savedActivity = await supabaseDB.attivita.create({
          ...dbPayload,
          cantiere_id: selectedCantiereId,
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString()
        });
      }

      setCantieriAttivita((prev) => {
        const current = prev[selectedCantiereId] || [];
        const next = editingAttivita?.id
          ? current.map((item) => item.id === savedActivity.id ? savedActivity : item)
          : [...current, savedActivity];

        return {
          ...prev,
          [selectedCantiereId]: next
        };
      });

      setShowAttivitaDialog(false);
      setEditingAttivita(null);
      toast.success(editingAttivita?.id ? "Attivita aggiornata." : "Attivita creata.");
    } catch (error) {
      console.error("Errore salvataggio attivita:", error);
      toast.error("Errore durante il salvataggio dell'attivita.");
    }
  }, [selectedCantiereId, editingAttivita]);

  const handleAttivitaDelete = useCallback(async (attivitaId) => {
    if (!selectedCantiereId || !attivitaId) return;

    try {
      await supabaseDB.attivita.delete(attivitaId);
      setCantieriAttivita((prev) => ({
        ...prev,
        [selectedCantiereId]: (prev[selectedCantiereId] || []).filter((item) => item.id !== attivitaId)
      }));
      setShowAttivitaDialog(false);
      setEditingAttivita(null);
      toast.success("Attivita eliminata.");
    } catch (error) {
      console.error("Errore eliminazione attivita:", error);
      toast.error("Errore durante l'eliminazione dell'attivita.");
    }
  }, [selectedCantiereId]);

  const handleAttivitaUpdate = useCallback(async (updatedActivityIds, calculationResult) => {
    if (!selectedCantiereId || !updatedActivityIds || updatedActivityIds.length === 0) {
      console.warn('[handleAttivitaUpdate] Parametri mancanti:', { selectedCantiereId, updatedActivityIds, calculationResult });
      return;
    }

    try {
      console.log('[handleAttivitaUpdate] Inizio aggiornamento:', updatedActivityIds);
      let updates = [];

      if (calculationResult?.directUpdates?.length) {
        updates = calculationResult.directUpdates;
      } else if (calculationResult?.results?.length) {
        const cpmResultMap = new Map(
          calculationResult.results.map((row) => [row.activity?.id, row])
        );

        updates = updatedActivityIds
          .map((activityId) => {
            const row = cpmResultMap.get(activityId);
            if (!row?.data_inizio_calcolata || !row?.data_fine_calcolata) return null;
            return {
              id: activityId,
              data_inizio: row.data_inizio_calcolata,
              data_fine: row.data_fine_calcolata
            };
          })
          .filter(Boolean);
      }

      if (updates.length === 0) {
        console.warn('[handleAttivitaUpdate] Nessun aggiornamento da applicare');
        return;
      }

      console.log('[handleAttivitaUpdate] Aggiorno attività:', updates);

      await Promise.all(
        updates.map((update) => {
          const { id, ...fields } = update;
          console.log(`[handleAttivitaUpdate] Update attività ${id}:`, fields);
          return supabaseDB.attivita.update(id, {
            ...fields,
            updated_date: new Date().toISOString()
          });
        })
      );

      console.log('[handleAttivitaUpdate] Aggiornamento completato con successo');
      toast.success(`Aggiornate ${updates.length} attività`);

      const updatesMap = new Map(updates.map((update) => [update.id, update]));
      setCantieriAttivita((prev) => {
        const current = prev[selectedCantiereId] || [];
        const nextForCantiere = current.map((attivita) => {
          const update = updatesMap.get(attivita.id);
          if (!update) return attivita;
          return {
            ...attivita,
            ...update
          };
        });
        return {
          ...prev,
          [selectedCantiereId]: nextForCantiere
        };
      });
    } catch (error) {
      console.error("[handleAttivitaUpdate] Errore:", error);
      console.error("[handleAttivitaUpdate] Error details:", error?.message, error?.details, error?.hint);
      toast.error(`Errore aggiornamento: ${error?.message || error?.details || 'Controlla i log'}`);
      throw error;
    }
  }, [selectedCantiereId]);

  const handleProgressUpdate = useCallback(async (attivitaId, percentuale) => {
    if (!selectedCantiereId) return;
    try {
      await supabaseDB.attivita.update(attivitaId, {
        percentuale_completamento: percentuale,
        updated_date: new Date().toISOString()
      });
      setCantieriAttivita(prev => ({
        ...prev,
        [selectedCantiereId]: (prev[selectedCantiereId] || []).map(a =>
          a.id === attivitaId ? { ...a, percentuale_completamento: percentuale } : a
        )
      }));
      toast.success('Avanzamento aggiornato');
    } catch (error) {
      console.error('Errore aggiornamento avanzamento:', error);
      toast.error('Errore durante l\'aggiornamento dell\'avanzamento');
    }
  }, [selectedCantiereId]);

  const handleDeleteCronoprogramma = useCallback(async () => {
    if (!selectedCantiereId) {
      toast.info("Seleziona un cantiere per resettare il cronoprogramma.");
      return;
    }

    const attivitaCantiere = cantieriAttivita[selectedCantiereId] || [];
    if (attivitaCantiere.length === 0) {
      toast.info("Nessuna attività da eliminare per questo cantiere.");
      return;
    }

    setDeleteConfirmStep(1);
    setShowDeleteDialog(true);
  }, [selectedCantiereId, cantieriAttivita]);

  const [deleteConfirmStep, setDeleteConfirmStep] = useState(1);

  const handleConfirmDelete = useCallback(async () => {
    const attivitaCantiere = cantieriAttivita[selectedCantiereId] || [];

    try {
      let eliminateCount = 0;
      for (const attivita of attivitaCantiere) {
        try {
          await supabaseDB.attivita.delete(attivita.id);
          eliminateCount++;
        } catch (error) {
          if (error.message && error.message.includes('not found')) {
            eliminateCount++;
          }
        }
      }

      setShowDeleteDialog(false);
      setDeleteConfirmStep(1);
      toast.success(`Cronoprogramma resettato: ${eliminateCount} attività rimosse`);
      setReloadTrigger(prev => prev + 1);
    } catch (error) {
      console.error("Errore reset cronoprogramma:", error);
      toast.error("Errore durante il reset del cronoprogramma.");
      setShowDeleteDialog(false);
      setDeleteConfirmStep(1);
    }
  }, [selectedCantiereId, cantieriAttivita, setReloadTrigger]);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 bg-slate-50 min-h-screen">
        <div className="max-w-full mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded-lg w-64"></div>
            <div className="h-96 bg-slate-200 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  const overallStats = getOverallStats;

  if (isSectionFullView) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-100">
        <div className="h-full p-4">
          {selectedCantiereId && currentCantiere ? (
            <PlanningGantt
              planningActivities={selectedPlanningActivities}
              sals={cantieriSals[selectedCantiereId] || []}
              cantiere={currentCantiere}
              onAddAttivita={handleOpenNewAttivita}
              onEditAttivita={handleOpenEditAttivita}
              onAttivitaUpdate={handleAttivitaUpdate}
              onProgressUpdate={handleProgressUpdate}
              isSectionFullView={isSectionFullView}
              onToggleSectionFullView={handleToggleSectionFullView}
            />
          ) : (
            <Card className="border-0 shadow-lg bg-white h-full">
              <CardContent className="p-12 text-center">
                <Building2 className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Seleziona un cantiere</h3>
                <p className="text-slate-600">Usa il menu a tendina per scegliere un cantiere</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="p-4 sm:p-6">
        <div className="max-w-full mx-auto">
          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div>
              {selectedCantiereId && (
                <Link to={createPageUrl(`CantiereDashboard?id=${selectedCantiereId}`)}>
                  <Button variant="ghost" size="sm" className="mb-2 -ml-2 text-slate-500 hover:text-slate-700">
                    <ArrowLeft className="w-4 h-4 mr-1.5" />
                    Torna al Cantiere
                  </Button>
                </Link>
              )}
              <h1 className="text-3xl font-bold text-slate-900">Cronoprogramma</h1>
              {currentCantiere ? (
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg border border-orange-200 text-sm font-medium">
                    <Building2 className="w-4 h-4" />
                    {currentCantiere.denominazione}
                  </span>
                </div>
              ) : (
                <p className="text-slate-500 mt-1 text-sm">Seleziona un cantiere per visualizzare il cronoprogramma</p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {cantieri.length > 0 && (
                <Select value={selectedCantiereId || ''} onValueChange={setSelectedCantiereId}>
                  <SelectTrigger className="w-64 h-10 border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center gap-2 w-full">
                      <Building2 className="w-4 h-4 text-orange-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-slate-900 truncate">
                        {currentCantiere?.denominazione || 'Seleziona cantiere'}
                      </span>
                    </div>
                  </SelectTrigger>
                  <SelectContent className="w-80">
                    {cantieri.map((cantiere) => {
                      const stats = getCantiereStats(cantiere);
                      return (
                        <SelectItem key={cantiere.id} value={cantiere.id}>
                          <div className="flex items-start gap-3 py-1">
                            <Building2 className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-slate-900 text-sm truncate">{cantiere.denominazione}</div>
                              <div className="text-xs text-slate-400">{stats.totale} attività</div>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}

              <div className="flex items-center gap-1 bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className={`h-8 px-3 text-sm ${viewMode === "grid" ? "" : "text-slate-500 hover:text-slate-700"}`}
                >
                  Panoramica
                </Button>
                <Button
                  variant={viewMode === "single" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("single")}
                  className={`h-8 px-3 text-sm ${viewMode === "single" ? "" : "text-slate-500 hover:text-slate-700"}`}
                >
                  Gantt
                </Button>
              </div>

              <Button
                onClick={handleOpenNewAttivita}
                size="sm"
                className="h-9"
                disabled={!selectedCantiereId}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Nuova Attività
              </Button>

              <Button
                onClick={() => setShowImportForm(true)}
                variant="outline"
                size="sm"
                className="h-9 border-slate-200 text-slate-600 hover:bg-slate-50"
                disabled={!selectedCantiereId}
              >
                <Upload className="w-4 h-4 mr-1.5" />
                Importa
              </Button>

              {viewMode === "single" && selectedCantiereId && cantieriAttivita[selectedCantiereId]?.length > 0 && (
                <Button
                  onClick={handleDeleteCronoprogramma}
                  variant="ghost"
                  size="sm"
                  className="h-9 text-slate-400 hover:text-red-600 hover:bg-red-50"
                >
                  <RotateCcw className="w-4 h-4 mr-1.5" />
                  Resetta
                </Button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Cantieri</p>
                    <p className="text-2xl font-bold text-slate-900">{cantieri.length}</p>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-orange-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            {Object.entries(statoStats).map(([stato, cfg]) => (
              <Card key={stato} className="border-0 shadow-sm bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">{cfg.label}</p>
                      <p className={`text-2xl font-bold ${cfg.accent}`}>{overallStats[stato] || 0}</p>
                    </div>
                    <div className={`w-9 h-9 rounded-lg ${cfg.color} flex items-center justify-center`}>
                      <cfg.icon className="w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {cantieri.length === 0 ? (
            <Card className="border-0 shadow-md bg-white">
              <CardContent className="p-16 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Nessun cantiere attivo</h3>
                <p className="text-slate-500 text-sm">Crea il primo cantiere per iniziare</p>
              </CardContent>
            </Card>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {cantieri.map((cantiere) => {
                const stats = getCantiereStats(cantiere);
                return (
                  <Card key={cantiere.id} className="border-0 shadow-md bg-white hover:shadow-lg transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-900 text-base truncate pr-3">{cantiere.denominazione}</h3>
                          <p className="text-xs text-slate-400 mt-0.5">{stats.totale} attività totali</p>
                        </div>
                        <Badge className="bg-orange-50 text-orange-700 border border-orange-200 font-semibold shrink-0">
                          {stats.percentualeCompletamento}%
                        </Badge>
                      </div>
                      <div className="flex gap-3 mb-4">
                        {Object.entries(statoStats).map(([stato, cfg]) => (
                          <div key={stato} className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${cfg.color.split(' ')[0]}`} />
                            <span className="text-xs text-slate-500">{cfg.label}: <span className="font-semibold text-slate-700">{stats[stato] || 0}</span></span>
                          </div>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setSelectedCantiereId(cantiere.id);
                          setViewMode("single");
                        }}
                      >
                        Apri Gantt
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div style={{ height: 'calc(100vh - 14rem)' }}>
              {selectedCantiereId && currentCantiere ? (
                <PlanningGantt
                  planningActivities={selectedPlanningActivities}
                  sals={cantieriSals[selectedCantiereId] || []}
                  cantiere={currentCantiere}
                  onAddAttivita={handleOpenNewAttivita}
                  onEditAttivita={handleOpenEditAttivita}
                  onAttivitaUpdate={handleAttivitaUpdate}
                  onProgressUpdate={handleProgressUpdate}
                  isSectionFullView={isSectionFullView}
                  onToggleSectionFullView={handleToggleSectionFullView}
                />
              ) : (
                <Card className="border-0 shadow-md bg-white h-full">
                  <CardContent className="p-16 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Seleziona un cantiere</h3>
                    <p className="text-slate-500 text-sm">Usa il menu a tendina per scegliere un cantiere</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dialog Importazione */}
      <Dialog open={showImportForm} onOpenChange={setShowImportForm}>
        <DialogContent className="w-[96vw] max-w-[96vw] h-[92vh] overflow-hidden p-0 sm:max-w-[96vw]">
          <DialogHeader className="px-6 py-4 border-b border-slate-200">
            <DialogTitle>Importa Cronoprogramma da File</DialogTitle>
          </DialogHeader>
          <div className="h-[calc(92vh-73px)] overflow-y-auto px-6 py-4">
            <ImportCronoprogrammaForm
              cantieri={cantieri}
              onSuccess={handleImportSuccess}
              onCancel={() => setShowImportForm(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAttivitaDialog} onOpenChange={setShowAttivitaDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAttivita ? "Modifica Attivita" : "Nuova Attivita"}</DialogTitle>
          </DialogHeader>
          <AttivitaForm
            attivita={editingAttivita}
            cantiere_id={selectedCantiereId}
            onSubmit={handleAttivitaSubmit}
            onCancel={() => {
              setShowAttivitaDialog(false);
              setEditingAttivita(null);
            }}
            onDelete={editingAttivita ? handleAttivitaDelete : undefined}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog Elimina */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Elimina Cronoprogramma</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {deleteConfirmStep === 1 ? (
              <>
                <p className="text-sm text-slate-600 mb-4">
                  Sei sicuro di voler eliminare tutte le attività di questo cantiere? Questa azione non può essere annullata.
                </p>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Annulla</Button>
                  <Button variant="destructive" onClick={() => setDeleteConfirmStep(2)}>Conferma eliminazione</Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-red-600 mb-4">Confermi l'eliminazione di tutte le attività?</p>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setDeleteConfirmStep(1)}>Indietro</Button>
                  <Button variant="destructive" onClick={handleConfirmDelete}>Elimina tutto</Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
