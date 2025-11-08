
import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, CheckCircle, Clock, TrendingUp, DollarSign, ArrowLeft, X, ExternalLink } from "lucide-react";
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
import SalForm from "../components/sal/SalForm";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Toaster, toast } from 'react-hot-toast';

const statoPagamentoColori = {
  da_fatturare: "bg-blue-50 text-blue-700 border-blue-200",
  fatturato: "bg-amber-50 text-amber-700 border-amber-200",
  incassato: "bg-emerald-50 text-emerald-700 border-emerald-200"
};

const tipoPrestazioneLabels = {
  lavori: "Lavori",
  progettazione: "Progettazione"
};

const tipoSalLabels = {
  anticipazione: "Anticipazione",
  sal_progressivo: "SAL",
  sal_finale: "SAL Finale"
};

export default function SalPage() {
  const [salList, setSalList] = useState([]);
  const [cantieri, setCantieri] = useState([]);
  const [selectedCantiereId, setSelectedCantiereId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [documentiDialog, setDocumentiDialog] = useState(false);
  const [selectedSal, setSelectedSal] = useState(null);
  const [documentiSal, setDocumentiSal] = useState([]);
  const [loadingDocumenti, setLoadingDocumenti] = useState(false);
  // NUOVO: stato per il visualizzatore
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState(null);
  const [viewerFileName, setViewerFileName] = useState('');
  const [loadingViewer, setLoadingViewer] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [salData, cantieriData, user] = await Promise.all([
        base44.entities.SAL.list("-data_sal"),
        base44.entities.Cantiere.list(),
        base44.auth.me()
      ]);
      setSalList(salData);
      setCantieri(cantieriData);
      setCurrentUser(user);
      
      const urlParams = new URLSearchParams(window.location.search);
      const cantiereIdFromUrl = urlParams.get('cantiere_id');
      
      if (cantiereIdFromUrl && cantieriData.find(c => c.id === cantiereIdFromUrl)) {
        setSelectedCantiereId(cantiereIdFromUrl);
      } else if (cantieriData.length > 0 && !selectedCantiereId) {
        setSelectedCantiereId(cantieriData[0].id);
      }
    } catch (error) {
      console.error("Errore caricamento dati:", error);
      toast.error("Errore durante il caricamento dei dati.");
    }
    setIsLoading(false);
  }, [selectedCantiereId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (salData) => {
    try {
      await base44.entities.SAL.create(salData);
      setShowForm(false);
      loadData();
      toast.success("SAL salvato con successo!");
    } catch (error) {
      console.error("Errore salvataggio SAL:", error);
      toast.error("Errore durante il salvataggio del SAL");
    }
  };

  const handleOpenDocumentiDialog = async (e, sal) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    
    setSelectedSal(sal);
    setDocumentiDialog(true);
    
    setLoadingDocumenti(true);
    try {
      const docs = await base44.entities.Documento.filter({ 
        entita_collegata_id: sal.cantiere_id,
        entita_collegata_tipo: 'cantiere',
        tipo_documento: 'economica_sal'
      });
      setDocumentiSal(docs);
    } catch (error) {
      console.error("Errore caricamento documenti:", error);
      toast.error("Errore durante il caricamento dei documenti");
      setDocumentiSal([]);
    }
    setLoadingDocumenti(false);
  };

  const handleViewFile = async (fileUri, fileName) => {
    setLoadingViewer(true);
    setViewerFileName(fileName);
    setViewerUrl(null); // Reset URL to prevent old content from flashing
    setViewerOpen(true);
    
    try {
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ 
        file_uri: fileUri,
        expires_in: 3600
      });
      setViewerUrl(signed_url);
    } catch (error) {
      console.error("Errore apertura documento:", error);
      toast.error("Impossibile aprire il documento");
      setViewerOpen(false); // Close viewer on error
    } finally {
      setLoadingViewer(false);
    }
  };

  const getFileType = (fileName) => {
    if (!fileName) return 'pdf'; // Default to PDF if no filename
    const ext = fileName.split('.').pop().toLowerCase();
    if (['pdf'].includes(ext)) return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
    return 'pdf'; // Default to PDF for unknown types
  };

  const selectedCantiere = cantieri.find(c => c.id === selectedCantiereId);
  
  const filteredSal = selectedCantiereId
    ? salList.filter(s => s.cantiere_id === selectedCantiereId)
    : [];

  const stats = filteredSal.reduce((acc, sal) => {
    if (sal.tipo_sal_dettaglio !== 'anticipazione') {
      acc.totaleCertificato += sal.importo_lordo || sal.importo_sal || 0;
    }
    return acc;
  }, { totaleCertificato: 0 });

  const daCertificare = (selectedCantiere?.importo_contratto || 0) - stats.totaleCertificato;
  
  // FIX: Limita l'avanzamento al 100%
  const percentualeCompletamento = selectedCantiere?.importo_contratto 
    ? Math.min(Math.round((stats.totaleCertificato / selectedCantiere.importo_contratto) * 100), 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Toaster />
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div className="flex-1">
              {selectedCantiereId && (
                <Link to={createPageUrl(`CantiereDashboard?id=${selectedCantiereId}`)}>
                  <Button variant="outline" className="mb-3 border-slate-200 hover:bg-slate-50">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Torna al Cantiere
                  </Button>
                </Link>
              )}
              <h1 className="text-3xl font-bold text-slate-900">Stato Avanzamento Lavori</h1>
              {selectedCantiere ? (
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200">
                    <FileText className="w-4 h-4" />
                    <span className="font-medium">{selectedCantiere.denominazione}</span>
                  </span>
                  {selectedCantiere.codice_cig && (
                    <span className="text-sm text-slate-500">CIG: {selectedCantiere.codice_cig}</span>
                  )}
                </div>
              ) : (
                <p className="text-slate-600 mt-1">Seleziona un cantiere per visualizzare i SAL</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <Select value={selectedCantiereId || ''} onValueChange={setSelectedCantiereId}>
                <SelectTrigger className="w-64 h-10 border-slate-200">
                  <SelectValue placeholder="Seleziona cantiere..." />
                </SelectTrigger>
                <SelectContent>
                  {cantieri.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.denominazione}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(currentUser?.role === 'admin' || currentUser?.perm_edit_sal) && (
                <Button onClick={() => setShowForm(true)} className="bg-indigo-600 hover:bg-indigo-700 shadow-sm h-10" disabled={!selectedCantiereId}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuovo SAL
                </Button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Importo Contratto</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      € {(selectedCantiere?.importo_contratto || 0).toLocaleString('it-IT')}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-indigo-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Totale Certificato</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">
                      € {stats.totaleCertificato.toLocaleString('it-IT')}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Da Certificare</p>
                    <p className="text-2xl font-bold text-amber-600 mt-1">
                      € {daCertificare.toLocaleString('it-IT')}
                    </p>
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
                    <p className="text-sm font-medium text-slate-500">Avanzamento</p>
                    <p className="text-2xl font-bold text-cyan-600 mt-1">
                      {percentualeCompletamento}%
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-cyan-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabella SAL */}
          <Card className="border-0 shadow-sm bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 border-b border-slate-200">
                    <TableHead className="font-semibold text-slate-700">Tipo</TableHead>
                    <TableHead className="font-semibold text-slate-700">SAL n.</TableHead>
                    <TableHead className="font-semibold text-slate-700">Data</TableHead>
                    <TableHead className="font-semibold text-slate-700">Descrizione</TableHead>
                    <TableHead className="font-semibold text-slate-700">Prestazione</TableHead>
                    <TableHead className="text-center font-semibold text-slate-700">Stato</TableHead>
                    <TableHead className="font-semibold text-slate-700">Documento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array(3).fill(0).map((_, i) => (
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
                  ) : filteredSal.map(sal => {
                    const isAnticipo = sal.tipo_sal_dettaglio === 'anticipazione';
                    const hasDocument = sal.file_uri || sal.certificato_url;
                    
                    return (
                      <TableRow 
                        key={sal.id} 
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => window.location.href = createPageUrl(`SALDashboard?id=${sal.id}`)}
                      >
                        <TableCell>
                          <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                            {tipoSalLabels[sal.tipo_sal_dettaglio] || sal.tipo_sal_dettaglio}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-slate-900">
                          {sal.tipo_sal_dettaglio === 'sal_progressivo' || sal.tipo_sal_dettaglio === 'sal_finale' ? sal.numero_sal : '-'}
                        </TableCell>
                        <TableCell className="text-slate-600 text-sm">
                          {new Date(sal.data_sal).toLocaleDateString('it-IT')}
                        </TableCell>
                        <TableCell className="text-slate-600 text-sm max-w-xs truncate">
                          {sal.descrizione || '-'}
                        </TableCell>
                        <TableCell className="text-slate-600 text-sm">
                          {tipoPrestazioneLabels[sal.tipo_prestazione] || sal.tipo_prestazione}
                        </TableCell>
                        <TableCell className="text-center">
                          {!isAnticipo && (
                            <Badge variant="secondary" className={`${statoPagamentoColori[sal.stato_pagamento]} border capitalize text-xs`}>
                              {sal.stato_pagamento.replace('_', ' ')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {hasDocument ? (
                            <button
                              type="button"
                              className="text-indigo-600 hover:text-indigo-700 font-medium text-sm underline cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDocumentiDialog(e, sal);
                              }}
                            >
                              Visualizza
                            </button>
                          ) : (
                            <span className="text-slate-400 text-sm">Non caricato</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {filteredSal.length === 0 && !isLoading && (
              <div className="text-center p-12 text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-semibold">Nessun SAL registrato</p>
                <p className="text-sm mt-1">Inizia aggiungendo il primo SAL per questo cantiere</p>
              </div>
            )}
          </Card>

          {/* Dialog Form */}
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nuovo SAL</DialogTitle>
              </DialogHeader>
              <SalForm 
                cantiereId={selectedCantiereId}
                onSubmit={handleSubmit}
                onCancel={() => setShowForm(false)}
              />
            </DialogContent>
          </Dialog>

          {/* Dialog Documenti */}
          {documentiDialog && selectedSal && !viewerOpen && ( // Only show if viewer is not open
            <>
              <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setDocumentiDialog(false)} />
              
              <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl">
                <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
                  <h2 className="text-xl font-semibold">Documenti SAL</h2>
                  <button onClick={() => setDocumentiDialog(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-6 space-y-3">
                  {selectedSal.file_uri && (
                    <Card className="border-indigo-200 bg-indigo-50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText className="w-8 h-8 text-indigo-600" />
                            <div>
                              <p className="font-semibold text-slate-900">Certificato SAL</p>
                              <p className="text-sm text-slate-600">
                                SAL n. {selectedSal.tipo_sal_dettaglio === 'anticipazione' ? 'Anticipazione' : selectedSal.numero_sal} - {new Date(selectedSal.data_sal).toLocaleDateString('it-IT')}
                              </p>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleViewFile(selectedSal.file_uri, `SAL_${selectedSal.numero_sal || 'Anticipo'}_${new Date(selectedSal.data_sal).toLocaleDateString('it-IT')}.pdf`)}
                            className="bg-indigo-600 hover:bg-indigo-700"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Apri
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {loadingDocumenti && (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                      <p className="text-sm text-slate-600 mt-2">Caricamento documenti...</p>
                    </div>
                  )}

                  {!loadingDocumenti && documentiSal.length > 0 && (
                    <>
                      <div className="pt-2">
                        <h3 className="text-sm font-semibold text-slate-700 mb-2">Altri documenti SAL del cantiere</h3>
                      </div>
                      {documentiSal.map(doc => (
                        <Card key={doc.id} className="border-slate-200">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <FileText className="w-6 h-6 text-slate-600" />
                                <div>
                                  <p className="font-medium text-slate-900">{doc.nome_documento}</p>
                                  {doc.descrizione && (
                                    <p className="text-sm text-slate-500">{doc.descrizione}</p>
                                  )}
                                </div>
                              </div>
                              {doc.file_uri && (
                                <Button
                                  variant="outline"
                                  onClick={() => handleViewFile(doc.file_uri, doc.nome_documento)}
                                >
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  Apri
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </>
                  )}

                  {!loadingDocumenti && !selectedSal.file_uri && documentiSal.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Nessun documento disponibile per questo SAL</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* VISUALIZZATORE A TUTTO SCHERMO */}
          {viewerOpen && (
            <>
              <div className="fixed inset-0 bg-black/80 z-[60]" onClick={() => setViewerOpen(false)} />
              
              <div className="fixed inset-4 z-[60] bg-white rounded-lg shadow-2xl flex flex-col">
                <div className="flex items-center justify-between p-4 border-b bg-white">
                  <h2 className="text-lg font-semibold truncate">{viewerFileName}</h2>
                  <button
                    onClick={() => setViewerOpen(false)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex-1 min-h-0">
                  {loadingViewer ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <p className="text-slate-600">Caricamento documento...</p>
                      </div>
                    </div>
                  ) : viewerUrl ? (
                    <>
                      {getFileType(viewerFileName) === 'pdf' ? (
                        <iframe
                          src={`https://docs.google.com/viewer?url=${encodeURIComponent(viewerUrl)}&embedded=true`}
                          className="w-full h-full border-0"
                          title={viewerFileName}
                          loading="lazy"
                        />
                      ) : getFileType(viewerFileName) === 'image' ? (
                        <div className="w-full h-full flex items-center justify-center p-4 overflow-auto bg-slate-50">
                          <img
                            src={viewerUrl}
                            alt={viewerFileName}
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <p className="text-slate-500">Tipo di file non supportato per la visualizzazione in-app.</p>
                          <Button 
                            variant="outline" 
                            className="ml-4" 
                            onClick={() => window.open(viewerUrl, '_blank')}
                          >
                            Apri in nuova scheda
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <p className="text-slate-500">Errore nel caricamento del documento</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
