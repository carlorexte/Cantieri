import React, { useState, useEffect, useCallback } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Settings, Plus, GripVertical, Eye, EyeOff, Save } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// Import dei widget disponibili
import KPIWidget from "./widgets/KPIWidget";
import CantieriAttiviWidget from "./widgets/CantieriAttiviWidget";
import AlertWidget from "./widgets/AlertWidget";
import TaskPersonaliWidget from "./widgets/TaskPersonaliWidget";
import StatisticheWidget from "./widgets/StatisticheWidget";
import DocumentiScadenzaWidget from "./widgets/DocumentiScadenzaWidget";

const AVAILABLE_WIDGETS = {
  kpi_cantieri: {
    id: "kpi_cantieri",
    name: "KPI Cantieri Attivi",
    component: KPIWidget,
    defaultProps: { type: "cantieri" },
    category: "kpi",
    width: "col-span-1"
  },
  kpi_valore: {
    id: "kpi_valore",
    name: "KPI Valore Portafoglio",
    component: KPIWidget,
    defaultProps: { type: "valore" },
    category: "kpi",
    width: "col-span-1"
  },
  kpi_avanzamento: {
    id: "kpi_avanzamento",
    name: "KPI Avanzamento",
    component: KPIWidget,
    defaultProps: { type: "avanzamento" },
    category: "kpi",
    width: "col-span-1"
  },
  kpi_documenti: {
    id: "kpi_documenti",
    name: "KPI Documenti in Scadenza",
    component: KPIWidget,
    defaultProps: { type: "documenti" },
    category: "kpi",
    width: "col-span-1"
  },
  cantieri_attivi: {
    id: "cantieri_attivi",
    name: "Lista Cantieri Attivi",
    component: CantieriAttiviWidget,
    category: "liste",
    width: "col-span-2"
  },
  alert: {
    id: "alert",
    name: "Allarmi e Notifiche",
    component: AlertWidget,
    category: "notifiche",
    width: "col-span-1"
  },
  task_personali: {
    id: "task_personali",
    name: "Task Personali",
    component: TaskPersonaliWidget,
    category: "liste",
    width: "col-span-2"
  },
  statistiche: {
    id: "statistiche",
    name: "Statistiche Mensili",
    component: StatisticheWidget,
    category: "grafici",
    width: "col-span-2"
  },
  documenti_scadenza: {
    id: "documenti_scadenza",
    name: "Documenti in Scadenza",
    component: DocumentiScadenzaWidget,
    category: "liste",
    width: "col-span-1"
  }
};

const DEFAULT_ADMIN_LAYOUT = [
  "kpi_cantieri",
  "kpi_valore",
  "kpi_avanzamento",
  "kpi_documenti",
  "cantieri_attivi",
  "alert"
];

const DEFAULT_USER_LAYOUT = [
  "kpi_cantieri",
  "kpi_avanzamento",
  "task_personali",
  "alert"
];

export default function DashboardPersonalizzata({ currentUser, dashboardData }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [widgets, setWidgets] = useState([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadUserLayout();
  }, [currentUser]);

  const loadUserLayout = useCallback(async () => {
    try {
      if (!currentUser) return;

      const savedLayout = currentUser.dashboard_layout;
      
      if (savedLayout && Array.isArray(savedLayout)) {
        setWidgets(savedLayout);
      } else {
        const defaultLayout = currentUser.role === 'admin' 
          ? DEFAULT_ADMIN_LAYOUT 
          : DEFAULT_USER_LAYOUT;
        setWidgets(defaultLayout);
      }
    } catch (error) {
      console.error("Errore caricamento layout:", error);
      const defaultLayout = currentUser?.role === 'admin' 
        ? DEFAULT_ADMIN_LAYOUT 
        : DEFAULT_USER_LAYOUT;
      setWidgets(defaultLayout);
    }
  }, [currentUser]);

  const handleDragEnd = useCallback((result) => {
    if (!result.destination) return;

    const items = Array.from(widgets);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setWidgets(items);
  }, [widgets]);

  const handleSaveLayout = useCallback(async () => {
    setIsSaving(true);
    try {
      await base44.auth.updateMe({
        dashboard_layout: widgets
      });
      setIsEditMode(false);
      toast.success("Layout salvato con successo!");
    } catch (error) {
      console.error("Errore salvataggio layout:", error);
      toast.error("Errore durante il salvataggio");
    } finally {
      setIsSaving(false);
    }
  }, [widgets]);

  const handleToggleWidget = useCallback((widgetId) => {
    setWidgets(prev => {
      if (prev.includes(widgetId)) {
        return prev.filter(id => id !== widgetId);
      } else {
        return [...prev, widgetId];
      }
    });
  }, []);

  const handleResetLayout = useCallback(() => {
    const defaultLayout = currentUser?.role === 'admin' 
      ? DEFAULT_ADMIN_LAYOUT 
      : DEFAULT_USER_LAYOUT;
    setWidgets(defaultLayout);
    toast.info("Layout ripristinato ai valori predefiniti");
  }, [currentUser]);

  const getWidgetComponent = useCallback((widgetId, index) => {
    const widgetConfig = AVAILABLE_WIDGETS[widgetId];
    if (!widgetConfig) return null;

    const WidgetComponent = widgetConfig.component;
    const props = {
      ...widgetConfig.defaultProps,
      dashboardData,
      currentUser
    };

    return (
      <Draggable key={widgetId} draggableId={widgetId} index={index} isDragDisabled={!isEditMode}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={`${widgetConfig.width} ${snapshot.isDragging ? 'z-50' : ''}`}
          >
            <div className={`relative ${isEditMode ? 'ring-2 ring-indigo-300 rounded-2xl' : ''}`}>
              {isEditMode && (
                <div 
                  {...provided.dragHandleProps}
                  className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 bg-indigo-600 text-white px-3 py-1 rounded-full shadow-lg cursor-move flex items-center gap-2 text-xs font-semibold"
                >
                  <GripVertical className="w-3 h-3" />
                  Trascina
                </div>
              )}
              <WidgetComponent {...props} />
            </div>
          </div>
        )}
      </Draggable>
    );
  }, [isEditMode, dashboardData, currentUser]);

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          {isEditMode && (
            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border-2 border-indigo-200 rounded-xl">
              <Settings className="w-4 h-4 text-indigo-600 animate-spin" />
              <span className="text-sm font-semibold text-indigo-900">Modalità Modifica Attiva</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {isEditMode && (
            <>
              <Button
                variant="outline"
                onClick={() => setShowAddDialog(true)}
                className="border-indigo-200 hover:bg-indigo-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                Aggiungi Widget
              </Button>
              <Button
                variant="outline"
                onClick={handleResetLayout}
              >
                Ripristina
              </Button>
              <Button
                onClick={handleSaveLayout}
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isSaving ? (
                  <>Salvataggio...</>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salva Layout
                  </>
                )}
              </Button>
            </>
          )}
          <Button
            variant={isEditMode ? "destructive" : "default"}
            onClick={() => setIsEditMode(!isEditMode)}
            className={!isEditMode ? "bg-indigo-600 hover:bg-indigo-700" : ""}
          >
            <Settings className="w-4 h-4 mr-2" />
            {isEditMode ? "Esci dalla Modifica" : "Personalizza"}
          </Button>
        </div>
      </div>

      {/* Dashboard Grid */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="dashboard" direction="horizontal">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {widgets.map((widgetId, index) => getWidgetComponent(widgetId, index))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {widgets.length === 0 && (
        <Card className="border-2 border-dashed border-slate-300">
          <CardContent className="p-12 text-center">
            <Plus className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Nessun widget aggiunto</h3>
            <p className="text-slate-600 mb-4">Inizia ad aggiungere widget per personalizzare la tua dashboard</p>
            <Button onClick={() => setShowAddDialog(true)} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi Widget
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialog Aggiungi Widget */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Aggiungi Widget alla Dashboard</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 max-h-[60vh] overflow-y-auto">
            {["kpi", "liste", "notifiche", "grafici"].map(category => {
              const categoryWidgets = Object.values(AVAILABLE_WIDGETS).filter(
                w => w.category === category
              );
              
              if (categoryWidgets.length === 0) return null;
              
              return (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">
                    {category === "kpi" ? "KPI" : category === "liste" ? "Liste" : category === "notifiche" ? "Notifiche" : "Grafici"}
                  </h3>
                  <div className="space-y-2">
                    {categoryWidgets.map(widget => {
                      const isActive = widgets.includes(widget.id);
                      
                      return (
                        <div
                          key={widget.id}
                          className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            isActive 
                              ? 'border-indigo-300 bg-indigo-50' 
                              : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
                          }`}
                          onClick={() => handleToggleWidget(widget.id)}
                        >
                          <Checkbox
                            checked={isActive}
                            onCheckedChange={() => handleToggleWidget(widget.id)}
                          />
                          <div className="flex-1">
                            <Label className="cursor-pointer font-medium text-slate-900">
                              {widget.name}
                            </Label>
                          </div>
                          {isActive ? (
                            <Eye className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Chiudi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}