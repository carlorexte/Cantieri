
import React, { useState, useEffect } from 'react';
import { Impresa } from '@/entities/Impresa';
import { PersonaEsterna } from '@/entities/PersonaEsterna';
import { Cantiere } from '@/entities/Cantiere';
import { Subappalto } from '@/entities/Subappalto';
import { Documento } from '@/entities/Documento';
import { CreateFileSignedUrl } from '@/integrations/Core';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Building2, Briefcase, FileText, Phone, Mail, MapPin, Building, PlusCircle, Eye, Download, X, User, AlertTriangle, Clock, CheckCircle, Edit, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

import DocumentoForm from '../components/documenti/DocumentoForm';

const DetailField = ({ label, value, icon: Icon }) => (
  <div className="flex items-start gap-3">
    {Icon && <Icon className="w-5 h-5 text-blue-600 mt-0.5" />}
    <div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="font-medium text-slate-800">{value || 'N/D'}</p>
    </div>
  </div>
);

export default function ImpresaDashboardPage() {
  const [impresa, setImpresa] = useState(null);
  const [referenteImpresa, setReferenteImpresa] = useState(null);
  const [responsabileSicurezza, setResponsabileSicurezza] = useState(null);
  const [cantieriAssociati, setCantieriAssociati] = useState([]);
  const [documenti, setDocumenti] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDocumentoForm, setShowDocumentoForm] = useState(false);
  const [editingDocumento, setEditingDocumento] = useState(null);
  
  // Stati per il visualizzatore
  const [viewingDocument, setViewingDocument] = useState(null);
  const [showViewer, setShowViewer] = useState(false);
  const [signedUrl, setSignedUrl] = useState(null);
  const [isLoadingViewer, setIsLoadingViewer] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (id) {
      loadData(id);
    } else {
      setIsLoading(false);
    }
  }, []);

  const loadData = async (impresaId) => {
    setIsLoading(true);
    try {
      const [impresaData, cantieriData, subappaltiData, documentiData] = await Promise.all([
        Impresa.get(impresaId),
        Cantiere.list(),
        Subappalto.list(),
        Documento.filter({ entita_collegata_tipo: 'azienda' })
      ]);

      setImpresa(impresaData);

      // Carica PersoneEsterne se ci sono ID
      if (impresaData.referente_impresa_id) {
        try {
          const refData = await PersonaEsterna.get(impresaData.referente_impresa_id);
          setReferenteImpresa(refData);
        } catch (error) {
          console.error("Errore caricamento referente impresa:", error);
        }
      }

      if (impresaData.responsabile_sicurezza_id) {
        try {
          const respData = await PersonaEsterna.get(impresaData.responsabile_sicurezza_id);
          setResponsabileSicurezza(respData);
        } catch (error) {
          console.error("Errore caricamento responsabile sicurezza:", error);
        }
      }

      // Filtra documenti dell'impresa
      const docImpresa = documentiData.filter(doc => doc.entita_collegata_id === impresaId);
      setDocumenti(docImpresa);

      // Cerca l'impresa nei cantieri
      const cantieriConTipologia = cantieriData
        .map(cantiere => {
          const tipologie = [];

          // Verifica se è partner consorziato
          if (cantiere.partner_consorziati) {
            const isPartner = cantiere.partner_consorziati.some(
              p => p.ragione_sociale?.toLowerCase().includes(impresaData.ragione_sociale?.toLowerCase())
            );
            if (isPartner) {
              tipologie.push(cantiere.tipologia_azienda_appaltatrice || 'Partner');
            }
          }

          // Verifica se è azienda appaltatrice principale
          if (cantiere.azienda_appaltatrice_ragione_sociale?.toLowerCase().includes(impresaData.ragione_sociale?.toLowerCase())) {
            tipologie.push('Appaltatrice Principale');
          }

          // Verifica se è subappaltatore
          const subappalto = subappaltiData.find(
            s => s.cantiere_id === cantiere.id &&
            (s.ragione_sociale?.toLowerCase().includes(impresaData.ragione_sociale?.toLowerCase()) ||
             s.impresa_id === impresaId)
          );
          if (subappalto) {
            tipologie.push('Subappaltatore');
          }

          if (tipologie.length > 0) {
            return { ...cantiere, tipologie };
          }
          return null;
        })
        .filter(c => c !== null);

      setCantieriAssociati(cantieriConTipologia);
    } catch (error) {
      console.error("Errore nel caricamento dei dati dell'impresa:", error);
    }
    setIsLoading(false);
  };

  const handleDocumentoSubmit = async (formData) => {
    try {
      if (!impresa || !impresa.id) {
        console.error("Impresa ID non disponibile per l'associazione del documento.");
        toast.error("Errore: ID impresa non disponibile.");
        return;
      }
      
      if (editingDocumento) {
        await Documento.update(editingDocumento.id, formData);
        toast.success("Documento aggiornato con successo");
      } else {
        await Documento.create({
          ...formData,
          entita_collegata_id: impresa.id,
          entita_collegata_tipo: 'azienda',
        });
        toast.success("Documento creato con successo");
      }
      
      setShowDocumentoForm(false);
      setEditingDocumento(null);
      loadData(impresa.id);
    } catch (error) {
      console.error("Errore nel salvataggio del documento:", error);
      toast.error("Errore durante il salvataggio del documento: " + error.message);
    }
  };

  const handleEditDocumento = (documento) => {
    setEditingDocumento(documento);
    setShowDocumentoForm(true);
  };

  const handleDeleteDocumento = async (documento) => {
    if (window.confirm(`Sei sicuro di voler eliminare "${documento.nome_documento}"?`)) {
      try {
        await Documento.delete(documento.id);
        toast.success("Documento eliminato con successo");
        loadData(impresa.id);
      } catch (error) {
        console.error("Errore eliminazione documento:", error);
        toast.error("Errore durante l'eliminazione del documento: " + error.message);
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
        const result = await CreateFileSignedUrl({ 
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
        const result = await CreateFileSignedUrl({ 
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

  if (isLoading) {
    return <div className="p-6">Caricamento...</div>;
  }

  if (!impresa) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl">Impresa non trovata.</h2>
        <Link to={createPageUrl('Imprese')}>
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Torna alle Imprese
          </Button>
        </Link>
      </div>
    );
  }

  const tipologiaColors = {
    'Appaltatrice Principale': 'bg-blue-100 text-blue-800',
    'Partner': 'bg-purple-100 text-purple-800',
    'Subappaltatore': 'bg-orange-100 text-orange-800',
    'mandataria': 'bg-green-100 text-green-800',
    'mandante': 'bg-teal-100 text-teal-800',
    'consortile': 'bg-indigo-100 text-indigo-800',
    'singola': 'bg-slate-100 text-slate-800',
    'socio': 'bg-pink-100 text-pink-800',
    'subaffidatario': 'bg-amber-100 text-amber-800'
  };

  const tipoDocumentoLabels = {
    durc: "DURC",
    visure: "Visure",
    visure_cciaa: "Certificato CCIAA",
    certificazioni_soa: "Certificazioni SOA",
    denuncia_inail: "Denuncia INAIL",
    contratto_appalto: "Contratto Appalto",
    contratto_esecutrice: "Contratto Esecutrice",
    contratto_subappaltatori: "Contratto Subappaltatori",
    consortile: "Consortile",
    amministrativa_documentazione_gara: "Documentazione di Gara",
    amministrativa_inviti_bandi: "Inviti - Bandi",
    amministrativa_offerta: "Offerta",
    amministrativa_delibere_aggiudicazione: "Delibere Aggiudicazione",
    polizze_car: "Polizza CAR",
    polizze_decennale: "Polizza Decennale Postuma",
    polizze_rct: "Polizza RCT",
    tecnica_capitolati: "Capitolati",
    tecnica_computo_metrico: "Computo Metrico",
    tecnica_elaborati_grafici: "Elaborati Grafici",
    cantiere_verbale_consegna: "Verbale di Consegna",
    cantiere_ultimazione_collaudi: "Ultimazione e Collaudi",
    sicurezza_pos_esecutrice: "POS Esecutrice",
    sicurezza_pos_subappaltatrice: "POS Subappaltatrice",
    economica_sal: "SAL",
    economica_fatture: "Fatture",
    altro: "Altro"
  };

  const getScadenzaStatus = (dataScadenza) => {
    if (!dataScadenza) return null;
    
    const oggi = new Date();
    const scadenza = new Date(dataScadenza);
    // Set hours, minutes, seconds, milliseconds to 0 for accurate day comparison
    oggi.setHours(0, 0, 0, 0);
    scadenza.setHours(0, 0, 0, 0);
    
    const differenzaGiorni = Math.ceil((scadenza.getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));
    
    if (differenzaGiorni < 0) {
      return { status: "scaduto", label: "Scaduto", color: "bg-red-100 text-red-800", icon: AlertTriangle };
    } else if (differenzaGiorni <= 30) {
      return { status: "in_scadenza", label: "In scadenza", color: "bg-amber-100 text-amber-800", icon: Clock };
    } else {
      return { status: "valido", label: "Valido", color: "bg-emerald-100 text-emerald-800", icon: CheckCircle };
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-full">
      <div className="max-w-7xl mx-auto">
        <Link to={createPageUrl('Imprese')}>
          <Button variant="outline" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tutte le imprese
          </Button>
        </Link>

        {/* Card Dati Impresa */}
        <Card className="mb-6 shadow-lg border-0">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Building2 className="w-8 h-8 text-blue-600" />
              <div className="flex-1">
                <CardTitle className="text-3xl">{impresa.ragione_sociale}</CardTitle>
                <p className="text-slate-500 mt-1">Anagrafica completa impresa</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {impresa.rappresentante_legale && (
              <div className="pb-4 border-b">
                <DetailField
                  label="Rappresentante Legale"
                  value={impresa.rappresentante_legale}
                  icon={User}
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <DetailField
                label="Partita IVA"
                value={impresa.partita_iva}
                icon={Building}
              />
              <DetailField
                label="Codice Fiscale"
                value={impresa.codice_fiscale}
                icon={Building}
              />
              <DetailField
                label="Codice SDI"
                value={impresa.codice_sdi}
                icon={FileText}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
              <DetailField
                label="Indirizzo"
                value={`${impresa.indirizzo_legale || ''}, ${impresa.cap_legale || ''} ${impresa.citta_legale || ''} (${impresa.provincia_legale || ''})`}
                icon={MapPin}
              />
              <div className="space-y-4">
                <DetailField
                  label="Telefono"
                  value={impresa.telefono}
                  icon={Phone}
                />
                <DetailField
                  label="Email"
                  value={impresa.email}
                  icon={Mail}
                />
                <DetailField
                  label="PEC"
                  value={impresa.pec}
                  icon={Mail}
                />
              </div>
            </div>

            {/* Sezione Professionisti Collegati */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
              <div>
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Referente Impresa
                </h3>
                {referenteImpresa ? (
                  <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                    <p className="font-medium text-slate-900">
                      {referenteImpresa.nome} {referenteImpresa.cognome}
                    </p>
                    {referenteImpresa.qualifica && (
                      <p className="text-sm text-slate-600">{referenteImpresa.qualifica}</p>
                    )}
                    {referenteImpresa.telefono && (
                      <p className="text-sm text-slate-600 flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {referenteImpresa.telefono}
                      </p>
                    )}
                    {referenteImpresa.email && (
                      <p className="text-sm text-slate-600 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {referenteImpresa.email}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">Non assegnato</p>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Responsabile Sicurezza
                </h3>
                {responsabileSicurezza ? (
                  <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                    <p className="font-medium text-slate-900">
                      {responsabileSicurezza.nome} {responsabileSicurezza.cognome}
                    </p>
                    {responsabileSicurezza.qualifica && (
                      <p className="text-sm text-slate-600">{responsabileSicurezza.qualifica}</p>
                    )}
                    {responsabileSicurezza.telefono && (
                      <p className="text-sm text-slate-600 flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {responsabileSicurezza.telefono}
                      </p>
                    )}
                    {responsabileSicurezza.email && (
                      <p className="text-sm text-slate-600 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {responsabileSicurezza.email}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">Non assegnato</p>
                )}
              </div>
            </div>

            {impresa.iban && (
              <div className="pt-4 border-t">
                <h3 className="font-semibold text-slate-900 mb-2">Dati Bancari</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DetailField label="Banca" value={impresa.banca_appoggio} />
                  <DetailField label="IBAN" value={impresa.iban} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {/* Card Cantieri Associati */}
            <Card className="shadow-lg border-0 mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  Cantieri Associati ({cantieriAssociati.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cantieriAssociati.length > 0 ? (
                  <div className="space-y-4">
                    {cantieriAssociati.map(cantiere => (
                      <Link
                        key={cantiere.id}
                        to={createPageUrl(`CantiereDashboard?id=${cantiere.id}`)}
                        className="block p-4 border rounded-lg hover:bg-slate-50 hover:border-blue-300 transition-all"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-slate-900">{cantiere.denominazione}</h3>
                          <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                            {cantiere.stato}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 mb-3">{cantiere.oggetto_lavori}</p>
                        <div className="flex flex-wrap gap-2">
                          {cantiere.tipologie.map((tip, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className={tipologiaColors[tip] || 'bg-gray-100 text-gray-800'}
                            >
                              {tip}
                            </Badge>
                          ))}
                        </div>
                        {cantiere.importo_contratto && (
                          <p className="text-sm text-slate-500 mt-2">
                            Importo: € {cantiere.importo_contratto.toLocaleString('it-IT')}
                          </p>
                        )}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Nessun cantiere associato a questa impresa</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            {/* Card Alert Scadenze */}
            <Card className="shadow-lg border-0 mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Scadenze Documenti
                </CardTitle>
              </CardHeader>
              <CardContent>
                {documenti.filter(d => {
                  const status = getScadenzaStatus(d.data_scadenza);
                  return status && (status.status === 'scaduto' || status.status === 'in_scadenza');
                }).length > 0 ? (
                  <div className="space-y-3">
                    {documenti
                      .filter(d => {
                        const status = getScadenzaStatus(d.data_scadenza);
                        return status && (status.status === 'scaduto' || status.status === 'in_scadenza');
                      })
                      .sort((a, b) => new Date(a.data_scadenza) - new Date(b.data_scadenza)) // Sort by date
                      .map(doc => {
                        const status = getScadenzaStatus(doc.data_scadenza);
                        const Icon = status.icon;
                        return (
                          <div key={doc.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                            <div className="flex-shrink-0">
                              <Icon className={`w-5 h-5 mt-0.5 ${status.status === 'scaduto' ? 'text-red-600' : 'text-amber-600'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900">{doc.nome_documento}</p>
                              {doc.data_scadenza && (
                                <p className="text-xs text-slate-500 mt-1">
                                  Scade il: {format(new Date(doc.data_scadenza), 'dd/MM/yyyy', { locale: it })}
                                </p>
                              )}
                            </div>
                            <Badge variant="secondary" className={status.color}>
                              {status.label}
                            </Badge>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50 text-emerald-500" />
                    <p>Nessuna scadenza imminente o documento scaduto</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card Documenti */}
            <Card className="shadow-lg border-0 mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Documenti ({documenti.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {documenti.length > 0 ? (
                  <div className="space-y-2">
                    {documenti.map(doc => {
                      const hasFile = doc.file_uri || doc.cloud_file_url;
                      const scadenzaStatus = getScadenzaStatus(doc.data_scadenza);
                      
                      return (
                        <div key={doc.id} className="p-3 border rounded-md hover:bg-slate-50">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-900 truncate text-sm">{doc.nome_documento}</p>
                              <p className="text-xs text-slate-500">{tipoDocumentoLabels[doc.tipo_documento] || doc.tipo_documento}</p>
                              {doc.data_scadenza && scadenzaStatus && (
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="secondary" className={`${scadenzaStatus.color} text-xs`}>
                                    {scadenzaStatus.label}
                                  </Badge>
                                  <span className="text-xs text-slate-500">
                                    {format(new Date(doc.data_scadenza), 'dd/MM/yyyy', { locale: it })}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              {hasFile && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleViewDocument(doc)}
                                    title="Visualizza"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleDownloadDocument(doc)}
                                    title="Scarica"
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEditDocumento(doc)}
                                title="Modifica"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                                onClick={() => handleDeleteDocumento(doc)}
                                title="Elimina"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm text-center py-4">
                    Nessun documento caricato
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Card Azioni Rapide */}
            <Card className="shadow-lg border-0 mb-6">
              <CardHeader>
                <CardTitle>Azioni Rapide</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setEditingDocumento(null); // Ensure no document is in editing mode when adding new
                    setShowDocumentoForm(true);
                  }}
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Aggiungi Documento
                </Button>
              </CardContent>
            </Card>

            {/* Card Statistiche */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle>Statistiche</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium text-slate-700">Cantieri Attivi</span>
                  <span className="text-xl font-bold text-blue-600">
                    {cantieriAssociati.filter(c => c.stato === 'attivo').length}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium text-slate-700">Cantieri Completati</span>
                  <span className="text-xl font-bold text-green-600">
                    {cantieriAssociati.filter(c => c.stato === 'completato').length}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                  <span className="text-sm font-medium text-slate-700">Documenti</span>
                  <span className="text-xl font-bold text-purple-600">{documenti.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Dialog per aggiungere/modificare documenti */}
        <Dialog open={showDocumentoForm} onOpenChange={(open) => {
          setShowDocumentoForm(open);
          if (!open) setEditingDocumento(null);
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingDocumento ? 'Modifica Documento' : 'Nuovo Documento'} per {impresa.ragione_sociale}
              </DialogTitle>
            </DialogHeader>
            <DocumentoForm
              documento={editingDocumento}
              onSubmit={handleDocumentoSubmit}
              onCancel={() => {
                setShowDocumentoForm(false);
                setEditingDocumento(null);
              }}
              initialEntity={{ id: impresa.id, type: 'azienda', name: impresa.ragione_sociale }}
            />
          </DialogContent>
        </Dialog>

        {/* Dialog Visualizzatore Documenti */}
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
  );
}
