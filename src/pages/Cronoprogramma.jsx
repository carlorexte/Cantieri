import React, { useState, useEffect, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Filter, Building2, Plus, BarChart3, Grid3X3, Clock, CheckCircle2, AlertCircle, Play, Upload, Trash2, RotateCcw, ArrowLeft, Maximize2, Home, Calendar as CalendarIcon, ClipboardList } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { PermissionGuard, usePermissions } from "@/components/shared/PermissionGuard";

const PrimusGantt = React.lazy(() => import("../components/cronoprogramma/PrimusGantt"));
import AttivitaForm from "../components/cronoprogramma/AttivitaForm";
import ImportCronoprogrammaForm from "../components/cronoprogramma/ImportCronoprogrammaForm";

const statoStats = {
  pianificata: { icon: Clock, color: "bg-slate-100 text-slate-700", label: "Pianificate" },
  in_corso: { icon: Play, color: "bg-blue-100 text-blue-700", label: "In Corso" },
  completata: { icon: CheckCircle2, color: "bg-green-100 text-green-700", label: "Completate" },
  sospesa: { icon: Play, color: "bg-yellow-100 text-yellow-700", label: "Sospese" },
  in_ritardo: { icon: AlertCircle, color: "bg-red-100 text-red-700", label: "In Ritardo" }
};

export default function CronoprogrammaPage() {
  const [cantieri, setCantieri] = useState([]);
  const [cantieriAttivita, setCantieriAttivita] = useState({});
  const [cantieriSals, setCantieriSals] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [showAttivitaForm, setShowAttivitaForm] = useState(false);
  const [editingAttivita, setEditingAttivita] = useState(null);
  const [selectedCantiereId, setSelectedCantiereId] = useState(null);
  const [viewMode, setViewMode] = useState("single");
  const [filtroStato, setFiltroStato] = useState("tutti");
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [showImportForm, setShowImportForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmStep, setDeleteConfirmStep] = useState(1);
  const [showFullscreenView, setShowFullscreenView] = useState(false);

  const { hasPermission, hasCantierePermission } = usePermissions();

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
    return filtroStato === "tutti"
      ? attivita
      : attivita.filter(att => att.stato === filtroStato);
  }, [filtroStato]);

  const getOverallStats = useMemo(() => {
    const allAttivita = Object.values(cantieriAttivita).flat();
    return Object.keys(statoStats).reduce((acc, stato) => {
      acc[stato] = allAttivita.filter(a => a.stato === stato).length;
      return acc;
    }, { totale: allAttivita.length });
  }, [cantieriAttivita]);

  const currentCantiere = useMemo(() => cantieri.find(c => c.id === selectedCantiereId), [cantieri, selectedCantiereId]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [cantieriData, user, salList] = await Promise.all([
        base44.functions.invoke('getMyCantieri').then(res => res.data?.items || res.items || []),
        base44.auth.me(),
        base44.entities.SAL.list("data_sal")
      ]);
      // Filter only active cantieri for cronoprogramma view
      const activeCantieri = cantieriData.filter(c => c.stato === "attivo");
      setCantieri(activeCantieri);
      setCurrentUser(user);

      console.log('Caricamento attività e SAL...');
      const tutteLeAttivita = await base44.entities.Attivita.list("data_inizio");

      const cantieriAttivitaMap = activeCantieri.reduce((acc, cantiere) => {
        acc[cantiere.id] = tutteLeAttivita.filter(a => a.cantiere_id === cantiere.id);
        return acc;
      }, {});

      const cantieriSalsMap = activeCantieri.reduce((acc, cantiere) => {
        acc[cantiere.id] = salList.filter(s => s.cantiere_id === cantiere.id);
        return acc;
      }, {});

      setCantieriAttivita(cantieriAttivitaMap);
      setCantieriSals(cantieriSalsMap);

      const urlParams = new URLSearchParams(window.location.search);
      const cantiereIdFromUrl = urlParams.get('cantiere_id');

      let initialCantiereToSelect = null;

      if (cantiereIdFromUrl && activeCantieri.some(c => c.id === cantiereIdFromUrl)) {
        initialCantiereToSelect = cantiereIdFromUrl;
      } else if (selectedCantiereId && activeCantieri.some(c => c.id === selectedCantiereId)) {
        initialCantiereToSelect = selectedCantiereId;
      } else if (activeCantieri.length > 0) {
        initialCantiereToSelect = activeCantieri[0].id;
      }

      setSelectedCantiereId(initialCantiereToSelect);

    } catch (error) {
      console.error("Errore caricamento dati:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCantiereId]);

  useEffect(() => {
    loadData();
  }, [reloadTrigger, loadData]);

  const handleSubmit = useCallback(async (attivitaData) => {
    try {
      if (editingAttivita) {
        await base44.entities.Attivita.update(editingAttivita.id, attivitaData);
      } else {
        await base44.entities.Attivita.create(attivitaData);
      }
      setShowAttivitaForm(false);
      setEditingAttivita(null);
      setReloadTrigger(prev => prev + 1);
    } catch (error) {
      console.error("Errore salvataggio attività:", error);
      toast.error("Errore durante il salvataggio dell'attività.");
    }
  }, [editingAttivita]);

  const handleUpdateAttivita = useCallback(async (id, data) => {
    try {
      await base44.entities.Attivita.update(id, data);
      setReloadTrigger(prev => prev + 1);
      toast.success("Attività aggiornata con successo.");
    } catch (error) {
      console.error("Errore aggiornamento attività:", error);
      toast.error("Errore durante l'aggiornamento dell'attività.");
    }
  }, []);

  const handleAddAttivita = useCallback((cantiereId) => {
    setEditingAttivita(null);
    setSelectedCantiereId(cantiereId);
    setShowAttivitaForm(true);
  }, []);

  const handleEditAttivita = useCallback((attivita) => {
    setEditingAttivita(attivita);
    setShowAttivitaForm(true);
  }, []);

  const handleDeleteAttivita = useCallback(async (id) => {
    try {
      await base44.entities.Attivita.delete(id);
      setShowAttivitaForm(false);
      setEditingAttivita(null);
      setReloadTrigger(prev => prev + 1);
      toast.success("Attività eliminata con successo.");
    } catch (error) {
      console.error("Errore eliminazione attività:", error);
      toast.error("Errore durante l'eliminazione dell'attività.");
    }
  }, []);

  const handleImportSuccess = () => {
    setShowImportForm(false);
    setReloadTrigger(prev => prev + 1);
    toast.success("Cronoprogramma importato con successo!");
  };

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

  const handleConfirmDelete = useCallback(async () => {
    const attivitaCantiere = cantieriAttivita[selectedCantiereId] || [];

    try {
      let eliminateCount = 0;
      let erroriCount = 0;

      for (const attivita of attivitaCantiere) {
        try {
          await base44.entities.Attivita.delete(attivita.id);
          eliminateCount++;
        } catch (error) {
          if (error.message && error.message.includes('not found')) {
            console.log(`Attività ${attivita.id} già eliminata, salto...`);
            eliminateCount++;
          } else {
            console.error(`Errore eliminazione attività ${attivita.id}:`, error);
            erroriCount++;
          }
        }
      }

      setShowDeleteDialog(false);
      setDeleteConfirmStep(1);

      if (erroriCount === 0) {
        toast.success(`Cronoprogramma resettato: ${eliminateCount} attività rimosse`);
      } else {
        toast.success(`Cronoprogramma resettato: ${eliminateCount} attività rimosse (${erroriCount} errori ignorati)`);
      }

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
      <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
        <div className="max-w-full mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-64"></div>
            <div className="h-96 bg-slate-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  const overallStats = getOverallStats;
  const canEdit = currentUser?.role === 'admin' || hasPermission('cronoprogramma', 'edit');

  return (
    <PermissionGuard module="cronoprogramma" action="view">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="p-8">
          <div className="max-w-full mx-auto">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
              <div>
                {selectedCantiereId && (
                  <Link to={createPageUrl(`CantiereDashboard?id=${selectedCantiereId}`)}>
                    <Button variant="outline" className="mb-3 border-slate-200 hover:bg-slate-50">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Torna al Cantiere
                    </Button>
                  </Link>
                )}
                <h1 className="text-3xl font-bold text-slate-900">Cronoprogramma</h1>
                {currentCantiere ? (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200">
                      <Building2 className="w-4 h-4" />
                      <span className="font-medium">{currentCantiere.denominazione}</span>
                    </span>
                    {currentCantiere.codice_cig && (
                      <span className="text-sm text-slate-500">CIG: {currentCantiere.codice_cig}</span>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-600 mt-1">Seleziona un cantiere per visualizzare il cronoprogramma</p>
                )}
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {/* Cantiere Selector */}
                {viewMode === "single" && cantieri.length > 0 && (
                  <Select value={selectedCantiereId || ''} onValueChange={setSelectedCantiereId}>
                    <SelectTrigger className="w-64 h-10 border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2 w-full">
                        <Building2 className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                        <div className="flex-1 text-left min-w-0">
                          <span className="text-sm font-medium text-slate-900 truncate block">
                            {currentCantiere?.denominazione || 'Seleziona cantiere'}
                          </span>
                        </div>
                      </div>
                    </SelectTrigger>
                    <SelectContent className="w-80">
                      {cantieri.map((cantiere) => {
                        const stats = getCantiereStats(cantiere);
                        return (
                          <SelectItem key={cantiere.id} value={cantiere.id}>
                            <div className="flex items-start gap-3 py-1.5">
                              <Building2 className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-slate-900 text-sm truncate">
                                  {cantiere.denominazione}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-slate-500">{stats.totale} attività</span>
                                  <span className="text-xs text-slate-400">•</span>
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-12 h-1 bg-slate-200 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-indigo-600 rounded-full"
                                        style={{ width: `${stats.percentualeCompletamento}%` }}
                                      />
                                    </div>
                                    <span className="text-xs font-medium text-slate-700">{stats.percentualeCompletamento}%</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}

                {/* Import Button */}
                {canEdit && (
                  <Button
                    onClick={() => setShowImportForm(true)}
                    variant="outline"
                    size="sm"
                    className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 h-10"
                    disabled={!selectedCantiereId}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Importa Cronoprogramma
                  </Button>
                )}

                {/* Reset Button */}
                {canEdit && viewMode === "single" && selectedCantiereId && cantieriAttivita[selectedCantiereId]?.length > 0 && (
                  <Button
                    onClick={handleDeleteCronoprogramma}
                    variant="outline"
                    size="sm"
                    className="border-amber-200 text-amber-700 hover:bg-amber-50 h-10"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Resetta Cronoprogramma
                  </Button>
                )}

                {/* Global Add Attivita Button */}
                {canEdit && (
                  <Button
                    onClick={() => {
                      setEditingAttivita(null);
                      setShowAttivitaForm(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 shadow-sm h-10"
                    disabled={!selectedCantiereId}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Aggiungi Attività
                  </Button>
                )}

                {/* Filter */}
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-500" />
                  <Select value={filtroStato} onValueChange={setFiltroStato}>
                    <SelectTrigger className="w-40 h-10 border-slate-200 bg-white text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tutti">Tutti gli stati</SelectItem>
                      <SelectItem value="pianificata">Pianificate</SelectItem>
                      <SelectItem value="in_corso">In Corso</SelectItem>
                      <SelectItem value="completata">Completate</SelectItem>
                      <SelectItem value="sospesa">Sospese</SelectItem>
                      <SelectItem value="in_ritardo">In Ritardo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 bg-white rounded-lg p-1 border border-slate-200">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className={`h-8 ${viewMode === "grid" ? "bg-slate-900 hover:bg-slate-800 text-white" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"}`}
                  >
                    <Grid3X3 className="w-4 h-4 mr-1.5" />
                    Panoramica
                  </Button>
                  <Button
                    variant={viewMode === "single" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("single")}
                    className={`h-8 ${viewMode === "single" ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"}`}
                  >
                    <BarChart3 className="w-4 h-4 mr-1.5" />
                    Gantt
                  </Button>
                </div>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
              <Card className="border-0 shadow-sm bg-white">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-slate-900">{cantieri.length}</div>
                  <div className="text-sm text-slate-600 mt-1">Cantieri</div>
                </CardContent>
              </Card>
              {Object.entries(statoStats).map(([stato, config]) => {
                const Icon = config.icon;
                return (
                  <Card key={stato} className="border-0 shadow-sm bg-white">
                    <CardContent className="p-4 text-center">
                      <div className="flex items-center justify-center mb-1">
                        <Icon className="w-5 h-5 mr-1 text-slate-600" />
                        <span className="text-2xl font-bold text-slate-900">{overallStats[stato] || 0}</span>
                      </div>
                      <div className="text-sm text-slate-600">{config.label}</div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {cantieri.length === 0 ? (
              <Card className="border-0 shadow-lg bg-white">
                <CardContent className="p-12 text-center">
                  <Building2 className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    Nessun cantiere attivo
                  </h3>
                  <p className="text-slate-600">
                    Crea il primo cantiere per iniziare la pianificazione
                  </p>
                </CardContent>
              </Card>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {cantieri.map((cantiere) => {
                  const stats = getCantiereStats(cantiere);

                  return (
                    <Card key={cantiere.id} className="border-0 shadow-lg bg-white hover:shadow-xl transition-shadow">
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg font-bold text-slate-900 mb-2">
                              {cantiere.denominazione}
                            </CardTitle>
                            <div className="flex items-center gap-4 text-sm text-slate-600">
                              <span>CIG: {cantiere.codice_cig}</span>
                              <span>€ {cantiere.importo_contratto?.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 'N/D'}</span>
                            </div>
                          </div>
                          <Badge
                            variant="secondary"
                            className={`${stats.percentualeCompletamento >= 75 ? 'bg-green-100 text-green-800' :
                              stats.percentualeCompletamento >= 50 ? 'bg-blue-100 text-blue-800' :
                                stats.percentualeCompletamento >= 25 ? 'bg-orange-100 text-orange-800' :
                                  'bg-slate-100 text-slate-800'}`}
                          >
                            {stats.percentualeCompletamento}%
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent>
                        <div className="grid grid-cols-5 gap-2 mb-4">
                          {Object.entries(statoStats).map(([stato, config]) => {
                            const Icon = config.icon;
                            return (
                              <div key={stato} className="text-center">
                                <div className={`rounded-lg p-2 ${config.color} mb-1`}>
                                  <Icon className="w-4 h-4 mx-auto" />
                                  <div className="text-sm font-semibold">{stats[stato] || 0}</div>
                                </div>
                                <div className="text-xs text-slate-600">{config.label}</div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="w-full bg-slate-200 rounded-full h-3 mb-4">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${stats.percentualeCompletamento}%` }}
                          ></div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              setSelectedCantiereId(cantiere.id);
                              setViewMode("single");
                            }}
                          >
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Visualizza Gantt
                          </Button>
                          {canEdit && (
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700"
                              onClick={() => handleAddAttivita(cantiere.id)}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Aggiungi
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Barra navigazione Gantt */}
                {selectedCantiereId && currentCantiere && (
                  <div className="flex items-center justify-between bg-white rounded-lg border border-slate-200 px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const ganttContainer = document.querySelector('[data-gantt-grid]');
                          if (ganttContainer) ganttContainer.scrollLeft = 0;
                        }}
                        className="h-8 text-sm text-slate-600 hover:bg-slate-100"
                      >
                        <Home className="w-4 h-4 mr-1" />
                        Inizio
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // Trigger scrollToToday from TeamsystemGantt
                          const event = new CustomEvent('gantt-scroll-today');
                          window.dispatchEvent(event);
                        }}
                        className="h-8 text-sm text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                      >
                        <CalendarIcon className="w-4 h-4 mr-1" />
                        Oggi
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const ganttContainer = document.querySelector('[data-gantt-grid]');
                          if (ganttContainer) {
                            ganttContainer.scrollLeft = ganttContainer.scrollWidth;
                          }
                        }}
                        className="h-8 text-sm text-slate-600 hover:bg-slate-100"
                      >
                        Fine
                      </Button>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFullscreenView(true)}
                      className="h-8 text-sm border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    >
                      <Maximize2 className="w-4 h-4 mr-2" />
                      Vista Completa
                    </Button>
                  </div>
                )}

                {/* Gantt Chart */}
                <div className="flex-1" style={{ height: 'calc(100vh - 20rem)' }}>
                  {selectedCantiereId && cantieri.length > 0 && currentCantiere && (
                    <React.Suspense fallback={<div className="flex items-center justify-center h-full">Caricamento grafico Gantt...</div>}>
                      <PrimusGantt
                        attivita={filteredAttivita(cantieriAttivita[selectedCantiereId] || [])}
                        sals={cantieriSals[selectedCantiereId] || []}
                        cantiere={currentCantiere}
                        onAddAttivita={() => handleAddAttivita(selectedCantiereId)}
                        onEditAttivita={handleEditAttivita}
                        onUpdateAttivita={handleUpdateAttivita}
                        canEdit={canEdit}
                      />
                    </React.Suspense>
                  )}
                </div>
              </div>
            )}

            {/* Existing AttivitaForm Dialog */}
            <Dialog open={showAttivitaForm} onOpenChange={setShowAttivitaForm}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingAttivita ? "Modifica Attività" : "Nuova Attività"}
                  </DialogTitle>
                </DialogHeader>
                <AttivitaForm
                  attivita={editingAttivita}
                  cantiere_id={selectedCantiereId}
                  onSubmit={handleSubmit}
                  onCancel={() => {
                    setShowAttivitaForm(false);
                    setEditingAttivita(null);
                  }}
                  onDelete={editingAttivita ? handleDeleteAttivita : null}
                />
              </DialogContent>
            </Dialog>

            {/* Dialog Importazione */}
            <Dialog open={showImportForm} onOpenChange={setShowImportForm}>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Importa Cronoprogramma da File</DialogTitle>
                </DialogHeader>
                <ImportCronoprogrammaForm
                  cantieri={cantieri}
                  onSuccess={handleImportSuccess}
                  onCancel={() => setShowImportForm(false)}
                />
              </DialogContent>
            </Dialog>

            {/* Dialog Vista Completa */}
            <Dialog open={showFullscreenView} onOpenChange={setShowFullscreenView}>
              <DialogContent className="max-w-[98vw] max-h-[98vh] h-[98vh] p-0 flex flex-col">
                <DialogHeader className="px-6 py-4 border-b border-slate-200 flex-shrink-0">
                  <DialogTitle className="flex items-center gap-2 text-slate-900">
                    <Maximize2 className="w-5 h-5 text-indigo-600" />
                    Vista Completa Cronoprogramma - {currentCantiere?.denominazione}
                  </DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-hidden">
                  {selectedCantiereId && currentCantiere && (
                    <React.Suspense fallback={<div className="flex items-center justify-center h-full">Caricamento grafico Gantt...</div>}>
                      <PrimusGantt
                        attivita={filteredAttivita(cantieriAttivita[selectedCantiereId] || [])}
                        sals={cantieriSals[selectedCantiereId] || []}
                        cantiere={currentCantiere}
                        onAddAttivita={() => handleAddAttivita(selectedCantiereId)}
                        onEditAttivita={handleEditAttivita}
                        onUpdateAttivita={handleUpdateAttivita}
                        canEdit={canEdit}
                        isFullscreen={true}
                      />
                    </React.Suspense>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {/* Dialog Conferma Reset */}
            <Dialog open={showDeleteDialog} onOpenChange={(open) => {
              setShowDeleteDialog(open);
              if (!open) {
                setDeleteConfirmStep(1);
              }
            }}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-amber-700">
                    <RotateCcw className="w-5 h-5" />
                    Resetta Cronoprogramma
                  </DialogTitle>
                  <DialogDescription>
                    {deleteConfirmStep === 1 ? (
                      <div className="space-y-3 pt-2">
                        <p className="text-slate-700">
                          Vuoi resettare il cronoprogramma del cantiere <strong>"{cantieri.find(c => c.id === selectedCantiereId)?.denominazione}"</strong>?
                        </p>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <p className="text-sm text-amber-800">
                            Questo eliminerà tutte le <strong>{cantieriAttivita[selectedCantiereId]?.length || 0} attività</strong> esistenti.
                          </p>
                          <p className="text-sm text-amber-700 mt-2">
                            Potrai poi importare un nuovo cronoprogramma.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 pt-2">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <p className="text-red-800 font-semibold flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            CONFERMA FINALE
                          </p>
                          <p className="text-sm text-red-700 mt-2">
                            Verranno eliminate <strong>{cantieriAttivita[selectedCantiereId]?.length || 0} attività</strong>.
                          </p>
                          <p className="text-sm text-red-700 mt-1">
                            Questa azione è <strong>irreversibile</strong>.
                          </p>
                        </div>
                      </div>
                    )}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDeleteDialog(false);
                      setDeleteConfirmStep(1);
                    }}
                  >
                    Annulla
                  </Button>
                  {deleteConfirmStep === 1 ? (
                    <Button
                      variant="default"
                      className="bg-amber-600 hover:bg-amber-700"
                      onClick={() => setDeleteConfirmStep(2)}
                    >
                      Continua
                    </Button>
                  ) : (
                    <Button
                      variant="destructive"
                      onClick={handleConfirmDelete}
                    >
                      Conferma Reset
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}