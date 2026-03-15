import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Save, Plus, Building, FileText, FileCheck, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";
import { PermissionGuard, usePermissions } from "@/components/shared/PermissionGuard";

import DocumentoForm from "../components/documenti/DocumentoForm";

export default function ProfiloAziendaPage() {
  const [azienda, setAzienda] = useState(null);
  const [documenti, setDocumenti] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDocumento, setEditingDocumento] = useState(null);

  const { hasPermission, isAdmin } = usePermissions();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const aziendeData = await base44.entities.Azienda.list();
      let currentAzienda = aziendeData.length > 0 ? aziendeData[0] : { ragione_sociale: '', partita_iva: '' };
      setAzienda(currentAzienda);

      if (currentAzienda.id) {
        const documentiData = await base44.entities.Documento.filter({
          entita_collegata_tipo: "azienda",
          entita_collegata_id: currentAzienda.id
        }, "-created_date");
        setDocumenti(documentiData);
      }
    } catch (error) {
      console.error("Errore caricamento dati:", error);
      toast.error("Impossibile caricare i dati del profilo aziendale.");
    }
    setIsLoading(false);
  };

  const handleAziendaChange = (field, value) => {
    setAzienda(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveAzienda = async () => {
    if (!azienda.ragione_sociale || !azienda.partita_iva) {
      toast.error("Ragione Sociale e Partita IVA sono obbligatori.");
      return;
    }
    try {
      if (azienda.id) {
        await base44.entities.Azienda.update(azienda.id, azienda);
        toast.success("Profilo aziendale aggiornato.");
      } else {
        const newAzienda = await base44.entities.Azienda.create(azienda);
        setAzienda(newAzienda);
        toast.success("Profilo aziendale creato.");
      }
      loadData();
    } catch (error) {
      console.error("Errore salvataggio azienda:", error);
      toast.error("Errore durante il salvataggio del profilo.");
    }
  };

  const handleDocumentoSubmit = async (documentoData) => {
    try {
      if (editingDocumento) {
        await base44.entities.Documento.update(editingDocumento.id, documentoData);
        toast.success("Documento aggiornato con successo.");
      } else {
        await base44.entities.Documento.create({
          ...documentoData,
          entita_collegata_id: azienda.id,
          entita_collegata_tipo: "azienda"
        });
        toast.success("Documento creato con successo.");
      }
      setShowForm(false);
      setEditingDocumento(null);
      loadData();
    } catch (error) {
      console.error("Errore salvataggio documento:", error);
      toast.error("Errore durante il salvataggio del documento.");
    }
  };

  const handleEditDocumento = (doc) => {
    setEditingDocumento(doc);
    setShowForm(true);
  };

  const getScadenzaStatus = (dataScadenza) => {
    if (!dataScadenza) return null;
    const oggi = new Date();
    const scadenza = new Date(dataScadenza);
    const diff = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { label: "Scaduto", icon: AlertTriangle, color: "text-red-600" };
    if (diff <= 30) return { label: `In scadenza (${diff}gg)`, icon: Clock, color: "text-yellow-600" };
    return null;
  };

  if (isLoading) {
    return <div className="p-6">Caricamento...</div>;
  }

  const canAddDocuments = azienda && azienda.id;
  const canEdit = isAdmin || hasPermission('profilo_azienda', 'edit');

  return (
    <PermissionGuard module="profilo_azienda" action="view">
      <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-8">
          <h1 className="text-3xl font-bold text-slate-900">Profilo Azienda</h1>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-600" />
                Dati Anagrafici
              </CardTitle>
              <CardDescription>Informazioni generali e fiscali della tua azienda.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-1"><Label>Ragione Sociale *</Label><Input disabled={!canEdit} value={azienda?.ragione_sociale || ''} onChange={e => handleAziendaChange('ragione_sociale', e.target.value)} /></div>
              <div className="space-y-1"><Label>Partita IVA *</Label><Input disabled={!canEdit} value={azienda?.partita_iva || ''} onChange={e => handleAziendaChange('partita_iva', e.target.value)} /></div>
              <div className="space-y-1"><Label>Codice Fiscale</Label><Input disabled={!canEdit} value={azienda?.codice_fiscale || ''} onChange={e => handleAziendaChange('codice_fiscale', e.target.value)} /></div>
              <div className="space-y-1 col-span-1 md:col-span-2"><Label>Indirizzo Sede Legale</Label><Input disabled={!canEdit} value={azienda?.indirizzo_legale || ''} onChange={e => handleAziendaChange('indirizzo_legale', e.target.value)} /></div>
              <div className="space-y-1"><Label>Città</Label><Input disabled={!canEdit} value={azienda?.citta_legale || ''} onChange={e => handleAziendaChange('citta_legale', e.target.value)} /></div>
              <div className="space-y-1"><Label>CAP</Label><Input disabled={!canEdit} value={azienda?.cap_legale || ''} onChange={e => handleAziendaChange('cap_legale', e.target.value)} /></div>
              <div className="space-y-1"><Label>Provincia</Label><Input disabled={!canEdit} value={azienda?.provincia_legale || ''} onChange={e => handleAziendaChange('provincia_legale', e.target.value)} /></div>
              <div className="space-y-1"><Label>Email</Label><Input disabled={!canEdit} type="email" value={azienda?.email || ''} onChange={e => handleAziendaChange('email', e.target.value)} /></div>
              <div className="space-y-1"><Label>PEC</Label><Input disabled={!canEdit} type="email" value={azienda?.pec || ''} onChange={e => handleAziendaChange('pec', e.target.value)} /></div>
              <div className="space-y-1"><Label>Telefono</Label><Input disabled={!canEdit} value={azienda?.telefono || ''} onChange={e => handleAziendaChange('telefono', e.target.value)} /></div>
              <div className="space-y-1"><Label>Codice SDI</Label><Input disabled={!canEdit} value={azienda?.codice_sdi || ''} onChange={e => handleAziendaChange('codice_sdi', e.target.value)} /></div>
              <div className="space-y-1"><Label>Banca d'appoggio</Label><Input disabled={!canEdit} value={azienda?.banca_appoggio || ''} onChange={e => handleAziendaChange('banca_appoggio', e.target.value)} /></div>
              <div className="space-y-1 col-span-1 md:col-span-2"><Label>IBAN</Label><Input disabled={!canEdit} value={azienda?.iban || ''} onChange={e => handleAziendaChange('iban', e.target.value)} /></div>
            </CardContent>
            {canEdit && (
              <div className="p-6 pt-0 text-right">
                <Button onClick={handleSaveAzienda} className="bg-blue-600 hover:bg-blue-700 shadow-lg">
                  <Save className="w-4 h-4 mr-2" /> Salva Profilo
                </Button>
              </div>
            )}
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Documenti Aziendali
                </CardTitle>
                <CardDescription>Gestione dei documenti e delle scadenze relative all'azienda.</CardDescription>
              </div>
              <div className="flex flex-col items-end gap-2">
                {canEdit && (
                  <Button
                    onClick={() => {
                      setEditingDocumento(null);
                      setShowForm(true);
                    }}
                    disabled={!canAddDocuments}
                    className="bg-blue-600 hover:bg-blue-700 shadow-lg disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Aggiungi Documento
                  </Button>
                )}
                {!canAddDocuments && canEdit && (
                  <p className="text-xs text-slate-500 italic">
                    Salva prima il profilo aziendale per aggiungere documenti
                  </p>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome Documento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Scadenza</TableHead>
                    <TableHead>Cloud Backup</TableHead>
                    <TableHead>Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documenti.map(doc => {
                    const scadenza = getScadenzaStatus(doc.data_scadenza);
                    return (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.nome_documento}</TableCell>
                        <TableCell>{doc.tipo_documento?.replace(/_/g, ' ')}</TableCell>
                        <TableCell>
                          {doc.data_scadenza ? (
                            <div className={`flex items-center gap-2 ${scadenza?.color}`}>
                              {scadenza && <scadenza.icon className="w-4 h-4" />}
                              {new Date(doc.data_scadenza).toLocaleDateString('it-IT')}
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {doc.file_uri ?
                            <a href={doc.file_uri} target="_blank" rel="noopener noreferrer"><FileCheck className="w-5 h-5 text-green-600" /></a>
                            : <span className="text-slate-400">-</span>}
                        </TableCell>
                        <TableCell>
                          {canEdit && <Button variant="outline" size="sm" onClick={() => handleEditDocumento(doc)}>Modifica</Button>}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              {documenti.length === 0 && <p className="text-center text-slate-500 p-8">Nessun documento aziendale presente.</p>}
            </CardContent>
          </Card>

          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingDocumento ? "Modifica Documento" : "Nuovo Documento Aziendale"}</DialogTitle>
              </DialogHeader>
              <DocumentoForm
                documento={editingDocumento}
                onSubmit={handleDocumentoSubmit}
                onCancel={() => setShowForm(false)}
                initialEntity={{
                  type: 'azienda',
                  id: azienda?.id,
                  name: azienda?.ragione_sociale
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </PermissionGuard>
  );
}