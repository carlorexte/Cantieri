import React, { useState, useEffect, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Plus, Search, Building2, Calendar, Euro, MoreHorizontal, Edit, Trash2, MapPin, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useData } from "@/components/shared/DataContext";
import { usePermissions } from "@/components/shared/PermissionGuard";

import CantiereForm from "../components/cantieri/CantiereForm";
import CantiereDetail from "../components/cantieri/CantiereDetail";
import AdvancedSearch from "@/components/shared/AdvancedSearch";

const statusColors = {
  attivo: "bg-emerald-50 text-emerald-700 border-emerald-200",
  sospeso: "bg-amber-50 text-amber-700 border-amber-200",
  completato: "bg-blue-50 text-blue-700 border-blue-200",
  in_gara: "bg-purple-50 text-purple-700 border-purple-200"
};

const CantiereCard = React.memo(({ cantiere, currentUser, onEdit, onDelete }) => {
  const { hasCantiereObjectPermission, isAdmin } = usePermissions();
  
  const canEdit = isAdmin || hasCantiereObjectPermission(cantiere, 'cantieri', 'edit');
  const canDelete = isAdmin || hasCantiereObjectPermission(cantiere, 'cantieri', 'admin.delete');

  return (
  <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-white group">
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            {cantiere.numero_cantiere && (
              <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300 font-mono">
                #{cantiere.numero_cantiere}
              </Badge>
            )}
            <Link 
              to={createPageUrl(`CantiereDashboard?id=${cantiere.id}`)}
              className="hover:text-indigo-600 transition-colors"
            >
              <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                {cantiere.denominazione}
              </h3>
            </Link>
            <Badge 
              variant="secondary"
              className={`${statusColors[cantiere.stato] || statusColors.attivo} border`}
            >
              {cantiere.stato}
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600 mb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span className="font-medium">CIG:</span>
              <span>{cantiere.codice_cig || 'N/D'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Euro className="w-4 h-4 text-slate-400" />
              <span className="font-medium">Imp. Contr.:</span>
              <span>
                {cantiere.importo_contrattuale_oltre_iva 
                  ? `€ ${Number(cantiere.importo_contrattuale_oltre_iva).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                  : 'N/D'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="font-medium">Fine:</span>
              <span>{cantiere.data_fine_prevista ? new Date(cantiere.data_fine_prevista).toLocaleDateString('it-IT') : 'N/D'}</span>
            </div>
          </div>

          <div className="space-y-2 text-sm text-slate-600">
            {cantiere.committente_ragione_sociale && (
              <div className="flex items-start gap-2">
                <span className="font-medium min-w-[120px]">Committente:</span>
                <span>{cantiere.committente_ragione_sociale}</span>
              </div>
            )}
            {cantiere.oggetto_lavori && (
              <div className="flex items-start gap-2">
                <span className="font-medium min-w-[120px]">Oggetto:</span>
                <span className="line-clamp-2">{cantiere.oggetto_lavori}</span>
              </div>
            )}
            {(cantiere.indirizzo || cantiere.indirizzo_citta) && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>
                  {[cantiere.indirizzo, cantiere.indirizzo_citta].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
            {cantiere.referente_interno && (
              <div className="flex items-start gap-2">
                <span className="font-medium min-w-[120px]">Referente:</span>
                <span>{cantiere.referente_interno}</span>
              </div>
            )}
          </div>
        </div>

        {(canEdit || canDelete) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600">
              <MoreHorizontal className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {canEdit && (
              <DropdownMenuItem onClick={() => onEdit(cantiere)}>
                <Edit className="w-4 h-4 mr-2" />
                Modifica
              </DropdownMenuItem>
            )}
            {canDelete && (
              <DropdownMenuItem 
                onClick={() => onDelete(cantiere.id)}
                className="text-red-600 focus:bg-red-50 focus:text-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Elimina
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        )}
      </div>
    </CardContent>
  </Card>
  );
});
CantiereCard.displayName = 'CantiereCard';

export default function Cantieri() {
  const { cantieri, refreshCantieri } = useData();
  const { user: currentUser, hasPermission } = usePermissions();
  const [statusFilter, setStatusFilter] = useState("tutti");
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCantiere, setEditingCantiere] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedCantiere, setSelectedCantiere] = useState(null);
  const [formIsDirty, setFormIsDirty] = useState(false);
  const [filteredCantieri, setFilteredCantieri] = useState([]);

  // Campi per la ricerca avanzata
  const searchFields = [
    { key: "denominazione", label: "Denominazione" },
    { key: "codice_cig", label: "CIG" },
    { key: "numero_cantiere", label: "Numero" },
    { key: "committente_ragione_sociale", label: "Committente" },
    { key: "referente_interno", label: "Referente" },
    { key: "indirizzo_citta", label: "Città" },
    { key: "stato", label: "Stato" },
    { key: "importo_contratto", label: "Importo" }
  ];

  // Filtro iniziale basato sullo stato (quick filter)
  const baseCantieri = useMemo(() => {
    if (statusFilter === "tutti") return cantieri;
    return cantieri.filter(c => c.stato === statusFilter);
  }, [cantieri, statusFilter]);

  // Aggiorna la lista quando cambiano i dati base (necessario per il primo render e cambi di stato)
  useEffect(() => {
    setFilteredCantieri(baseCantieri);
  }, [baseCantieri]);

  const handleSubmit = useCallback(async (cantiereData) => {
    try {
      if (editingCantiere) {
        await base44.entities.Cantiere.update(editingCantiere.id, cantiereData);
      } else {
        const maxNumero = cantieri.reduce((max, c) => Math.max(max, c.numero_cantiere || 0), 0);
        await base44.entities.Cantiere.create({
          ...cantiereData,
          numero_cantiere: maxNumero + 1
        });
      }
      setShowForm(false);
      setFormIsDirty(false);
      await refreshCantieri();
    } catch (error) {
      console.error("Errore salvataggio cantiere:", error);
    }
  }, [editingCantiere, cantieri, refreshCantieri]);

  const handleDelete = useCallback(async (id) => {
    if (window.confirm("Sei sicuro di voler eliminare questo cantiere? L'azione è irreversibile.")) {
      try {
        await base44.entities.Cantiere.delete(id);
        await refreshCantieri();
      } catch (error) {
        console.error("Errore durante l'eliminazione del cantiere:", error);
      }
    }
  }, [refreshCantieri]);

  const handleEdit = useCallback((cantiere) => {
    setEditingCantiere(cantiere);
    setFormIsDirty(false);
    setShowForm(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    if (formIsDirty) {
      const confirmClose = window.confirm(
        "Hai modificato dei dati non salvati. Sei sicuro di voler chiudere senza salvare?"
      );
      if (!confirmClose) return;
    }
    
    setShowForm(false);
    setEditingCantiere(null);
    setFormIsDirty(false);
  }, [formIsDirty]);

  const stats = useMemo(() => ({
    totale: cantieri.length,
    attivi: cantieri.filter(c => c.stato === 'attivo').length,
    completati: cantieri.filter(c => c.stato === 'completato').length,
    valoreTotale: cantieri.reduce((sum, c) => sum + (c.importo_contratto || 0), 0)
  }), [cantieri]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Cantieri</h1>
              <p className="text-slate-600 mt-1">Gestione e monitoraggio dei tuoi cantieri</p>
            </div>
            <div className="flex gap-3">
              <Link to={createPageUrl('RiepilogoCantieri')}>
                <Button variant="outline" className="shadow-sm">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Riepilogo Cantieri
                </Button>
              </Link>
              {(currentUser?.role === 'admin' || hasPermission('cantieri', 'edit')) && (
                <Button 
                  onClick={() => { 
                    setEditingCantiere(null); 
                    setFormIsDirty(false); 
                    setShowForm(true); 
                  }} 
                  className="bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Nuovo Cantiere
                </Button>
              )}
            </div>
          </div>

          {/* Filtri */}
          <Card className="border-0 shadow-sm mb-6 bg-white">
            <CardContent className="p-6">
              <div className="flex flex-col gap-4">
                {/* Advanced Search Component */}
                <AdvancedSearch 
                  data={baseCantieri}
                  searchFields={searchFields}
                  onFilter={setFilteredCantieri}
                  placeholder="Cerca cantieri (es. cig:84* stato:attivo)..."
                />

                <div className="flex gap-2 overflow-x-auto pb-2">
                  {["tutti", "attivo", "sospeso", "completato", "in_gara"].map((status) => (
                    <Button
                      key={status}
                      variant={statusFilter === status ? "default" : "outline"}
                      onClick={() => setStatusFilter(status)}
                      className={statusFilter === status ? "bg-indigo-600 hover:bg-indigo-700 whitespace-nowrap" : "border-slate-200 hover:bg-slate-50 whitespace-nowrap"}
                    >
                      {status === "tutti" ? "Tutti" : status.replace('_', ' ')}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Totale</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totale}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-slate-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Attivi</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.attivi}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Completati</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">{stats.completati}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Valore Tot.</p>
                    <p className="text-2xl font-bold text-indigo-600 mt-1">
                      €{(stats.valoreTotale / 1000000).toFixed(1)}M
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <Euro className="w-6 h-6 text-indigo-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lista Cantieri */}
          <div className="grid gap-4">
            {isLoading ? (
              <div className="space-y-4">
                {Array(3).fill(0).map((_, i) => (
                  <Card key={i} className="animate-pulse border-0 shadow-sm bg-white">
                    <CardContent className="p-6">
                      <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                        <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              filteredCantieri.map((cantiere) => (
                <CantiereCard
                  key={cantiere.id}
                  cantiere={cantiere}
                  currentUser={currentUser}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>

          {filteredCantieri.length === 0 && !isLoading && (
            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-12 text-center">
                <Building2 className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Nessun cantiere trovato</h3>
                <p className="text-slate-600">Inizia creando il tuo primo cantiere</p>
              </CardContent>
            </Card>
          )}

          {/* Dialog per il form cantiere */}
          <Dialog 
            open={showForm} 
            onOpenChange={(open) => {
              if (!open) {
                if (formIsDirty) {
                   if (window.confirm("Hai modifiche non salvate. Chiudere?")) {
                     handleCloseForm();
                   }
                } else {
                   handleCloseForm();
                }
              }
            }}
          >
            <DialogContent 
              className="max-w-4xl max-h-[90vh] overflow-y-auto"
              onInteractOutside={(e) => {
                e.preventDefault();
              }}
              onEscapeKeyDown={(e) => {
                if (formIsDirty) {
                  e.preventDefault();
                }
              }}
            >
              <DialogHeader>
                <DialogTitle>
                  {editingCantiere ? "Modifica Cantiere" : "Nuovo Cantiere"}
                </DialogTitle>
              </DialogHeader>
              <CantiereForm
                cantiere={editingCantiere}
                onSubmit={handleSubmit}
                onCancel={handleCloseForm}
                onDirtyChange={(isDirty) => {
                  setFormIsDirty(isDirty);
                }}
              />
            </DialogContent>
          </Dialog>

          {/* Dialog per i dettagli del cantiere */}
          <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Dettaglio Cantiere</DialogTitle>
              </DialogHeader>
              <CantiereDetail cantiere={selectedCantiere} />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}