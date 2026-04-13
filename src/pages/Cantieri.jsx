import React, { useState, useEffect, useCallback, useMemo } from "react";
import { backendClient } from "@/api/backendClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Plus, Search, Building2, Calendar, Euro, MoreHorizontal, Edit, Trash2, MapPin, BarChart3 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
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
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("tutti");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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

  // Funzione per creare documenti automatici dai file caricati nel cantiere
  const creaDocumentiDaFileCantiere = async (cantiereId, cantiereData, existingCantiere) => {
    alert('ENTRATO in creaDocumentiDaFileCantiere - cantiereId: ' + cantiereId);
    console.log('[creaDocumentiDaFileCantiere] START - cantiereId:', cantiereId);
    console.log('[creaDocumentiDaFileCantiere] Cantiere denominazione:', cantiereData.denominazione);

    const fileMappings = [
      {
        field: 'contratto_file_url',
        nome: 'Contratto Appalto',
        tipo: 'contratto_appalto',
        categoria: 'contratti',
        dataField: 'contratto_data_firma'
      },
      {
        field: 'polizza_definitiva_url',
        nome: 'Polizza Definitiva',
        tipo: 'polizze_decennale',
        categoria: 'polizze',
        dataField: 'polizza_definitiva_scadenza'
      },
      {
        field: 'polizza_car_url',
        nome: 'Polizza CAR',
        tipo: 'polizze_car',
        categoria: 'polizze',
        dataField: 'polizza_car_scadenza'
      },
      {
        field: 'polizza_anticipazione_url',
        nome: 'Polizza Anticipazione',
        tipo: 'polizze_rct',
        categoria: 'polizze',
        dataField: 'polizza_anticipazione_scadenza'
      },
      {
        field: 'verbale_inizio_lavori_url',
        nome: 'Verbale Inizio Lavori',
        tipo: 'cantiere_verbale_consegna',
        categoria: 'tecnici',
        dataField: 'data_inizio'
      }
    ];

    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const mapping of fileMappings) {
      const fileUrl = cantiereData[mapping.field];
      console.log(`[creaDocumentiDaFileCantiere] Check ${mapping.field}:`, fileUrl ? `PRESENTE (${fileUrl})` : 'ASSENTE');

      if (!fileUrl || fileUrl.trim() === '') {
        console.log(`[creaDocumentiDaFileCantiere] SKIP ${mapping.nome} - fileUrl vuoto`);
        skippedCount++;
        continue;
      }

      // Crea il documento
      try {
        console.log(`[creaDocumentiDaFileCantiere] Tentativo creazione documento: ${mapping.nome}`);
        const docData = {
          nome_documento: `${mapping.nome} - ${cantiereData.denominazione || ''}`,
          tipo_documento: mapping.tipo,
          categoria_principale: mapping.categoria,
          file_uri: fileUrl.startsWith('http') ? null : fileUrl,
          cloud_file_url: fileUrl.startsWith('http') ? fileUrl : null,
          data_emissione: cantiereData[mapping.dataField] || null,
          entita_collegate: JSON.stringify([
            { entita_tipo: 'cantiere', entita_id: cantiereId }
          ]),
          descrizione: `File caricato dalla form cantiere`,
          note: `Generato automaticamente il ${new Date().toLocaleDateString('it-IT')}`
        };
        console.log(`[creaDocumentiDaFileCantiere] Dati documento:`, docData);

        const result = await backendClient.entities.Documento.create(docData);
        console.log(`[creaDocumentiDaFileCantiere] Documento "${mapping.nome}" CREATO! ID:`, result?.id);
        createdCount++;
      } catch (error) {
        console.error(`[creaDocumentiDaFileCantiere] ERRORE CREAZIONE "${mapping.nome}":`, error);
        console.error(`[creaDocumentiDaFileCantiere] Error.message:`, error?.message);
        console.error(`[creaDocumentiDaFileCantiere] Error.details:`, error?.details);
        console.error(`[creaDocumentiDaFileCantiere] Error.hint:`, error?.hint);
        console.error(`[creaDocumentiDaFileCantiere] Error.code:`, error?.code);
        errorCount++;
      }
    }

    // Gestisci verbali_consegna (array di URL)
    if (Array.isArray(cantiereData.verbali_consegna) && cantiereData.verbali_consegna.length > 0) {
      for (let idx = 0; idx < cantiereData.verbali_consegna.length; idx++) {
        const verbaleUrl = cantiereData.verbali_consegna[idx];
        if (!verbaleUrl || verbaleUrl.trim() === '') continue;

        try {
          console.log(`[creaDocumentiDaFileCantiere] Tentativo creazione verbale consegna ${idx + 1}`);
          const result = await backendClient.entities.Documento.create({
            nome_documento: `Verbale Consegna ${idx + 1} - ${cantiereData.denominazione || ''}`,
            tipo_documento: 'cantiere_verbale_consegna',
            categoria_principale: 'tecnici',
            file_uri: verbaleUrl.startsWith('http') ? null : verbaleUrl,
            cloud_file_url: verbaleUrl.startsWith('http') ? verbaleUrl : null,
            entita_collegate: [
              { entita_tipo: 'cantiere', entita_id: cantiereId }
            ],
            descrizione: `Verbale di consegna ${idx + 1}`,
            note: `Generato automaticamente il ${new Date().toLocaleDateString('it-IT')}`
          });
          console.log(`[creaDocumentiDaFileCantiere] Verbale ${idx + 1} CREATO! ID:`, result?.id);
          createdCount++;
        } catch (error) {
          console.error(`[creaDocumentiDaFileCantiere] ERRORE creazione verbale ${idx + 1}:`, error);
          console.error(`[creaDocumentiDaFileCantiere] Error.message:`, error?.message);
          errorCount++;
        }
      }
    }

    console.log('[creaDocumentiDaFileCantiere] RESULT: creati=', createdCount, 'saltati=', skippedCount, 'errori=', errorCount);
  };

  const handleSubmit = useCallback(async (cantiereData) => {
    setIsSaving(true);
    try {
      console.log('[Cantieri.handleSubmit] START - Cantiere data:', cantiereData);
      let cantiereResult;

      if (editingCantiere) {
        console.log('[Cantieri.handleSubmit] Updating cantiere ID:', editingCantiere.id);
        cantiereResult = await backendClient.entities.Cantiere.update(editingCantiere.id, cantiereData);
        console.log('[Cantieri.handleSubmit] Update result:', cantiereResult);
      } else {
        const maxNumero = cantieri.reduce((max, c) => Math.max(max, c.numero_cantiere || 0), 0);
        cantiereResult = await backendClient.entities.Cantiere.create({
          ...cantiereData,
          numero_cantiere: maxNumero + 1
        });
        console.log('[Cantieri.handleSubmit] Create result:', cantiereResult);
      }

      // Crea documenti automatici per i file caricati
      const cantiereId = cantiereResult?.id || editingCantiere?.id;
      console.log('[Cantieri.handleSubmit] cantiereId per documenti:', cantiereId);
      console.log('[Cantieri.handleSubmit] cantiereData campi file:', {
        contratto_file_url: cantiereData.contratto_file_url,
        polizza_definitiva_url: cantiereData.polizza_definitiva_url,
        polizza_car_url: cantiereData.polizza_car_url,
        polizza_anticipazione_url: cantiereData.polizza_anticipazione_url,
        verbali_consegna: cantiereData.verbali_consegna
      });
      if (cantiereId) {
        alert('CREO DOCUMENTI per cantiere: ' + cantiereId);
        await creaDocumentiDaFileCantiere(cantiereId, cantiereData, editingCantiere);
        alert('DOCUMENTI CREATI COMPLETATO');
        console.log('[Cantieri.handleSubmit] creaDocumentiDaFileCantiere COMPLETATO');
      }

      toast({ title: editingCantiere ? "Cantiere aggiornato" : "Cantiere creato", description: cantiereData.denominazione });
      setShowForm(false);
      setFormIsDirty(false);
      await refreshCantieri();
    } catch (error) {
      console.error("[Cantieri.handleSubmit] Errore completo:", error);
      console.error("[Cantieri.handleSubmit] Error message:", error?.message);
      console.error("[Cantieri.handleSubmit] Error details:", error?.details);
      console.error("[Cantieri.handleSubmit] Error hint:", error?.hint);
      console.error("[Cantieri.handleSubmit] Error code:", error?.code);
      toast({ title: "Errore nel salvataggio", description: error?.message || error?.details || "Si è verificato un errore", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }, [editingCantiere, cantieri, refreshCantieri, toast]);

  const handleDelete = useCallback(async (id) => {
    if (window.confirm("Sei sicuro di voler eliminare questo cantiere? L'azione è irreversibile.")) {
      try {
        await backendClient.entities.Cantiere.delete(id);
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
      <div className="p-4 sm:p-6 lg:p-8">
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
                  className="shadow-sm"
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
                      className={statusFilter === status ? "whitespace-nowrap" : "border-slate-200 hover:bg-slate-50 whitespace-nowrap"}
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
            <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Totale</p>
                    <p className="text-3xl font-bold text-slate-900">{stats.totale}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                    <Building2 className="w-6 h-6 text-slate-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Attivi</p>
                    <p className="text-3xl font-bold text-emerald-600">{stats.attivi}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100">
                    <Building2 className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Completati</p>
                    <p className="text-3xl font-bold text-blue-600">{stats.completati}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Valore Tot.</p>
                    <p className="text-3xl font-bold text-indigo-600">
                      €{(stats.valoreTotale / 1000000).toFixed(1)}M
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100">
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
              onInteractOutside={(e) => e.preventDefault()}
              onPointerDownOutside={(e) => e.preventDefault()}
              onEscapeKeyDown={(e) => {
                if (formIsDirty) e.preventDefault();
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
                onDirtyChange={setFormIsDirty}
                isSaving={isSaving}
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