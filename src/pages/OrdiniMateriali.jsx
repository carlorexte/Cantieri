import React, { useState, useEffect } from 'react';
import { backendClient } from '@/api/backendClient';
import { useData } from '@/components/shared/DataContext';
import { PermissionGuard, usePermissions } from '@/components/shared/PermissionGuard';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  ShoppingCart, 
  Plus, 
  Search, 
  Filter,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from "sonner";

import OrdineMaterialeForm from '@/components/ordini/OrdineMaterialeForm';
import OrdineMaterialeDetail from '@/components/ordini/OrdineMaterialeDetail';

const statusConfig = {
  bozza: { label: "Bozza", color: "bg-slate-100 text-slate-700", icon: FileText },
  in_attesa_approvazione: { label: "In Approvazione", color: "bg-amber-100 text-amber-700", icon: Clock },
  approvato: { label: "Approvato", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  rifiutato: { label: "Rifiutato", color: "bg-red-100 text-red-700", icon: AlertCircle },
  inviato_fornitore: { label: "Inviato", color: "bg-blue-100 text-blue-700", icon: ShoppingCart },
  ricevuto: { label: "Ricevuto", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
};

export default function OrdiniMateriali() {
  const { hasPermission } = usePermissions();
  const [ordini, setOrdini] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCantiere, setFilterCantiere] = useState("all");
  const { cantieri } = useData();
  
  // Dialog States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedOrdine, setSelectedOrdine] = useState(null);

  const loadOrdini = async () => {
    setLoading(true);
    try {
      const data = await backendClient.entities.OrdineMateriale.list("-data_ordine");
      setOrdini(data);
    } catch (error) {
      console.error("Errore caricamento ordini:", error);
      toast.error("Impossibile caricare gli ordini");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrdini();
  }, []);

  const handleCreate = async (data) => {
    try {
      await backendClient.entities.OrdineMateriale.create(data);
      toast.success("Ordine creato con successo");
      setIsFormOpen(false);
      loadOrdini();
    } catch (error) {
      console.error("Errore creazione ordine:", error);
      toast.error("Errore durante la creazione");
    }
  };

  const handleStatusChange = async (id, newStatus, note = null) => {
    try {
      const ordineCorrente = ordini.find(o => o.id === id) || selectedOrdine;

      if (newStatus === 'inviato_fornitore' && !ordineCorrente?.societa_intestataria_id) {
        toast.error("Seleziona prima la societa intestataria dell'ordine.");
        return;
      }

      const updateData = { stato: newStatus };
      if (note !== null) {
          updateData.note_approvazione = note;
      }

      await backendClient.entities.OrdineMateriale.update(id, updateData);

      const taskId = ordineCorrente?.attivita_collegata_id;
      if (taskId) {
        const taskUpdate = {};
        const dataOggi = new Date().toISOString().split('T')[0];

        if (newStatus === 'approvato' || newStatus === 'rifiutato') {
          taskUpdate.stato = 'completato';
          taskUpdate.data_completamento = dataOggi;
        } else if (newStatus === 'bozza') {
          taskUpdate.stato = 'in_revisione';
        } else if (newStatus === 'in_attesa_approvazione') {
          taskUpdate.stato = 'da_fare';
          taskUpdate.data_completamento = null;
        }

        if (note) {
          taskUpdate.note = note;
        }

        if (Object.keys(taskUpdate).length > 0) {
          await backendClient.entities.AttivitaInterna.update(taskId, taskUpdate);
        }
      }

      toast.success(`Stato aggiornato a ${newStatus.replace(/_/g, ' ')}`);
      
      // Update local state immediately
      setOrdini(prev => prev.map(o => o.id === id ? { ...o, ...updateData } : o));
      if (selectedOrdine && selectedOrdine.id === id) {
          setSelectedOrdine(prev => ({ ...prev, ...updateData }));
      }
      
    } catch (error) {
      console.error("Errore aggiornamento stato:", error);
      toast.error("Errore aggiornamento stato");
    }
  };

  const filteredOrdini = ordini.filter(o => {
      const matchesSearch = 
          (o.descrizione?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
          (o.numero_ordine?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
          (o.fornitore_ragione_sociale?.toLowerCase() || "").includes(searchTerm.toLowerCase());

      const matchesCantiere = filterCantiere === "all" || o.cantiere_id === filterCantiere;

      return matchesSearch && matchesCantiere;
  });

  // Grouping logic
  const groupedOrdini = React.useMemo(() => {
      const groups = {};

      // Initialize with available cantieri to ensure order/structure
      // or just group by existing orders' cantiere_id

      filteredOrdini.forEach(order => {
          const cantiereId = order.cantiere_id || "unknown";
          if (!groups[cantiereId]) {
              const cantiere = cantieri.find(c => c.id === cantiereId);
              groups[cantiereId] = {
                  name: cantiere ? cantiere.denominazione : (cantiereId === "unknown" ? "Senza Cantiere" : "Cantiere Sconosciuto"),
                  orders: []
              };
          }
          groups[cantiereId].orders.push(order);
      });

      return Object.values(groups);
  }, [filteredOrdini, cantieri]);

  return (
    <PermissionGuard module="ordini_materiale" action="view">
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Ordini Materiale</h1>
            <p className="text-slate-500 mt-1">Gestione ordini e approvvigionamenti cantiere</p>
          </div>
          
          {(hasPermission('ordini_materiale', 'edit') || hasPermission('admin')) && (
            <Button 
                className="shadow-sm"
                onClick={() => { setSelectedOrdine(null); setIsFormOpen(true); }}
            >
              <Plus className="w-5 h-5 mr-2" />
              Nuovo Ordine
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                    placeholder="Cerca ordine, fornitore..." 
                    className="pl-10 border-slate-200"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="w-full md:w-64">
                 <select 
                    className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={filterCantiere}
                    onChange={(e) => setFilterCantiere(e.target.value)}
                >
                    <option value="all">Tutti i Cantieri</option>
                    {cantieri.map(c => (
                        <option key={c.id} value={c.id}>{c.denominazione}</option>
                    ))}
                </select>
            </div>
        </div>

        {/* Grouped Grid List */}
        {loading ? (
            <div className="text-center py-12 text-slate-500">Caricamento ordini...</div>
        ) : filteredOrdini.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-slate-900">Nessun ordine trovato</h3>
                <p className="text-slate-500">Non ci sono ordini che corrispondono alla ricerca.</p>
            </div>
        ) : (
            <div className="space-y-8">
                {groupedOrdini.map(group => (
                    <div key={group.name} className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                            <Building2 className="w-5 h-5 text-indigo-600" />
                            <h2 className="text-lg font-bold text-slate-800">{group.name}</h2>
                            <Badge variant="secondary" className="ml-2">{group.orders.length}</Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {group.orders.map(ordine => {
                                const status = statusConfig[ordine.stato] || statusConfig.bozza;
                                const StatusIcon = status.icon;

                                return (
                                    <Card 
                                        key={ordine.id} 
                                        className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                                        onClick={() => { setSelectedOrdine(ordine); setIsDetailOpen(true); }}
                                    >
                                        <CardContent className="p-5">
                                            <div className="flex justify-between items-start mb-3">
                                                <Badge variant="outline" className="bg-slate-50 text-slate-600 font-mono">
                                                    {ordine.numero_ordine || 'BOZZA'}
                                                </Badge>
                                                <Badge className={`${status.color} border-0`}>
                                                    <StatusIcon className="w-3 h-3 mr-1" />
                                                    {status.label}
                                                </Badge>
                                            </div>
                                            
                                            <h3 className="font-semibold text-lg text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors line-clamp-1">
                                                {ordine.descrizione}
                                            </h3>
                                            <div className="flex justify-between items-start mb-4">
                                                <p className="text-sm text-slate-500 flex items-center gap-2">
                                                    <ShoppingCart className="w-3 h-3" />
                                                    {ordine.fornitore_ragione_sociale || 'Fornitore non spec.'}
                                                </p>
                                                {ordine.importo_totale > 0 && (
                                                    <span className="font-semibold text-slate-700 text-sm">
                                                        € {Number(ordine.importo_totale).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                                    </span>
                                                )}
                                            </div>

                                            {ordine.tipo_operazione === 'noleggio' && (
                                                <div className="mb-3">
                                                    <Badge variant="secondary" className="text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 border-0">
                                                        Noleggio {ordine.durata_noleggio ? `- ${ordine.durata_noleggio}` : ''}
                                                    </Badge>
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between text-xs text-slate-400 border-t pt-3 mt-auto">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {ordine.data_ordine ? format(new Date(ordine.data_ordine), 'dd MMM yyyy') : '-'}
                                                </div>
                                                <div>
                                                    {ordine.dettagli_materiali?.length || 0} articoli
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* Dialogs */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Nuovo Ordine Materiale</DialogTitle>
                </DialogHeader>
                <OrdineMaterialeForm 
                    onSubmit={handleCreate} 
                    onCancel={() => setIsFormOpen(false)} 
                />
            </DialogContent>
        </Dialog>

        <OrdineMaterialeDetail 
            ordine={selectedOrdine} 
            open={isDetailOpen} 
            onClose={() => setIsDetailOpen(false)}
            onStatusChange={handleStatusChange}
            canApprove={hasPermission('ordini_materiale', 'accept')}
            canEdit={hasPermission('ordini_materiale', 'edit')}
        />

      </div>
    </div>
    </PermissionGuard>
  );
}
