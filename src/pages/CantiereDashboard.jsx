
import React, { useState, useEffect } from 'react';
import { Cantiere } from '@/entities/Cantiere';
import { Subappalto } from '@/entities/Subappalto';
import { Documento } from '@/entities/Documento';
import { Impresa } from '@/entities/Impresa';
import { User } from '@/entities/User'; // Keep User import as it might be used elsewhere, although auth method changes
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building2, Handshake, Briefcase, PlusCircle, BarChart3, Calendar, CheckCircle2, Clock, FileText, Download, ExternalLink, X, Edit, Users } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { CreateFileSignedUrl, base44 } from '@/integrations/Core'; // Added base44
import { toast } from "sonner";
import { Badge } from '@/components/ui/badge';

import DocumentoForm from '../components/documenti/DocumentoForm';
import AlertScadenzeCard from '../components/cantiere-dashboard/AlertScadenzeCard';
import CantiereForm from '../components/cantieri/CantiereForm';

const DetailField = ({ label, value }) => (
  <div>
    <p className="text-sm text-slate-500">{label}</p>
    <p className="font-medium text-slate-800">{value || 'N/D'}</p>
  </div>
);

export default function CantiereDashboardPage() {
  const [cantiere, setCantiere] = useState(null);
  const [subappalti, setSubappalti] = useState([]);
  const [documenti, setDocumenti] = useState([]);
  const [imprese, setImprese] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDocumentoForm, setShowDocumentoForm] = useState(false);
  const [showCantiereForm, setShowCantiereForm] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Stati per il visualizzatore - AGGIORNATI
  const [viewingDocument, setViewingDocument] = useState(null);
  const [showViewer, setShowViewer] = useState(false);
  const [signedUrl, setSignedUrl] = useState(null);
  const [isLoadingViewer, setIsLoadingViewer] = useState(false);

  const loadUser = async () => {
    try {
      const user = await base44.auth.me(); // Changed from User.me()
      setCurrentUser(user);
    } catch (error) {
      console.error("Errore caricamento utente:", error);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (id) {
      loadData(id);
    } else {
      setIsLoading(false);
    }
    
    loadUser();
  }, []);

  const loadData = async (cantiereId) => {
    setIsLoading(true);
    try {
      const [cantiereData, subappaltiData, documentiData, impreseData] = await Promise.all([
        Cantiere.get(cantiereId),
        Subappalto.filter({ cantiere_id: cantiereId }),
        Documento.filter({ entita_collegata_id: cantiereId, entita_collegata_tipo: 'cantiere' }),
        Impresa.list()
      ]);
      setCantiere(cantiereData);
      setSubappalti(subappaltiData);
      setDocumenti(documentiData);
      setImprese(impreseData);
    } catch (error) {
      console.error("Errore nel caricamento dei dati del cantiere:", error);
    }
    setIsLoading(false);
  };
  
  const handleDocumentoSubmit = async (formData) => {
    try {
      if (!cantiere || !cantiere.id) {
        console.error("Cantiere ID non disponibile per l'associazione del documento.");
        toast.error("Errore: ID Cantiere non disponibile.");
        return;
      }
      await Documento.create({
        ...formData,
        entita_collegata_id: cantiere.id,
        entita_collegata_tipo: 'cantiere',
      });
      setShowDocumentoForm(false);
      loadData(cantiere.id);
      toast.success("Documento aggiunto con successo!");
    } catch (error) {
      console.error("Errore nel salvataggio del documento:", error);
      toast.error("Errore durante l'aggiunta del documento.");
    }
  };

  const handleCantiereSubmit = async (formData) => {
    try {
      if (cantiere && cantiere.id) {
        await Cantiere.update(cantiere.id, formData);
        setShowCantiereForm(false);
        loadData(cantiere.id);
        toast.success("Cantiere aggiornato con successo!");
      }
    } catch (error) {
      console.error("Errore aggiornamento cantiere:", error);
      toast.error("Errore durante l'aggiornamento del cantiere");
    }
  };

  const calcolaPercentualeCompletamento = () => {
    if (!cantiere?.data_inizio || !cantiere?.data_fine_prevista) return 0;
    
    const oggi = new Date();
    const inizio = new Date(cantiere.data_inizio);
    const fine = new Date(cantiere.data_fine_prevista);
    
    const giorniTotali = differenceInDays(fine, inizio);
    const giorniTrascorsi = differenceInDays(oggi, inizio);
    
    if (giorniTrascorsi < 0) return 0;
    if (giorniTrascorsi > giorniTotali) return 100;
    
    return Math.round((giorniTrascorsi / giorniTotali) * 100);
  };

  const getStatoAvanzamento = () => {
    const percentuale = calcolaPercentualeCompletamento();
    if (percentuale === 0) return { text: 'Da iniziare', color: 'text-slate-500', icon: Clock };
    if (percentuale < 100) return { text: 'In corso', color: 'text-blue-600', icon: Calendar };
    return { text: 'Completato', color: 'text-green-600', icon: CheckCircle2 };
  };

  const findImpresaId = (ragioneSociale) => {
    const impresa = imprese.find(i => 
      i.ragione_sociale.toLowerCase() === ragioneSociale.toLowerCase()
    );
    return impresa?.id;
  };

  const sortImpresaByPriority = (imprese) => {
    const priorityOrder = {
      'singola': 1,
      'mandataria': 2,
      'mandante': 3,
      'consorzio': 4,
      'consortile': 5,
      'socio': 6,
      'subappaltatore': 7,
      'subaffidatario': 8,
      'esecutrice': 9
    };

    return [...imprese].sort((a, b) => {
      // Prioritize the main appaltatrice if present
      if (a.isPrincipale && !b.isPrincipale) return -1;
      if (!a.isPrincipale && b.isPrincipale) return 1;

      const priorityA = priorityOrder[a.tipo_impresa] || 999;
      const priorityB = priorityOrder[b.tipo_impresa] || 999;
      return priorityA - priorityB;
    });
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
    if (documento.file_uri || documento.cloud_file_url) {
      setIsLoadingViewer(true);
      setViewingDocument(documento);
      setShowViewer(true);
      setSignedUrl(null); // Reset URL first

      try {
        let urlToLoad = documento.cloud_file_url;
        if (documento.file_uri) {
          const result = await CreateFileSignedUrl({ // Keeping direct import usage
            file_uri: documento.file_uri,
            expires_in: 3600 // 1 hour
          });
          urlToLoad = result.signed_url;
        }
        setSignedUrl(urlToLoad);
      } catch (error) {
        console.error("Errore generazione signed URL:", error);
        toast.error("Impossibile caricare il documento per la visualizzazione.");
        setShowViewer(false);
        setViewingDocument(null);
      } finally {
        setIsLoadingViewer(false);
      }
    } else {
      toast.info(`Documento disponibile solo sul NAS al percorso: ${documento.percorso_nas}`, {
        duration: 5000
      });
    }
  };

  const handleDownloadDocument = async (documento) => {
    if (documento.file_uri || documento.cloud_file_url) {
      try {
        let urlToDownload = documento.cloud_file_url;
        if (documento.file_uri) {
          const result = await CreateFileSignedUrl({ // Keeping direct import usage
            file_uri: documento.file_uri,
            expires_in: 300 // 5 minutes for download
          });
          urlToDownload = result.signed_url;
        }
        
        const a = document.createElement('a');
        a.href = urlToDownload;
        a.download = documento.nome_documento; // Suggest filename
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success("Download avviato.");
      } catch (error) {
        console.error("Errore download documento:", error);
        toast.error("Impossibile scaricare il documento.");
      }
    } else {
      toast.info(`Documento disponibile solo sul NAS al percorso: ${documento.percorso_nas}`, {
        duration: 5000
      });
    }
  };

  if (isLoading) {
    return <div className="p-6">Caricamento...</div>;
  }

  if (!cantiere) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl">Cantiere non trovato.</h2>
        <Link to={createPageUrl('Cantieri')}>
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Torna ai Cantieri
          </Button>
        </Link>
      </div>
    );
  }

  const tipologiaColors = {
    'Appaltatrice Principale': 'bg-blue-100 text-blue-800',
    'Partner': 'bg-purple-100 text-purple-800',
    'Subappaltatore': 'bg-orange-100 text-orange-800',
    'singola': 'bg-slate-100 text-slate-800',
    'mandataria': 'bg-green-100 text-green-800',
    'mandante': 'bg-teal-100 text-teal-800',
    'consorzio': 'bg-violet-100 text-violet-800',
    'consortile': 'bg-indigo-100 text-indigo-800',
    'socio': 'bg-pink-100 text-pink-800',
    'subappaltatore': 'bg-orange-100 text-orange-800',
    'subaffidatario': 'bg-amber-100 text-amber-800',
    'esecutrice': 'bg-cyan-100 text-cyan-800'
  };

  const tipoDocumentoLabels = {
    durc: "DURC",
    visure: "Visure",
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

  const percentualeCompletamento = calcolaPercentualeCompletamento();
  const statoAvanzamento = getStatoAvanzamento();
  const StatoIcon = statoAvanzamento.icon;

  const hasCommittenteData = cantiere.committente_ragione_sociale || cantiere.committente_referente_nome || cantiere.committente_indirizzo || cantiere.committente_cap || cantiere.committente_citta || cantiere.committente_piva || cantiere.committente_cf || cantiere.committente_email || cantiere.committente_telefono;
  
  const hasResponsabileData = cantiere.responsabile_unico_procedimento_nome || cantiere.responsabile_unico_procedimento_indirizzo;

  const hasDirettoreData = cantiere.direttore_lavori_nome || cantiere.direttore_lavori_indirizzo;

  // Costruisci lista completa delle imprese da mostrare
  const allImprese = [];
  
  // 1. Aggiungi l'impresa appaltatrice principale se presente
  if (cantiere.azienda_appaltatrice_ragione_sociale) {
    allImprese.push({
      ragione_sociale: cantiere.azienda_appaltatrice_ragione_sociale,
      tipo_impresa: cantiere.tipologia_azienda_appaltatrice || 'singola',
      indirizzo: cantiere.azienda_appaltatrice_indirizzo,
      cap: cantiere.azienda_appaltatrice_cap,
      citta: cantiere.azienda_appaltatrice_citta,
      telefono: cantiere.azienda_appaltatrice_telefono,
      email: cantiere.azienda_appaltatrice_email,
      cf: cantiere.azienda_appaltatrice_cf,
      piva: cantiere.azienda_appaltatrice_piva,
      isPrincipale: true // Flag per distinguerla
    });
  }
  
  // 2. Aggiungi i partner consorziati
  if (cantiere.partner_consorziati && cantiere.partner_consorziati.length > 0) {
    allImprese.push(...cantiere.partner_consorziati.map(p => ({ ...p, isPrincipale: false })));
  }

  // Ordina le imprese per priorità
  const sortedAllImprese = sortImpresaByPriority(allImprese);

  // Filtra subappalti e subaffidamenti
  const subappaltiList = subappalti.filter(s => s.tipo_relazione === "subappalto" || !s.tipo_relazione);
  const subaffidamentiList = subappalti.filter(s => s.tipo_relazione === "subaffidamento");

  return (
    <div className="p-6 bg-slate-50 min-h-full">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Link to={createPageUrl('Cantieri')}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tutti i cantieri
            </Button>
          </Link>
          
          {(currentUser?.role === 'admin' || currentUser?.perm_edit_cantieri) && (
            <Button 
              onClick={() => setShowCantiereForm(true)}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Edit className="w-4 h-4 mr-2" />
              Modifica Cantiere
            </Button>
          )}
        </div>

        <Card className="mb-6 shadow-lg border-0">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Building2 className="w-8 h-8 text-blue-600" />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {cantiere.numero_cantiere && (
                    <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300 font-mono text-base">
                      #{cantiere.numero_cantiere}
                    </Badge>
                  )}
                  <CardTitle className="text-3xl">{cantiere.denominazione}</CardTitle>
                </div>
                <p className="text-slate-500">{cantiere.oggetto_lavori}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <DetailField label="Indirizzo" value={`${cantiere.indirizzo}, ${cantiere.indirizzo_citta}`} />
              <DetailField label="Referente Cantiere" value={cantiere.referente_interno} />
              <DetailField label="Responsabile Sicurezza" value={cantiere.responsabile_sicurezza} />
              <DetailField label="Importo Contratto" value={cantiere.importo_contratto ? `€ ${Number(cantiere.importo_contratto).toLocaleString('it-IT')}` : 'N/D'} />
              <DetailField label="Stato" value={cantiere.stato || "In corso"} />
              <DetailField label="CIG" value={cantiere.codice_cig} />
              <DetailField label="CUP" value={cantiere.codice_cup} />
            </div>

            {/* Timeline e Avanzamento */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-900">Avanzamento Temporale</h3>
                <div className={`flex items-center gap-2 ${statoAvanzamento.color}`}>
                  <StatoIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">{statoAvanzamento.text}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <DetailField 
                  label="Data Inizio" 
                  value={cantiere.data_inizio ? format(new Date(cantiere.data_inizio), 'dd MMM yyyy', { locale: it }) : 'N/D'} 
                />
                <DetailField 
                  label="Data Fine Prevista" 
                  value={cantiere.data_fine_prevista ? format(new Date(cantiere.data_fine_prevista), 'dd MMM yyyy', { locale: it }) : 'N/D'} 
                />
                <DetailField 
                  label="Giorni Previsti" 
                  value={cantiere.giorni_previsti || 'N/D'} 
                />
              </div>
              <div className="flex items-center gap-4">
                <Progress value={percentualeCompletamento} className="h-3 flex-1" />
                <span className="text-lg font-bold text-slate-700 min-w-[60px] text-right">
                  {percentualeCompletamento}%
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Percentuale basata sul tempo trascorso rispetto alla durata prevista
              </p>
            </div>

            {/* Committente */}
            {hasCommittenteData && (
              <div className="pt-4 border-t">
                <h3 className="font-semibold text-slate-900 mb-2">Committente</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <DetailField label="Ragione Sociale" value={cantiere.committente_ragione_sociale} />
                  <DetailField 
                    label="Indirizzo" 
                    value={[cantiere.committente_indirizzo, cantiere.committente_cap, cantiere.committente_citta].filter(Boolean).join(', ')} 
                  />
                  <DetailField label="P.IVA / C.F." value={cantiere.committente_piva || cantiere.committente_cf} />
                  <DetailField label="Email" value={cantiere.committente_email} />
                  <DetailField label="Telefono" value={cantiere.committente_telefono} />
                  {cantiere.committente_referente_nome && (
                    <DetailField label="Referente" value={cantiere.committente_referente_nome} />
                  )}
                </div>
              </div>
            )}

            {/* Direttore dei Lavori */}
            {hasDirettoreData && (
              <div className="pt-4 border-t">
                <h3 className="font-semibold text-slate-900 mb-2">Direttore dei Lavori</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <DetailField label="Nome e Cognome" value={cantiere.direttore_lavori_nome} />
                  <DetailField label="Qualifica" value={cantiere.direttore_lavori_qualifica} />
                  <DetailField label="Codice Fiscale" value={cantiere.direttore_lavori_cf} />
                  <DetailField label="Telefono" value={cantiere.direttore_lavori_telefono} />
                  <DetailField label="Email" value={cantiere.direttore_lavori_email} />
                  <DetailField 
                    label="Indirizzo" 
                    value={[cantiere.direttore_lavori_indirizzo, cantiere.direttore_lavori_cap, cantiere.direttore_lavori_citta].filter(Boolean).join(', ')} 
                  />
                </div>
              </div>
            )}

            {/* Responsabile Unico del Procedimento */}
            {hasResponsabileData && (
              <div className="pt-4 border-t">
                <h3 className="font-semibold text-slate-900 mb-2">Responsabile Unico del Procedimento (RUP)</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <DetailField label="Nome e Cognome" value={cantiere.responsabile_unico_procedimento_nome} />
                  <DetailField label="Qualifica" value={cantiere.responsabile_unico_procedimento_qualifica} />
                  <DetailField label="Codice Fiscale" value={cantiere.responsabile_unico_procedimento_cf} />
                  <DetailField label="Email" value={cantiere.responsabile_unico_procedimento_email} />
                  <DetailField label="Telefono" value={cantiere.responsabile_unico_procedimento_telefono} />
                  <DetailField 
                    label="Indirizzo" 
                    value={[cantiere.responsabile_unico_procedimento_indirizzo, cantiere.responsabile_unico_procedimento_cap, cantiere.responsabile_unico_procedimento_citta].filter(Boolean).join(', ')} 
                  />
                </div>
              </div>
            )}

            {/* Note */}
            {cantiere.note && (
              <div className="pt-4 border-t">
                <h3 className="font-semibold text-slate-900 mb-2">Note</h3>
                <p className="text-slate-700 whitespace-pre-wrap">{cantiere.note}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  Imprese Collegate
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sortedAllImprese.length > 0 ? (
                  <ul className="space-y-2">
                    {sortedAllImprese.map((impresa, index) => {
                      const impresaId = findImpresaId(impresa.ragione_sociale);
                      const tipoLabels = {
                        singola: "Singola",
                        mandataria: "Mandataria",
                        mandante: "Mandante",
                        consorzio: "Consorzio",
                        consortile: "Consortile",
                        socio: "Socio",
                        subappaltatore: "Subappaltatore",
                        subaffidatario: "Subaffidatario",
                        esecutrice: "Esecutrice"
                      };
                      const tipoColors = {
                        singola: "bg-slate-100 text-slate-800 border-slate-300",
                        mandataria: "bg-green-100 text-green-800 border-green-300",
                        mandante: "bg-teal-100 text-teal-800 border-teal-300",
                        consorzio: "bg-violet-100 text-violet-800 border-violet-300",
                        consortile: "bg-indigo-100 text-indigo-800 border-indigo-300",
                        socio: "bg-pink-100 text-pink-800 border-pink-300",
                        subappaltatore: "bg-orange-100 text-orange-800 border-orange-300",
                        subaffidatario: "bg-amber-100 text-amber-800 border-amber-300",
                        esecutrice: "bg-cyan-100 text-cyan-800 border-cyan-300"
                      };
                      
                      return (
                        <li key={index}>
                          {impresaId ? (
                            <Link 
                              to={createPageUrl(`ImpresaDashboard?id=${impresaId}`)} 
                              className="flex items-center justify-between p-3 border rounded-md hover:bg-blue-50 hover:border-blue-300 transition-colors"
                            >
                              <div className="flex-1 flex items-center">
                                <span className="font-medium text-slate-900">{impresa.ragione_sociale || 'Nome non disponibile'}</span>
                                {impresa.isPrincipale && (
                                  <span className="ml-2 text-xs bg-indigo-600 text-white px-2 py-0.5 rounded">PRINCIPALE</span>
                                )}
                              </div>
                              {impresa.tipo_impresa && (
                                <Badge variant="secondary" className={`${tipoColors[impresa.tipo_impresa] || 'bg-slate-50 text-slate-700 border-slate-200'} border font-medium ml-2 flex-shrink-0`}>
                                  {tipoLabels[impresa.tipo_impresa] || impresa.tipo_impresa}
                                </Badge>
                              )}
                            </Link>
                          ) : (
                            <div className="flex items-center justify-between p-3 border rounded-md bg-slate-50">
                              <div className="flex-1 flex items-center">
                                <span className="font-medium text-slate-900">{impresa.ragione_sociale || 'Nome non disponibile'}</span>
                                {impresa.isPrincipale && (
                                  <span className="ml-2 text-xs bg-indigo-600 text-white px-2 py-0.5 rounded">PRINCIPALE</span>
                                )}
                              </div>
                              {impresa.tipo_impresa && (
                                <Badge variant="secondary" className={`${tipoColors[impresa.tipo_impresa] || 'bg-slate-50 text-slate-700 border-slate-200'} border font-medium ml-2 flex-shrink-0`}>
                                  {tipoLabels[impresa.tipo_impresa] || impresa.tipo_impresa}
                                </Badge>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : <p className="text-slate-500">Nessuna impresa collegata.</p>}
              </CardContent>
            </Card>

             <Card className="shadow-lg border-0">
                <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Handshake className="w-5 h-5" />
                    Subappalti
                </CardTitle>
                </CardHeader>
                <CardContent>
                {subappaltiList.length > 0 ? (
                    <ul className="space-y-2">
                    {subappaltiList.map(sub => {
                      const ragioneSociale = sub.ragione_sociale;
                      const impresaId = sub.impresa_id || findImpresaId(ragioneSociale);
                      return (
                        <li key={sub.id}>
                          {impresaId ? (
                            <Link 
                              to={createPageUrl(`ImpresaDashboard?id=${impresaId}`)} 
                              className="block p-2 border rounded-md hover:bg-blue-50 hover:border-blue-300 transition-colors"
                            >
                              <span className="font-medium">{ragioneSociale}</span>
                              {sub.categoria_lavori && (
                                <span className="text-sm text-slate-500 ml-2">• {sub.categoria_lavori.replace(/_/g, ' ')}</span>
                              )}
                            </Link>
                          ) : (
                            <div className="p-2 border rounded-md bg-slate-50">
                              <span className="font-medium">{ragioneSociale}</span>
                              {sub.categoria_lavori && (
                                <span className="text-sm text-slate-500 ml-2">• {sub.categoria_lavori.replace(/_/g, ' ')}</span>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                    </ul>
                ) : <p className="text-slate-500">Nessun subappalto associato.</p>}
                </CardContent>
            </Card>

            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Subaffidamenti
                </CardTitle>
              </CardHeader>
              <CardContent>
                {subaffidamentiList.length > 0 ? (
                  <ul className="space-y-2">
                    {subaffidamentiList.map(sub => {
                      const ragioneSociale = sub.ragione_sociale;
                      const impresaId = sub.impresa_id || findImpresaId(ragioneSociale);
                      return (
                        <li key={sub.id}>
                          {impresaId ? (
                            <Link 
                              to={createPageUrl(`ImpresaDashboard?id=${impresaId}`)} 
                              className="block p-2 border rounded-md hover:bg-blue-50 hover:border-blue-300 transition-colors"
                            >
                              <span className="font-medium">{ragioneSociale}</span>
                              {sub.categoria_lavori && (
                                <span className="text-sm text-slate-500 ml-2">• {sub.categoria_lavori.replace(/_/g, ' ')}</span>
                              )}
                            </Link>
                          ) : (
                            <div className="p-2 border rounded-md bg-slate-50">
                              <span className="font-medium">{ragioneSociale}</span>
                              {sub.categoria_lavori && (
                                <span className="text-sm text-slate-500 ml-2">• {sub.categoria_lavori.replace(/_/g, ' ')}</span>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : <p className="text-slate-500">Nessun subaffidamento associato.</p>}
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Documenti
                </CardTitle>
              </CardHeader>
              <CardContent>
                {documenti.length > 0 ? (
                  <div className="space-y-2">
                    {documenti.map(doc => (
                      <div key={doc.id} className="p-3 border rounded-md hover:bg-slate-50 flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">{doc.nome_documento}</p>
                          <p className="text-sm text-slate-500">
                            {tipoDocumentoLabels[doc.tipo_documento] || doc.tipo_documento}
                            {doc.data_scadenza && ` • Scad: ${format(new Date(doc.data_scadenza), 'dd/MM/yyyy')}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          {(doc.file_uri || doc.cloud_file_url) && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewDocument(doc)}
                                title="Visualizza documento"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDownloadDocument(doc)}
                                title="Scarica documento"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-slate-500">Nessun documento caricato.</p>}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <AlertScadenzeCard documenti={documenti} />
            
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle>Azioni Rapide</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setShowDocumentoForm(true)}
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Aggiungi Documento
                </Button>

                <Link to={createPageUrl(`SAL?cantiere_id=${cantiere.id}`)}>
                  <Button variant="outline" className="w-full justify-start">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Vai a SAL
                  </Button>
                </Link>

                <Link to={createPageUrl(`Cronoprogramma?cantiere_id=${cantiere.id}`)}>
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="w-4 h-4 mr-2" />
                    Vai a Cronoprogramma
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Dialog Form Documento */}
        <Dialog open={showDocumentoForm} onOpenChange={setShowDocumentoForm}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nuovo Documento per il Cantiere</DialogTitle>
            </DialogHeader>
            <DocumentoForm
              onSubmit={handleDocumentoSubmit}
              onCancel={() => setShowDocumentoForm(false)}
              initialEntity={{ id: cantiere.id, type: 'cantiere' }}
            />
          </DialogContent>
        </Dialog>

        {/* Dialog Form Cantiere */}
        <Dialog open={showCantiereForm} onOpenChange={setShowCantiereForm}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifica Cantiere</DialogTitle>
            </DialogHeader>
            <CantiereForm
              cantiere={cantiere}
              onSubmit={handleCantiereSubmit}
              onCancel={() => setShowCantiereForm(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Dialog Visualizzatore Documenti - AGGIORNATO */}
        {showViewer && viewingDocument && (
          <>
            {/* Overlay */}
            <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => {
              setShowViewer(false);
              setViewingDocument(null);
              setSignedUrl(null);
            }} />
            
            {/* Viewer Content Container */}
            <div className="fixed inset-4 z-[70] bg-white rounded-lg shadow-xl flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
                <h2 className="text-lg font-semibold truncate pr-4">
                  {viewingDocument.nome_documento}
                </h2>
                <button
                  onClick={() => {
                    setShowViewer(false);
                    setViewingDocument(null);
                    setSignedUrl(null);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Document Display Area */}
              <div className="flex-1 w-full h-full min-h-0">
                {isLoadingViewer ? (
                  <div className="w-full h-full flex items-center justify-center bg-slate-50">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                      <p className="text-slate-600">Caricamento documento...</p>
                    </div>
                  </div>
                ) : signedUrl ? (
                  // Conditional rendering based on file type
                  <>
                    {getFileType(viewingDocument.nome_documento) === 'pdf' && (
                      <iframe
                        src={`https://docs.google.com/viewer?url=${encodeURIComponent(signedUrl)}&embedded=true`}
                        className="w-full h-full border-0"
                        title={viewingDocument.nome_documento}
                        allowFullScreen
                      />
                    )}
                    {getFileType(viewingDocument.nome_documento) === 'image' && (
                      <div className="w-full h-full flex items-center justify-center bg-slate-50 p-4 overflow-auto">
                        <img
                          src={signedUrl}
                          alt={viewingDocument.nome_documento}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    )}
                    {getFileType(viewingDocument.nome_documento) === 'office' && (
                      <iframe
                        src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signedUrl)}`}
                        className="w-full h-full border-0"
                        title={viewingDocument.nome_documento}
                        allowFullScreen
                      />
                    )}
                    {/* Fallback for other types, or if type detection fails/isn't explicit */}
                    {!['pdf', 'image', 'office'].includes(getFileType(viewingDocument.nome_documento)) && (
                      <iframe
                        src={`https://docs.google.com/viewer?url=${encodeURIComponent(signedUrl)}&embedded=true`}
                        className="w-full h-full border-0"
                        title={viewingDocument.nome_documento}
                        allowFullScreen
                      />
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-50">
                    <p className="text-slate-500">Errore nel caricamento del documento.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
