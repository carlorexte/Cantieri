import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useData } from '@/components/shared/DataContext';
import { usePermissions } from '@/components/shared/PermissionGuard';
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
  AlertCircle
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
  
  // Dialog States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedOrdine, setSelectedOrdine] = useState(null);

  const loadOrdini = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.OrdineMateriale.list("-data_ordine");
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
      await base44.entities.OrdineMateriale.create(data);
      toast.success("Ordine creato con successo");
      setIsFormOpen(false);
      loadOrdini();
    } catch (error) {
      console.error("Errore creazione ordine:", error);
      toast.error("Errore durante la creazione");
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await base44.entities.OrdineMateriale.update(id, { stato: newStatus });
      toast.success(`Stato aggiornato a ${newStatus.replace(/_/g, ' ')}`);
      
      // Update local state immediately
      setOrdini(prev => prev.map(o => o.id === id ? { ...o, stato: newStatus } : o));
      if (selectedOrdine && selectedOrdine.id === id) {
          setSelectedOrdine(prev => ({ ...prev, stato: newStatus }));
      }
      
      // If approved or rejected, close detail maybe? kept open for now
    } catch (error) {
      console.error("Errore aggiornamento stato:", error);
      toast.error("Errore aggiornamento stato");
    }
  };

  const filteredOrdini = ordini.filter(o => 
    o.descrizione?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.numero_ordine?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.fornitore_ragione_sociale?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Ordini Materiale</h1>
            <p className="text-slate-500 mt-1">Gestione ordini e approvvigionamenti cantiere</p>
          </div>
          
          {(hasPermission('ordini_create') || hasPermission('admin')) && (
            <Button 
                className="bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                onClick={() => { setSelectedOrdine(null); setIsFormOpen(true); }}
            >
              <Plus className="w-5 h-5 mr-2" />
              Nuovo Ordine
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6 flex gap-4">
            <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                    placeholder="Cerca ordine, fornitore..." 
                    className="pl-10 border-slate-200"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Button variant="outline" className="border-slate-200 text-slate-600">
                <Filter className="w-4 h-4 mr-2" /> Filtri
            </Button>
        </div>

        {/* Grid List */}
        {loading ? (
            <div className="text-center py-12 text-slate-500">Caricamento ordini...</div>
        ) : filteredOrdini.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-slate-900">Nessun ordine trovato</h3>
                <p className="text-slate-500">Non ci sono ordini che corrispondono alla ricerca.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredOrdini.map(ordine => {
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
                                <p className="text-sm text-slate-500 mb-4 flex items-center gap-2">
                                    <ShoppingCart className="w-3 h-3" />
                                    {ordine.fornitore_ragione_sociale || 'Fornitore non spec.'}
                                </p>

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
        />

      </div>
    </div>
  );
}