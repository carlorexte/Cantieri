import React, { useState, useEffect, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FileText, Filter, Eye, Download, Edit, Trash2, Tag, Building2, Calendar, Sparkles, Archive, History } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";

import DocumentoFormEnhanced from "../components/documenti/DocumentoFormEnhanced";
import RicercaAvanzataDocumenti from "../components/documenti/RicercaAvanzataDocumenti";
import DocumentViewer from "../components/documenti/DocumentViewer";

const categorieDocumenti = {
  permessi: { label: "Permessi", color: "bg-purple-100 text-purple-800" },
  contratti: { label: "Contratti", color: "bg-blue-100 text-blue-800" },
  polizze: { label: "Polizze", color: "bg-green-100 text-green-800" },
  certificazioni: { label: "Certificazioni", color: "bg-cyan-100 text-cyan-800" },
  fatture: { label: "Fatture", color: "bg-orange-100 text-orange-800" },
  sal: { label: "SAL", color: "bg-indigo-100 text-indigo-800" },
  sicurezza: { label: "Sicurezza", color: "bg-red-100 text-red-800" },
  tecnici: { label: "Doc. Tecnici", color: "bg-teal-100 text-teal-800" },
  foto: { label: "Foto", color: "bg-pink-100 text-pink-800" },
  corrispondenza: { label: "Corrispondenza", color: "bg-amber-100 text-amber-800" },
  legale: { label: "Legale", color: "bg-rose-100 text-rose-800" },
  altro: { label: "Altro", color: "bg-slate-100 text-slate-800" }
};

export default function DocumentiPage() {
  const [documenti, setDocumenti] = useState([]);
  const [cantieri, setCantieri] = useState([]);
  const [imprese, setImprese] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDocumento, setEditingDocumento] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState("");
  const [viewingDocument, setViewingDocument] = useState(null);
  const [showViewer, setShowViewer] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [documentiData, cantieriData, impreseData, user] = await Promise.all([
        base44.entities.Documento.list("-created_date", 100),
        base44.entities.Cantiere.list("-created_date", 100),
        base44.entities.Impresa.list("-created_date", 100),
        base44.auth.me()
      ]);
      setDocumenti(documentiData);
      setCantieri(cantieriData);
      setImprese(impreseData);
      setCurrentUser(user);
    } catch (error) {
      console.error("Errore caricamento dati:", error);
      toast.error("Errore durante il caricamento");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (documentoData) => {
    try {
      if (editingDocumento) {
        await base44.entities.Documento.update(editingDocumento.id, documentoData);
        toast.success("Documento aggiornato!");
      } else {
        await base44.entities.Documento.create(documentoData);
        toast.success("Documento creato!");
      }
      setShowForm(false);
      setEditingDocumento(null);
      loadData();
    } catch (error) {
      console.error("Errore salvataggio documento:", error);
      toast.error("Errore durante il salvataggio");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Sei sicuro di voler eliminare questo documento?")) {
      try {
        await base44.entities.Documento.delete(id);
        toast.success("Documento eliminato");
        loadData();
      } catch (error) {
        console.error("Errore eliminazione:", error);
        toast.error("Errore durante l'eliminazione");
      }
    }
  };

  const handleArchive = async (id) => {
    if (window.confirm("Sei sicuro di voler archiviare questo documento?")) {
      try {
        const { archiveDocument } = await import("@/functions/archiveDocument");
        await archiveDocument({ document_id: id });
        toast.success("Documento archiviato");
        loadData();
      } catch (error) {
        console.error("Errore archiviazione:", error);
        toast.error("Errore durante l'archiviazione");
      }
    }
  };

  const handleViewDocument = (doc) => {
    if (!doc.file_uri && !doc.cloud_file_url) {
      toast.info(`Documento disponibile solo sul NAS: ${doc.percorso_nas}`);
      return;
    }
    setViewingDocument(doc);
    setShowViewer(true);
  };

  // Unifica documenti standard e documenti "impliciti" dai cantieri
  const allDocuments = useMemo(() => {
    // 1. Documenti standard
    const standardDocs = documenti.map(d => ({ ...d, source: 'documento', readonly: false }));

    // 2. Documenti estratti dai cantieri
    const cantiereDocs = [];
    cantieri.forEach(c => {
      const add = (url, tipo, categoria, label, data, extraInfo = "") => {
        if (!url) return;
        // Genera un ID stabile basato su cantiere e tipo
        const safeUrlId = url.split('/').pop() || 'unknown';
        
        cantiereDocs.push({
          id: `virtual-${c.id}-${safeUrlId}`, 
          nome_documento: `${label} - ${c.denominazione}`,
          descrizione: `Documento estratto automaticamente dal cantiere: ${c.denominazione}. ${extraInfo}`,
          file_uri: url.startsWith('http') ? null : url,
          cloud_file_url: url.startsWith('http') ? url : null,
          categoria_principale: categoria,
          tipo_documento: tipo,
          data_emissione: data,
          entita_collegata_tipo: 'cantiere',
          entita_collegata_id: c.id,
          source: 'cantiere_field', // Flag per UI
          readonly: true, // Non modificabile/eliminabile da questa vista
          percorso_nas: "Allegato Cantiere"
        });
      };

      add(c.contratto_file_url, 'contratto_appalto', 'contratti', 'Contratto Appalto', c.contratto_data_firma);
      add(c.polizza_definitiva_url, 'polizze_decennale', 'polizze', 'Polizza Definitiva', null, `Scad: ${c.polizza_definitiva_scadenza || 'N/D'}`);
      add(c.polizza_car_url, 'polizze_car', 'polizze', 'Polizza CAR', null, `Scad: ${c.polizza_car_scadenza || 'N/D'}`);
      add(c.polizza_anticipazione_url, 'polizze_rct', 'polizze', 'Polizza Anticipazione', null, `Scad: ${c.polizza_anticipazione_scadenza || 'N/D'}`);
      add(c.verbale_inizio_lavori_url, 'cantiere_verbale_consegna', 'tecnici', 'Verbale Inizio Lavori', c.data_inizio);
      
      if (Array.isArray(c.verbali_consegna)) {
        c.verbali_consegna.forEach((url, idx) => {
             add(url, 'cantiere_verbale_consegna', 'tecnici', `Verbale Consegna ${idx+1}`, null);
        });
      }
    });

    return [...standardDocs, ...cantiereDocs];
  }, [documenti, cantieri]);

  const filteredDocumenti = useMemo(() => {
    let filtered = allDocuments;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.nome_documento?.toLowerCase().includes(term) ||
        doc.descrizione?.toLowerCase().includes(term) ||
        doc.numero_documento?.toLowerCase().includes(term) ||
        doc.testo_estratto?.toLowerCase().includes(term)
      );
    }

    if (categoriaFilter) {
      filtered = filtered.filter(doc => doc.categoria_principale === categoriaFilter);
    }

    return filtered;
  }, [allDocuments, searchTerm, categoriaFilter]);

  const stats = useMemo(() => {
    const byCategoria = {};
    allDocuments.forEach(doc => {
      const cat = doc.categoria_principale || 'altro';
      byCategoria[cat] = (byCategoria[cat] || 0) + 1;
    });
    
    return {
      totale: allDocuments.length,
      conOCR: allDocuments.filter(d => d.ocr_completato).length,
      byCategoria
    };
  }, [allDocuments]);

  const getEntitaCollegate = useCallback((documento) => {
    const entita = [];
    
    // Helper function to add entity
    const addEntita = (type, id) => {
      if (type === 'cantiere') {
        const c = cantieri.find(x => x.id === id);
        if (c) entita.push({ label: c.denominazione, type: 'Cantiere', icon: Building2 });
      } else if (type === 'azienda' || type === 'impresa' || type === 'subappalto') {
        const i = imprese.find(x => x.id === id);
        if (i) entita.push({ label: i.ragione_sociale, type: 'Impresa', icon: Building2 });
      } else if (type === 'generale') {
        entita.push({ label: 'Generale', type: 'Generale', icon: FileText });
      }
    };

    if (documento.entita_collegate?.length > 0) {
      documento.entita_collegate.forEach(e => addEntita(e.entita_tipo, e.entita_id));
    }
    
    // Legacy/Fallback check
    if (entita.length === 0 && documento.entita_collegata_tipo && documento.entita_collegata_id) {
      addEntita(documento.entita_collegata_tipo, documento.entita_collegata_id);
    }
    
    return entita;
  }, [cantieri, imprese]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Documenti</h1>
              <p className="text-slate-600 mt-1">Gestione centralizzata con OCR e categorizzazione automatica</p>
            </div>
            <Button 
              onClick={() => {
                setEditingDocumento(null);
                setShowForm(true);
              }} 
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nuovo Documento
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-slate-900">{stats.totale}</div>
                <div className="text-xs text-slate-600 mt-1">Totali</div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-indigo-600">{stats.conOCR}</div>
                <div className="text-xs text-slate-600 mt-1">Con OCR</div>
              </CardContent>
            </Card>
            {Object.entries(categorieDocumenti).slice(0, 4).map(([key, val]) => (
              <Card key={key} className="border-0 shadow-sm bg-white">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-slate-900">{stats.byCategoria[key] || 0}</div>
                  <div className="text-xs text-slate-600 mt-1">{val.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="tutti" className="space-y-6">
            <TabsList className="bg-white border border-slate-200">
              <TabsTrigger value="tutti">Tutti i Documenti</TabsTrigger>
              <TabsTrigger value="ricerca">
                <Search className="w-4 h-4 mr-2" />
                Ricerca Avanzata
              </TabsTrigger>
            </TabsList>

            {/* Tab Tutti Documenti */}
            <TabsContent value="tutti" className="space-y-6">
              {/* Filtri Rapidi */}
              <Card className="border-0 shadow-sm bg-white">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <Input
                        placeholder="Cerca documenti (anche nel testo estratto)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Tutte le categorie" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Tutte le categorie</SelectItem>
                        {Object.entries(categorieDocumenti).map(([key, val]) => (
                          <SelectItem key={key} value={key}>{val.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Lista Documenti */}
              <div className="grid gap-4">
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <Card key={i} className="animate-pulse border-0 shadow-sm bg-white">
                      <CardContent className="p-6">
                        <div className="h-6 bg-slate-200 rounded w-1/3 mb-2"></div>
                        <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  filteredDocumenti.map(doc => {
                    const entitaCollegate = getEntitaCollegate(doc);
                    
                    return (
                      <Card key={doc.id} className="border-0 shadow-sm hover:shadow-md transition-all bg-white">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <FileText className="w-5 h-5 text-slate-500" />
                                <h3 className="font-semibold text-slate-900 truncate">{doc.nome_documento}</h3>
                                {doc.categoria_principale && (
                                  <Badge variant="secondary" className={categorieDocumenti[doc.categoria_principale]?.color}>
                                  {categorieDocumenti[doc.categoria_principale]?.label}
                                  </Badge>
                                  )}
                                  {doc.readonly && (
                                  <Badge variant="outline" className="text-slate-500 border-slate-300">
                                  <Building2 className="w-3 h-3 mr-1" />
                                  Cantiere
                                  </Badge>
                                  )}
                                  {doc.ocr_completato && (
                                  <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                  <Sparkles className="w-3 h-3 mr-1" />
                                  OCR
                                  </Badge>
                                  )}
                                  {doc.versioni?.length > 0 && (
                                    <Badge variant="outline" className="text-slate-500 border-slate-300">
                                      <History className="w-3 h-3 mr-1" />
                                      v{doc.versioni.length + 1}
                                    </Badge>
                                  )}
                                  </div>
                              
                              {doc.descrizione && (
                                <p className="text-sm text-slate-600 mb-2 line-clamp-2">{doc.descrizione}</p>
                              )}
                              
                              <div className="flex flex-wrap gap-2 text-xs text-slate-500 mb-2">
                                {doc.data_emissione && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {format(new Date(doc.data_emissione), 'dd/MM/yyyy')}
                                  </span>
                                )}
                                {doc.data_scadenza && (
                                  <span className="text-amber-700">
                                    • Scad: {format(new Date(doc.data_scadenza), 'dd/MM/yyyy')}
                                  </span>
                                )}
                                {doc.emittente && (
                                  <span>• {doc.emittente}</span>
                                )}
                              </div>

                              {entitaCollegate.length > 0 && (
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="flex flex-wrap gap-1">
                                    {entitaCollegate.map((ent, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs flex items-center gap-1 bg-slate-50/50">
                                        <ent.icon className="w-3 h-3 text-slate-400" />
                                        <span className="text-slate-500">{ent.type}:</span>
                                        <span className="font-medium">{ent.label}</span>
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {doc.tags?.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {doc.tags.map(tag => (
                                    <Badge key={tag} variant="secondary" className="text-xs bg-slate-100 text-slate-700">
                                      <Tag className="w-3 h-3 mr-1" />
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="flex gap-2 flex-shrink-0">
                              {(doc.file_uri || doc.cloud_file_url) && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleViewDocument(doc)}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDownloadDocument(doc)}
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              {(currentUser?.role === 'admin' || currentUser?.perm_edit_documenti) && !doc.readonly && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setEditingDocumento(doc);
                                      setShowForm(true);
                                    }}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleArchive(doc.id)}
                                    className="hover:bg-amber-50 hover:text-amber-600"
                                    title="Archivia"
                                  >
                                    <Archive className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(doc.id)}
                                    className="hover:bg-red-50 hover:text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>

              {filteredDocumenti.length === 0 && !isLoading && (
                <Card className="border-0 shadow-sm bg-white">
                  <CardContent className="p-12 text-center">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Nessun documento trovato</h3>
                    <p className="text-slate-600">Inizia caricando il primo documento</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Tab Ricerca Avanzata */}
            <TabsContent value="ricerca">
              <RicercaAvanzataDocumenti 
                onDocumentoSelect={(doc) => {
                  setEditingDocumento(doc);
                  setShowForm(true);
                }}
              />
            </TabsContent>
          </Tabs>

          {/* Dialog Form */}
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingDocumento ? "Modifica Documento" : "Nuovo Documento"}
                </DialogTitle>
              </DialogHeader>
              <DocumentoFormEnhanced
                documento={editingDocumento}
                onSubmit={handleSubmit}
                onCancel={() => {
                  setShowForm(false);
                  setEditingDocumento(null);
                }}
              />
            </DialogContent>
          </Dialog>

          {/* Document Viewer */}
          <DocumentViewer
            documento={viewingDocument}
            isOpen={showViewer}
            onClose={() => {
              setShowViewer(false);
              setViewingDocument(null);
            }}
          />
        </div>
      </div>
    </div>
  );

  async function handleDownloadDocument(doc) {
    try {
      let url = doc.cloud_file_url;
      if (doc.file_uri) {
        const result = await base44.integrations.Core.CreateFileSignedUrl({
          file_uri: doc.file_uri,
          expires_in: 300
        });
        url = result.signed_url;
      }
      
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.nome_documento;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("Download avviato");
    } catch (error) {
      console.error("Errore download:", error);
      toast.error("Impossibile scaricare il documento");
    }
  }
}