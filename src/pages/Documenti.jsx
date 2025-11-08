
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FileText, Calendar, AlertTriangle, CheckCircle, Clock, Filter, FileCheck, Eye, Edit, Download, X, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

import DocumentoForm from "../components/documenti/DocumentoForm";

const tipoDocumentoLabels = {
  amministrativa_documentazione_gara: "Documentazione di Gara",
  amministrativa_inviti_bandi: "Inviti - Bandi",
  durc: "DURC",
  visure: "Visure",
  certificazioni_soa: "Certificazioni SOA",
  contratto_appalto: "Contratto Appalto",
  contratto_esecutrice: "Contratto Esecutrice",
  contratto_subappaltatori: "Contratto Subappaltatori",
  consortile: "Consortile",
  altro: "Altro"
};

export default function DocumentiPage() {
  const [documenti, setDocumenti] = useState([]);
  const [cantieri, setCantieri] = useState([]);
  const [soci, setSoci] = useState([]);
  const [subappalti, setSubappalti] = useState([]);
  const [imprese, setImprese] = useState([]); // New state
  const [salList, setSalList] = useState([]); // New state
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDocumento, setEditingDocumento] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("tutti");
  const [filtroScadenza, setFiltroScadenza] = useState("tutti");
  const [currentUser, setCurrentUser] = useState(null);
  
  const [viewingDocument, setViewingDocument] = useState(null);
  const [showViewer, setShowViewer] = useState(false);
  const [signedUrl, setSignedUrl] = useState(null);
  const [isLoadingViewer, setIsLoadingViewer] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [documentiData, cantieriData, sociData, subappaltiData, userData, impreseData, salData] = await Promise.all([
        base44.entities.Documento.list("-created_date"),
        base44.entities.Cantiere.list(),
        base44.entities.SocioConsorzio.list(),
        base44.entities.Subappalto.list(),
        base44.auth.me(),
        base44.entities.Impresa.list(),
        base44.entities.SAL.list()
      ]);
      setDocumenti(documentiData);
      setCantieri(cantieriData);
      setSoci(sociData);
      setSubappalti(subappaltiData);
      setCurrentUser(userData);
      setImprese(impreseData);
      setSalList(salData);
    } catch (error) {
      console.error("Errore caricamento dati:", error);
    }
    setIsLoading(false);
  };

  const handleSubmit = async (documentoData) => {
    try {
      if (editingDocumento) {
        await base44.entities.Documento.update(editingDocumento.id, documentoData);
      } else {
        await base44.entities.Documento.create(documentoData);
      }
      setShowForm(false);
      setEditingDocumento(null);
      loadData();
    } catch (error) {
      console.error("Errore salvataggio documento:", error);
    }
  };

  const handleEdit = (documento) => {
    setEditingDocumento(documento);
    setShowForm(true);
  };

  const handleDelete = async (documento) => {
    if (window.confirm(`Sei sicuro di voler eliminare il documento "${documento.nome_documento}"? Questa azione non può essere annullata.`)) {
      try {
        await base44.entities.Documento.delete(documento.id);
        toast.success("Documento eliminato con successo");
        loadData();
      } catch (error) {
        console.error("Errore eliminazione documento:", error);
        toast.error("Errore durante l'eliminazione del documento");
      }
    }
  };

  const getFileType = (fileName) => {
    if (!fileName) return 'unknown';
    const cleanName = fileName.split('?')[0].split('#')[0];
    const extension = cleanName.split('.').pop().toLowerCase();
    if (['pdf'].includes(extension)) return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension)) return 'image';
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension)) return 'office';
    return 'other';
  };

  const handleViewDocument = async (documento) => {
    if (documento.file_uri) {
      setIsLoadingViewer(true);
      setViewingDocument(documento);
      setShowViewer(true);
      setSignedUrl(null);
      
      try {
        const result = await base44.integrations.Core.CreateFileSignedUrl({ 
          file_uri: documento.file_uri,
          expires_in: 3600
        });
        setSignedUrl(result.signed_url);
      } catch (error) {
        console.error("Errore generazione signed URL:", error);
        toast.error("Impossibile caricare il documento per la visualizzazione");
        setShowViewer(false);
        setViewingDocument(null);
      } finally {
        setIsLoadingViewer(false);
      }
    } else if (documento.cloud_file_url) {
      setViewingDocument(documento);
      setSignedUrl(documento.cloud_file_url);
      setShowViewer(true);
    } else {
      toast.info(`Documento disponibile solo sul NAS al percorso: ${documento.percorso_nas}`, {
        duration: 5000
      });
    }
  };

  const handleDownloadDocument = async (documento) => {
    if (documento.file_uri) {
      try {
        const result = await base44.integrations.Core.CreateFileSignedUrl({ 
          file_uri: documento.file_uri,
          expires_in: 300
        });
        const a = document.createElement('a');
        a.href = result.signed_url;
        a.download = documento.nome_documento;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (error) {
        console.error("Errore download documento:", error);
        toast.error("Impossibile scaricare il documento");
      }
    } else if (documento.cloud_file_url) {
      const a = document.createElement('a');
      a.href = documento.cloud_file_url;
      a.download = documento.nome_documento;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      toast.info(`Documento disponibile solo sul NAS al percorso: ${documento.percorso_nas}`, {
        duration: 5000
      });
    }
  };

  const getEntitaNome = (documento) => {
    if (!documento.entita_collegata_id) return "Generale";
    
    switch (documento.entita_collegata_tipo) {
      case "cantiere":
        const cantiere = cantieri.find(c => c.id === documento.entita_collegata_id);
        return cantiere ? `Cantiere: ${cantiere.denominazione}` : "Cantiere non trovato";
      case "socio_consorzio":
        const socio = soci.find(s => s.id === documento.entita_collegata_id);
        return socio ? `Socio: ${socio.ragione_sociale}` : "Socio non trovato";
      case "subappalto":
        const subappalto = subappalti.find(s => s.id === documento.entita_collegata_id);
        return subappalto ? `Subappalto: ${subappalto.ragione_sociale}` : "Subappalto non trovato";
      case "azienda":
        const impresa = imprese.find(i => i.id === documento.entita_collegata_id);
        return impresa ? `Impresa: ${impresa.ragione_sociale}` : "Impresa non trovata";
      case "sal":
        const sal = salList.find(s => s.id === documento.entita_collegata_id);
        if (sal) {
          const cant = cantieri.find(c => c.id === sal.cantiere_id);
          return `SAL ${sal.numero_sal || 'Anticipo'} - ${cant ? cant.denominazione : 'Cantiere'}`;
        }
        return "SAL non trovato";
      default:
        return "Generale";
    }
  };

  const getScadenzaStatus = (dataScadenza) => {
    if (!dataScadenza) return null;
    
    const oggi = new Date();
    const scadenza = new Date(dataScadenza);
    const differenzaGiorni = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
    
    if (differenzaGiorni < 0) {
      return { status: "scaduto", label: "Scaduto", color: "bg-red-100 text-red-800", icon: AlertTriangle };
    } else if (differenzaGiorni <= 30) {
      return { status: "in_scadenza", label: "In scadenza", color: "bg-amber-100 text-amber-800", icon: Clock };
    } else {
      return { status: "valido", label: "Valido", color: "bg-emerald-100 text-emerald-800", icon: CheckCircle };
    }
  };

  const filteredDocumenti = documenti.filter(doc => {
    const matchSearch = !searchTerm || 
      doc.nome_documento.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.descrizione?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.numero_documento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getEntitaNome(doc).toLowerCase().includes(searchTerm.toLowerCase());

    const matchTipo = filtroTipo === "tutti" || doc.tipo_documento === filtroTipo;
    
    const matchScadenza = filtroScadenza === "tutti" || (() => {
      const scadenzaStatus = getScadenzaStatus(doc.data_scadenza);
      return scadenzaStatus ? scadenzaStatus.status === filtroScadenza : filtroScadenza === "senza_scadenza";
    })();

    return matchSearch && matchTipo && matchScadenza;
  });

  const stats = {
    totale: documenti.length,
    scaduti: documenti.filter(d => getScadenzaStatus(d.data_scadenza)?.status === "scaduto").length,
    inScadenza: documenti.filter(d => getScadenzaStatus(d.data_scadenza)?.status === "in_scadenza").length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Gestione Documenti</h1>
              <p className="text-slate-600 mt-1">Archivio documentale e scadenziario cantieri</p>
            </div>
            {(currentUser?.role === 'admin' || currentUser?.perm_edit_documenti) && (
              <Button onClick={() => setShowForm(true)} className="bg-indigo-600 hover:bg-indigo-700 shadow-sm h-10">
                <Plus className="w-4 h-4 mr-2" />
                Nuovo Documento
              </Button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-slate-900">{stats.totale}</div>
                    <div className="text-sm text-slate-600 mt-1">Documenti Totali</div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-red-600">{stats.scaduti}</div>
                    <div className="text-sm text-slate-600 mt-1">Scaduti</div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-amber-600">{stats.inScadenza}</div>
                    <div className="text-sm text-slate-600 mt-1">In Scadenza (30gg)</div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-emerald-600">{stats.totale - stats.scaduti - stats.inScadenza}</div>
                    <div className="text-sm text-slate-600 mt-1">Validi</div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtri */}
          <Card className="border-0 shadow-sm mb-6 bg-white">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Cerca documenti..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10 border-slate-200"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                    <SelectTrigger className="w-48 h-10 border-slate-200">
                      <SelectValue placeholder="Filtra per tipo..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tutti">Tutti i tipi</SelectItem>
                      <SelectItem value="durc">DURC</SelectItem>
                      <SelectItem value="visure">Visure</SelectItem>
                      <SelectItem value="certificazioni_soa">Certificazioni SOA</SelectItem>
                      <SelectItem value="contratto_appalto">Contratto Appalto</SelectItem>
                      <SelectItem value="consortile">Consortile</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filtroScadenza} onValueChange={setFiltroScadenza}>
                    <SelectTrigger className="w-40 h-10 border-slate-200">
                      <SelectValue placeholder="Scadenze..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tutti">Tutte</SelectItem>
                      <SelectItem value="scaduto">Scaduti</SelectItem>
                      <SelectItem value="in_scadenza">In scadenza</SelectItem>
                      <SelectItem value="valido">Validi</SelectItem>
                      <SelectItem value="senza_scadenza">Senza scadenza</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabella Documenti */}
          <Card className="border-0 shadow-sm bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 border-b border-slate-200">
                    <TableHead className="font-semibold text-slate-700">Nome Documento</TableHead>
                    <TableHead className="font-semibold text-slate-700">Tipo</TableHead>
                    <TableHead className="font-semibold text-slate-700">Collegato a</TableHead>
                    <TableHead className="font-semibold text-slate-700">Data Emissione</TableHead>
                    <TableHead className="font-semibold text-slate-700">Scadenza</TableHead>
                    <TableHead className="text-center font-semibold text-slate-700">Cloud</TableHead>
                    <TableHead className="text-right font-semibold text-slate-700">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array(5).fill(0).map((_, i) => (
                      <TableRow key={i} className="animate-pulse">
                        <TableCell><div className="h-4 bg-slate-200 rounded w-full"></div></TableCell>
                        <TableCell><div className="h-4 bg-slate-200 rounded w-full"></div></TableCell>
                        <TableCell><div className="h-4 bg-slate-200 rounded w-full"></div></TableCell>
                        <TableCell><div className="h-4 bg-slate-200 rounded w-full"></div></TableCell>
                        <TableCell><div className="h-4 bg-slate-200 rounded w-full"></div></TableCell>
                        <TableCell><div className="h-4 bg-slate-200 rounded w-full"></div></TableCell>
                        <TableCell><div className="h-4 bg-slate-200 rounded w-full"></div></TableCell>
                      </TableRow>
                    ))
                  ) : filteredDocumenti.map(documento => {
                    const scadenzaStatus = getScadenzaStatus(documento.data_scadenza);
                    const StatusIcon = scadenzaStatus?.icon;
                    const hasFile = documento.file_uri || documento.cloud_file_url;
                    
                    return (
                      <TableRow key={documento.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <TableCell className="font-medium text-slate-900">
                          <div>
                            <div className="font-medium">{documento.nome_documento}</div>
                            {documento.numero_documento && (
                              <div className="text-sm text-slate-500 mt-0.5">N. {documento.numero_documento}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-700">
                            {tipoDocumentoLabels[documento.tipo_documento] || documento.tipo_documento}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">{getEntitaNome(documento)}</TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {documento.data_emissione ? new Date(documento.data_emissione).toLocaleDateString('it-IT') : '-'}
                        </TableCell>
                        <TableCell>
                          {documento.data_scadenza ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-slate-600">{new Date(documento.data_scadenza).toLocaleDateString('it-IT')}</span>
                              {scadenzaStatus && StatusIcon && (
                                <Badge variant="secondary" className={`${scadenzaStatus.color} border text-xs`}>
                                  <StatusIcon className="w-3 h-3 mr-1" />
                                  {scadenzaStatus.label}
                                </Badge>
                              )}
                            </div>
                          ) : <span className="text-sm text-slate-400">-</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          {hasFile ? (
                            <FileCheck className="w-4 h-4 text-emerald-600 mx-auto" title="Backup disponibile su cloud" />
                          ) : (
                            <span className="text-slate-300 text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-end">
                            {hasFile && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8 hover:bg-indigo-50 hover:text-indigo-600"
                                  onClick={() => handleViewDocument(documento)}
                                  title="Visualizza documento"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600"
                                  onClick={() => handleDownloadDocument(documento)}
                                  title="Scarica documento"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {(currentUser?.role === 'admin' || currentUser?.perm_edit_documenti) && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8 hover:bg-slate-100 hover:text-slate-900"
                                onClick={() => handleEdit(documento)} 
                                title="Modifica documento"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                            {currentUser?.role === 'admin' && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                                onClick={() => handleDelete(documento)} 
                                title="Elimina documento"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {filteredDocumenti.length === 0 && !isLoading && (
              <div className="text-center p-12 text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-semibold">Nessun documento trovato</p>
                <p className="text-sm mt-1">Inizia caricando il primo documento.</p>
              </div>
            )}
          </Card>

          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingDocumento ? "Modifica Documento" : "Nuovo Documento"}
                </DialogTitle>
              </DialogHeader>
              <DocumentoForm
                documento={editingDocumento}
                cantieri={cantieri}
                soci={soci}
                subappalti={subappalti}
                imprese={imprese} // Pass new data to DocumentoForm
                salList={salList}   // Pass new data to DocumentoForm
                onSubmit={handleSubmit}
                onCancel={() => {
                  setShowForm(false);
                  setEditingDocumento(null);
                }}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={showViewer} onOpenChange={(open) => {
            setShowViewer(open);
            if (!open) {
              setViewingDocument(null);
              setSignedUrl(null);
            }
          }}>
            <DialogContent className="max-w-6xl h-[90vh] p-0 flex flex-col overflow-hidden">
              <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-lg font-semibold truncate pr-4">
                    {viewingDocument?.nome_documento}
                  </DialogTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowViewer(false);
                      setViewingDocument(null);
                      setSignedUrl(null);
                    }}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </DialogHeader>
              <div className="flex-1 w-full h-full min-h-0">
                {isLoadingViewer ? (
                  <div className="w-full h-full flex items-center justify-center bg-slate-50">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-slate-600">Caricamento documento...</p>
                    </div>
                  </div>
                ) : signedUrl ? (
                  <>
                    {getFileType(viewingDocument?.nome_documento) === 'pdf' && (
                      <iframe
                        src={`https://docs.google.com/viewer?url=${encodeURIComponent(signedUrl)}&embedded=true`}
                        className="w-full h-full border-0"
                        title={viewingDocument?.nome_documento}
                        allowFullScreen
                      />
                    )}
                    {getFileType(viewingDocument?.nome_documento) === 'image' && (
                      <div className="w-full h-full flex items-center justify-center bg-slate-50 p-4 overflow-auto">
                        <img
                          src={signedUrl}
                          alt={viewingDocument?.nome_documento}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    )}
                    {getFileType(viewingDocument?.nome_documento) === 'office' && (
                      <iframe
                        src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signedUrl)}`}
                        className="w-full h-full border-0"
                        title={viewingDocument?.nome_documento}
                        allowFullScreen
                      />
                    )}
                    {getFileType(viewingDocument?.nome_documento) === 'other' && (
                      <iframe
                        src={`https://docs.google.com/viewer?url=${encodeURIComponent(signedUrl)}&embedded=true`}
                        className="w-full h-full border-0"
                        title={viewingDocument?.nome_documento}
                        allowFullScreen
                      />
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-50">
                    <p className="text-slate-500">Errore nel caricamento del documento</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
