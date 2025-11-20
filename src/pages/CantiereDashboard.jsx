import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Cantiere } from '@/entities/Cantiere';
import { Subappalto } from '@/entities/Subappalto';
import { Documento } from '@/entities/Documento';
import { Impresa } from '@/entities/Impresa';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building2, Handshake, Briefcase, PlusCircle, BarChart3, Calendar, CheckCircle2, Clock, FileText, Download, ExternalLink, X, Edit, Users, Euro, Shield, ClipboardList, User, StickyNote } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { format, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from "sonner";
import { Badge } from '@/components/ui/badge';

import DocumentoForm from '../components/documenti/DocumentoForm';
import AlertScadenzeCard from '../components/cantiere-dashboard/AlertScadenzeCard';
import CantiereForm from '../components/cantieri/CantiereForm';

const DetailField = React.memo(({ label, value }) => (
  <div>
    <p className="text-sm text-slate-500">{label}</p>
    <p className="font-medium text-slate-800">{value || 'N/D'}</p>
  </div>
));
DetailField.displayName = 'DetailField';

export default function CantiereDashboardPage() {
  const [cantiere, setCantiere] = useState(null);
  const [subappalti, setSubappalti] = useState([]);
  const [documenti, setDocumenti] = useState([]);
  const [imprese, setImprese] = useState([]);
  const [salList, setSalList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDocumentoForm, setShowDocumentoForm] = useState(false);
  const [showCantiereForm, setShowCantiereForm] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  const [viewingDocument, setViewingDocument] = useState(null);
  const [showViewer, setShowViewer] = useState(false);
  const [signedUrl, setSignedUrl] = useState(null);
  const [isLoadingViewer, setIsLoadingViewer] = useState(false);

  const [responsabileSicurezza, setResponsabileSicurezza] = useState(null);
  const [direttoreLavori, setDirettoreLavori] = useState(null);
  const [responsabileUnico, setResponsabileUnico] = useState(null);

  const loadUser = useCallback(async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
    } catch (error) {
      console.error("Errore caricamento utente:", error);
    }
  }, []);

  const loadData = useCallback(async (cantiereId) => {
    setIsLoading(true);
    try {
      const [cantiereData, subappaltiData, documentiData, impreseData, salData] = await Promise.all([
        Cantiere.get(cantiereId),
        Subappalto.filter({ cantiere_id: cantiereId }),
        Documento.filter({ entita_collegata_id: cantiereId, entita_collegata_tipo: 'cantiere' }, "-created_date", 50),
        Impresa.list("-created_date", 100),
        base44.entities.SAL.filter({ cantiere_id: cantiereId }, "-data_sal")
      ]);
      setCantiere(cantiereData);
      setSubappalti(subappaltiData);
      setDocumenti(documentiData);
      setImprese(impreseData);
      setSalList(salData);

      // Load PersoneEsterne in parallelo
      const personaPromises = [];
      
      if (cantiereData?.responsabile_sicurezza_id) {
        personaPromises.push(
          base44.entities.PersonaEsterna.filter({ id: cantiereData.responsabile_sicurezza_id })
            .then(persone => persone.length > 0 && setResponsabileSicurezza(persone[0]))
            .catch(err => console.error("Errore caricamento responsabile sicurezza:", err))
        );
      }
      
      if (cantiereData?.direttore_lavori_id) {
        personaPromises.push(
          base44.entities.PersonaEsterna.filter({ id: cantiereData.direttore_lavori_id })
            .then(persone => persone.length > 0 && setDirettoreLavori(persone[0]))
            .catch(err => console.error("Errore caricamento direttore lavori:", err))
        );
      }
      
      if (cantiereData?.responsabile_unico_procedimento_id) {
        personaPromises.push(
          base44.entities.PersonaEsterna.filter({ id: cantiereData.responsabile_unico_procedimento_id })
            .then(persone => persone.length > 0 && setResponsabileUnico(persone[0]))
            .catch(err => console.error("Errore caricamento RUP:", err))
        );
      }
      
      await Promise.all(personaPromises);
    } catch (error) {
      console.error("Errore nel caricamento dei dati del cantiere:", error);
    }
    setIsLoading(false);
  }, [setCantiere, setSubappalti, setDocumenti, setImprese, setSalList, setResponsabileSicurezza, setDirettoreLavori, setResponsabileUnico]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (id) {
      loadData(id);
    } else {
      setIsLoading(false);
    }
    
    loadUser();
  }, [loadData, loadUser]);

  const handleDocumentoSubmit = useCallback(async (formData) => {
    try {
      if (!cantiere?.id) {
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
  }, [cantiere?.id, loadData]);

  const handleCantiereSubmit = useCallback(async (formData) => {
    try {
      if (cantiere?.id) {
        await Cantiere.update(cantiere.id, formData);
        setShowCantiereForm(false);
        loadData(cantiere.id);
        toast.success("Cantiere aggiornato con successo!");
      }
    } catch (error) {
      console.error("Errore aggiornamento cantiere:", error);
      toast.error("Errore durante l'aggiornamento del cantiere");
    }
  }, [cantiere?.id, loadData]);

  const calcolaPercentualeCompletamento = useMemo(() => {
    if (!cantiere?.data_inizio || !cantiere?.data_fine_prevista) return 0;
    
    const oggi = new Date();
    const inizio = new Date(cantiere.data_inizio);
    const fine = new Date(cantiere.data_fine_prevista);
    
    const giorniTotali = differenceInDays(fine, inizio);
    const giorniTrascorsi = differenceInDays(oggi, inizio);
    
    if (giorniTrascorsi < 0) return 0;
    if (giorniTrascorsi > giorniTotali) return 100;
    
    return Math.round((giorniTrascorsi / giorniTotali) * 100);
  }, [cantiere?.data_inizio, cantiere?.data_fine_prevista]);

  const calcolaAvanzamentoSAL = useMemo(() => {
    if (!cantiere?.importo_contrattuale_oltre_iva || cantiere.importo_contrattuale_oltre_iva <= 0) return 0;
    
    const totaleCertificato = salList.reduce((sum, sal) => {
      if (sal.tipo_sal_dettaglio !== 'anticipazione') {
        return sum + (sal.imponibile || 0);
      }
      return sum;
    }, 0);
    
    const percentuale = (totaleCertificato / cantiere.importo_contrattuale_oltre_iva) * 100;
    return Math.min(Math.round(percentuale), 100);
  }, [cantiere?.importo_contrattuale_oltre_iva, salList]);

  const statoAvanzamento = useMemo(() => {
    const percentuale = calcolaPercentualeCompletamento;
    if (percentuale === 0) return { text: 'Da iniziare', color: 'text-slate-500', icon: Clock };
    if (percentuale < 100) return { text: 'In corso', color: 'text-blue-600', icon: Calendar };
    return { text: 'Completato', color: 'text-green-600', icon: CheckCircle2 };
  }, [calcolaPercentualeCompletamento]);

  const findImpresaId = useCallback((ragioneSociale) => {
    return imprese.find(i => 
      i.ragione_sociale.toLowerCase() === ragioneSociale.toLowerCase()
    )?.id;
  }, [imprese]);

  const sortImpresaByPriority = useCallback((imprese) => {
    const priorityOrder = {
      'singola': 1, 'mandataria': 2, 'mandante': 3, 'consorzio': 4,
      'consortile': 5, 'socio': 6, 'subappaltatore': 7, 'subaffidatario': 8, 'esecutrice': 9
    };

    return [...imprese].sort((a, b) => {
      if (a.isPrincipale !== b.isPrincipale) return a.isPrincipale ? -1 : 1;
      return (priorityOrder[a.tipo_impresa] || 999) - (priorityOrder[b.tipo_impresa] || 999);
    });
  }, []);

  const getFileType = useCallback((fileName) => {
    if (!fileName) return 'unknown';
    const cleanName = fileName.split('?')[0].split('#')[0];
    const extension = cleanName.split('.').pop().toLowerCase();
    if (['pdf'].includes(extension)) return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension)) return 'image';
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension)) return 'office';
    return 'other';
  }, []);

  const handleViewDocument = useCallback(async (documento) => {
    if (documento.file_uri || documento.cloud_file_url) {
      setIsLoadingViewer(true);
      setViewingDocument(documento);
      setShowViewer(true);
      setSignedUrl(null);

      try {
        let urlToLoad = documento.cloud_file_url;
        if (documento.file_uri) {
          const result = await base44.integrations.Core.CreateFileSignedUrl({
            file_uri: documento.file_uri,
            expires_in: 3600
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
  }, [setIsLoadingViewer, setViewingDocument, setShowViewer, setSignedUrl]);

  const handleDownloadDocument = useCallback(async (documento) => {
    if (documento.file_uri || documento.cloud_file_url) {
      try {
        let urlToDownload = documento.cloud_file_url;
        if (documento.file_uri) {
          const result = await base44.integrations.Core.CreateFileSignedUrl({
            file_uri: documento.file_uri,
            expires_in: 300
          });
          urlToDownload = result.signed_url;
        }
        
        const a = document.createElement('a');
        a.href = urlToDownload;
        a.download = documento.nome_documento;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(urlToDownload);
        a.remove();
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
  }, []);

  const renderDate = useCallback((dateString) => {
    if (!dateString) return "N/D";
    try {
      return format(new Date(dateString), 'dd MMM yyyy', { locale: it });
    } catch {
      return "Data non valida";
    }
  }, []);

  const renderImporto = useCallback((importo) => {
    if (importo === null || importo === undefined) return "N/D";
    return `€ ${Number(importo).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, []);

  const totaleCertificatoSAL = useMemo(() => 
    salList.reduce((sum, sal) => {
      if (sal.tipo_sal_dettaglio !== 'anticipazione') {
        return sum + (sal.imponibile || 0);
      }
      return sum;
    }, 0),
    [salList]
  );

  const allImprese = useMemo(() => {
    const imprese = [];
    
    if (cantiere?.azienda_appaltatrice_ragione_sociale) {
      imprese.push({
        ragione_sociale: cantiere.azienda_appaltatrice_ragione_sociale,
        tipo_impresa: cantiere.tipologia_azienda_appaltatrice || 'singola',
        indirizzo: cantiere.azienda_appaltatrice_indirizzo,
        cap: cantiere.azienda_appaltatrice_cap,
        citta: cantiere.azienda_appaltatrice_citta,
        telefono: cantiere.azienda_appaltatrice_telefono,
        email: cantiere.azienda_appaltatrice_email,
        cf: cantiere.azienda_appaltatrice_cf,
        piva: cantiere.azienda_appaltatrice_piva,
        isPrincipale: true
      });
    }
    
    if (cantiere?.partner_consorziati?.length > 0) {
      imprese.push(...cantiere.partner_consorziati.map(p => ({ ...p, isPrincipale: false })));
    }
    
    return sortImpresaByPriority(imprese);
  }, [cantiere, sortImpresaByPriority]);

  const subappaltiList = useMemo(() => 
    subappalti.filter(s => s.tipo_relazione === "subappalto" || !s.tipo_relazione),
    [subappalti]
  );
  
  const subaffidamentiList = useMemo(() => 
    subappalti.filter(s => s.tipo_relazione === "subaffidamento"),
    [subappalti]
  );

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
    visure_cciaa: "Visure CCIAA",
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

  const StatoIcon = statoAvanzamento.icon;

  return (
    <div className="p-6 bg-slate-50 min-h-full">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
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

        {/* Main Card - Header sempre visibile */}
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
          <CardContent>
            {/* Avanzamento Temporale */}
            <div className="mb-6 pb-6 border-b">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-900">Avanzamento Temporale</h3>
                <div className={`flex items-center gap-2 ${statoAvanzamento.color}`}>
                  <StatoIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">{statoAvanzamento.text}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Progress value={calcolaPercentualeCompletamento} className="h-3 flex-1" />
                <span className="text-lg font-bold text-slate-700 min-w-[60px] text-right">
                  {calcolaPercentualeCompletamento}%
                </span>
              </div>
            </div>

            {/* Avanzamento SAL - NEW BLOCK */}
            <div className="mb-6 pb-6 border-b">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-900">Avanzamento SAL</h3>
                <div className="flex items-center gap-2 text-indigo-600">
                  <BarChart3 className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {renderImporto(totaleCertificatoSAL)} / {renderImporto(cantiere.importo_contrattuale_oltre_iva)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Progress value={calcolaAvanzamentoSAL} className="h-3 flex-1" />
                <span className="text-lg font-bold text-indigo-700 min-w-[60px] text-right">
                  {calcolaAvanzamentoSAL}%
                </span>
              </div>
            </div>

            {/* Accordion con tutte le sezioni collassabili */}
            <Accordion type="multiple" defaultValue={["dati-generali"]} className="w-full">
              
              {/* Dati Generali */}
              <AccordionItem value="dati-generali">
                <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-indigo-600" />
                    Dati Generali
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                    <DetailField label="Indirizzo" value={`${cantiere.indirizzo || ''}, ${cantiere.indirizzo_citta || ''}`} />
                    <DetailField label="CAP" value={cantiere.indirizzo_cap} />
                    <DetailField label="Referente Interno" value={cantiere.referente_interno} />
                    {responsabileSicurezza && (
                      <DetailField 
                        label="Responsabile Sicurezza" 
                        value={`${responsabileSicurezza.nome} ${responsabileSicurezza.cognome}${responsabileSicurezza.qualifica ? ` - ${responsabileSicurezza.qualifica}` : ''}`} 
                      />
                    )}
                    <DetailField label="CIG" value={cantiere.codice_cig} />
                    <DetailField label="CUP" value={cantiere.codice_cup} />
                    <DetailField label="Stato" value={cantiere.stato || "In corso"} />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Date e Tempistiche */}
              <AccordionItem value="date-tempistiche">
                <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    Date e Tempistiche Lavori
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <DetailField label="Consegna Area" value={renderDate(cantiere.data_consegna_area)} />
                      <DetailField label="Inizio Lavori" value={renderDate(cantiere.data_inizio)} />
                      <DetailField label="Giorni Previsti" value={cantiere.giorni_previsti} />
                      <DetailField label="Fine Prevista" value={renderDate(cantiere.data_fine_prevista)} />
                    </div>
                    
                    {(cantiere.data_inizio_proroga_1 || cantiere.data_fine_proroga_1 || cantiere.data_inizio_proroga_2 || cantiere.data_fine_proroga_2) && (
                      <div className="border-t pt-4">
                        <h4 className="text-sm font-semibold text-slate-700 mb-3">Proroghe</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {cantiere.data_inizio_proroga_1 && <DetailField label="Inizio Proroga 1" value={renderDate(cantiere.data_inizio_proroga_1)} />}
                          {cantiere.data_fine_proroga_1 && <DetailField label="Fine Proroga 1" value={renderDate(cantiere.data_fine_proroga_1)} />}
                          {cantiere.data_inizio_proroga_2 && <DetailField label="Inizio Proroga 2" value={renderDate(cantiere.data_inizio_proroga_2)} />}
                          {cantiere.data_fine_proroga_2 && <DetailField label="Fine Proroga 2" value={renderDate(cantiere.data_fine_proroga_2)} />}
                        </div>
                      </div>
                    )}
                    
                    {(cantiere.data_inizio_sospensione || cantiere.data_fine_sospensione) && (
                      <div className="border-t pt-4">
                        <h4 className="text-sm font-semibold text-slate-700 mb-3">Sospensione</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {cantiere.data_inizio_sospensione && <DetailField label="Inizio Sospensione" value={renderDate(cantiere.data_inizio_sospensione)} />}
                          {cantiere.data_fine_sospensione && <DetailField label="Fine Sospensione" value={renderDate(cantiere.data_fine_sospensione)} />}
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Importi e Contratto */}
              <AccordionItem value="importi">
                <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Euro className="w-5 h-5 text-indigo-600" />
                    Importi e Contratto
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <DetailField label="Tipologia Appalto" value={cantiere.tipologia_appalto === 'a_corpo' ? 'A Corpo' : 'A Misura'} />
                      <DetailField label="Ribasso %" value={cantiere.percentuale_ribasso ? `${cantiere.percentuale_ribasso}%` : 'N/D'} />
                      <DetailField label="IVA %" value={cantiere.percentuale_iva ? `${cantiere.percentuale_iva}%` : 'N/D'} />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t pt-4">
                      <DetailField label="Importo Lavori (netto ribasso)" value={renderImporto(cantiere.importo_lavori_netto_ribasso)} />
                      <DetailField label="Importo Progettazione" value={renderImporto(cantiere.importo_progettazione)} />
                      <DetailField label="Oneri Sicurezza" value={renderImporto(cantiere.oneri_sicurezza_importo)} />
                      <DetailField label="Importo Contrattuale (oltre IVA)" value={renderImporto(cantiere.importo_contrattuale_oltre_iva)} />
                      <DetailField label="Importo Totale Contratto" value={renderImporto(cantiere.importo_contratto)} />
                    </div>
                    
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-slate-700">Documenti Contratto</h4>
                        {(currentUser?.role === 'admin' || currentUser?.perm_edit_cantieri) && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setShowDocumentoForm(true)}
                            className="text-xs"
                          >
                            <PlusCircle className="w-3 h-3 mr-1" />
                            Inserisci Doc
                          </Button>
                        )}
                      </div>
                      {(cantiere.contratto_data_firma || cantiere.contratto_file_url) ? (
                        <div className="grid grid-cols-2 gap-4">
                          {cantiere.contratto_data_firma && <DetailField label="Data Firma Contratto" value={renderDate(cantiere.contratto_data_firma)} />}
                          {cantiere.contratto_file_url && (
                            <div>
                              <p className="text-sm text-slate-500">File Contratto</p>
                              <a href={cantiere.contratto_file_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-sm">
                                Visualizza contratto
                              </a>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 italic">Nessun documento presente</p>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Polizze Assicurative */}
              <AccordionItem value="polizze">
                <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-indigo-600" />
                    Polizze Assicurative
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-6 pt-4">
                    {/* Polizza Definitiva */}
                    {(cantiere.polizza_definitiva_numero || cantiere.polizza_definitiva_url || cantiere.polizza_definitiva_scadenza) && (
                      <div>
                        <h4 className="text-md font-semibold text-slate-900 mb-3">Polizza Definitiva</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {cantiere.polizza_definitiva_numero && <DetailField label="Numero" value={cantiere.polizza_definitiva_numero} />}
                          {cantiere.polizza_definitiva_scadenza && <DetailField label="Scadenza" value={renderDate(cantiere.polizza_definitiva_scadenza)} />}
                          {cantiere.polizza_definitiva_durata && <DetailField label="Durata" value={cantiere.polizza_definitiva_durata} />}
                          {cantiere.polizza_definitiva_agenzia && <DetailField label="Agenzia" value={cantiere.polizza_definitiva_agenzia} />}
                          {cantiere.polizza_definitiva_url && (
                            <div>
                              <p className="text-sm text-slate-500">Documento</p>
                              <a href={cantiere.polizza_definitiva_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-sm">
                                Visualizza polizza
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Polizza CAR */}
                    {(cantiere.polizza_car_numero || cantiere.polizza_car_url || cantiere.polizza_car_scadenza) && (
                      <div className="border-t pt-4">
                        <h4 className="text-md font-semibold text-slate-900 mb-3">Polizza CAR</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {cantiere.polizza_car_numero && <DetailField label="Numero" value={cantiere.polizza_car_numero} />}
                          {cantiere.polizza_car_scadenza && <DetailField label="Scadenza" value={renderDate(cantiere.polizza_car_scadenza)} />}
                          {cantiere.polizza_car_durata && <DetailField label="Durata" value={cantiere.polizza_car_durata} />}
                          {cantiere.polizza_car_agenzia && <DetailField label="Agenzia" value={cantiere.polizza_car_agenzia} />}
                          {cantiere.polizza_car_url && (
                            <div>
                              <p className="text-sm text-slate-500">Documento</p>
                              <a href={cantiere.polizza_car_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-sm">
                                Visualizza polizza
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Polizza Anticipazione */}
                    {(cantiere.polizza_anticipazione_numero || cantiere.polizza_anticipazione_url || cantiere.polizza_anticipazione_scadenza) && (
                      <div className="border-t pt-4">
                        <h4 className="text-md font-semibold text-slate-900 mb-3">Polizza Anticipazione</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {cantiere.polizza_anticipazione_numero && <DetailField label="Numero" value={cantiere.polizza_anticipazione_numero} />}
                          {cantiere.polizza_anticipazione_scadenza && <DetailField label="Scadenza" value={renderDate(cantiere.polizza_anticipazione_scadenza)} />}
                          {cantiere.polizza_anticipazione_durata && <DetailField label="Durata" value={cantiere.polizza_anticipazione_durata} />}
                          {cantiere.polizza_anticipazione_agenzia && <DetailField label="Agenzia" value={cantiere.polizza_anticipazione_agenzia} />}
                          {cantiere.polizza_anticipazione_url && (
                            <div>
                              <p className="text-sm text-slate-500">Documento</p>
                              <a href={cantiere.polizza_anticipazione_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-sm">
                                Visualizza polizza
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Categorie e Classifiche SOA */}
              {cantiere.categorie_soa?.length > 0 && (
                <AccordionItem value="categorie-soa">
                  <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-indigo-600" />
                      Categorie e Classifiche SOA
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-4">
                      {cantiere.categorie_soa.map((item, index) => {
                        let categoria = '';
                        let classifica = '';
                        
                        if (typeof item === 'string') {
                          categoria = item;
                        } else if (typeof item === 'object' && item !== null) {
                          categoria = item.category || item.categoria || '';
                          classifica = item.classification || item.classifica || '';
                        }
                        
                        return (
                          <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <Badge variant="secondary" className="text-sm px-3 py-1">
                              {categoria}
                            </Badge>
                            {classifica && (
                              <Badge variant="outline" className="text-sm px-3 py-1 border-blue-300 text-blue-700">
                                Classifica {classifica}
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Committente */}
              {(cantiere.committente_ragione_sociale || cantiere.committente_referente_ragione_sociale) && (
                <AccordionItem value="committente">
                  <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-indigo-600" />
                      Committente
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-6 pt-4">
                      {cantiere.committente_ragione_sociale && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 mb-3">Dati Committente</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DetailField label="Ragione Sociale" value={cantiere.committente_ragione_sociale} />
                            <DetailField 
                              label="Indirizzo" 
                              value={[cantiere.committente_indirizzo, cantiere.committente_cap, cantiere.committente_citta].filter(Boolean).join(', ')} 
                            />
                            <DetailField label="Telefono/Fax" value={cantiere.committente_telefono} />
                            <DetailField label="Email" value={cantiere.committente_email} />
                            <DetailField label="Codice Fiscale" value={cantiere.committente_cf} />
                            <DetailField label="Partita IVA" value={cantiere.committente_piva} />
                          </div>
                        </div>
                      )}

                      {cantiere.committente_referente_ragione_sociale && (
                        <div className="border-t pt-4">
                          <h4 className="text-sm font-semibold text-slate-700 mb-3">Nella Persona Di (Referente)</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DetailField label="Ragione Sociale / Nome" value={cantiere.committente_referente_ragione_sociale} />
                            <DetailField 
                              label="Indirizzo" 
                              value={[cantiere.committente_referente_indirizzo, cantiere.committente_referente_cap, cantiere.committente_referente_citta].filter(Boolean).join(', ')} 
                            />
                            <DetailField label="Telefono/Fax" value={cantiere.committente_referente_telefono} />
                            <DetailField label="Email" value={cantiere.committente_referente_email} />
                            <DetailField label="Codice Fiscale" value={cantiere.committente_referente_cf} />
                            <DetailField label="Partita IVA" value={cantiere.committente_referente_piva} />
                          </div>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Direttore dei Lavori */}
              {direttoreLavori && (
                <AccordionItem value="direttore-lavori">
                  <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                    <div className="flex items-center gap-2">
                      <User className="w-5 h-5 text-indigo-600" />
                      Direttore dei Lavori
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                      <DetailField label="Nome e Cognome" value={`${direttoreLavori.nome} ${direttoreLavori.cognome}`} />
                      <DetailField label="Qualifica" value={direttoreLavori.qualifica} />
                      <DetailField label="Codice Fiscale" value={direttoreLavori.codice_fiscale} />
                      <DetailField label="Telefono" value={direttoreLavori.telefono} />
                      <DetailField label="Email" value={direttoreLavori.email} />
                      <DetailField 
                        label="Indirizzo" 
                        value={`${direttoreLavori.indirizzo || ''}, ${direttoreLavori.cap || ''} ${direttoreLavori.citta || ''}`} 
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Responsabile Unico del Procedimento */}
              {responsabileUnico && (
                <AccordionItem value="rup">
                  <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                    <div className="flex items-center gap-2">
                      <User className="w-5 h-5 text-indigo-600" />
                      Responsabile Unico del Procedimento (RUP)
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                      <DetailField label="Nome e Cognome" value={`${responsabileUnico.nome} ${responsabileUnico.cognome}`} />
                      <DetailField label="Qualifica" value={responsabileUnico.qualifica} />
                      <DetailField label="Codice Fiscale" value={responsabileUnico.codice_fiscale} />
                      <DetailField label="Telefono" value={responsabileUnico.telefono} />
                      <DetailField label="Email" value={responsabileUnico.email} />
                      <DetailField 
                        label="Indirizzo" 
                        value={`${responsabileUnico.indirizzo || ''}, ${responsabileUnico.cap || ''} ${responsabileUnico.citta || ''}`} 
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Impresa Appaltatrice */}
              {allImprese.length > 0 && (
                <AccordionItem value="impresa-appaltatrice">
                  <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-indigo-600" />
                      Impresa Appaltatrice
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-4">
                      {allImprese.map((impresa, index) => {
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
                        
                        return (
                          <Card key={index} className="bg-slate-50">
                            <CardContent className="p-4">
                              {impresaId ? (
                                <Link 
                                  to={createPageUrl(`ImpresaDashboard?id=${impresaId}`)} 
                                  className="block hover:bg-blue-50 -m-4 p-4 rounded-lg transition-colors"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="font-medium text-slate-900">{impresa.ragione_sociale || 'Nome non disponibile'}</span>
                                        {impresa.isPrincipale && (
                                          <Badge className="bg-indigo-600 text-white">PRINCIPALE</Badge>
                                        )}
                                      </div>
                                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                                        {impresa.piva && <span className="text-slate-600">P.IVA: {impresa.piva}</span>}
                                        {impresa.telefono && <span className="text-slate-600">Tel: {impresa.telefono}</span>}
                                        {impresa.email && <span className="text-slate-600">Email: {impresa.email}</span>}
                                      </div>
                                    </div>
                                    {impresa.tipo_impresa && (
                                      <Badge variant="secondary" className={`${tipologiaColors[impresa.tipo_impresa]} ml-2`}>
                                        {tipoLabels[impresa.tipo_impresa]}
                                      </Badge>
                                    )}
                                  </div>
                                </Link>
                              ) : (
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="font-medium text-slate-900">{impresa.ragione_sociale || 'Nome non disponibile'}</span>
                                    {impresa.isPrincipale && (
                                      <Badge className="bg-indigo-600 text-white">PRINCIPALE</Badge>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                                    {impresa.piva && <span className="text-slate-600">P.IVA: {impresa.piva}</span>}
                                    {impresa.telefono && <span className="text-slate-600">Tel: {impresa.telefono}</span>}
                                    {impresa.email && <span className="text-slate-600">Email: {impresa.email}</span>}
                                  </div>
                                  {impresa.tipo_impresa && (
                                    <Badge variant="secondary" className={`${tipologiaColors[impresa.tipo_impresa]} mt-2`}>
                                      {tipoLabels[impresa.tipo_impresa]}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Subappalti */}
              {subappaltiList.length > 0 && (
                <AccordionItem value="subappalti">
                  <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Handshake className="w-5 h-5 text-indigo-600" />
                      Subappalti ({subappaltiList.length})
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pt-4">
                      {subappaltiList.map(sub => {
                        const ragioneSociale = sub.ragione_sociale;
                        const impresaId = sub.impresa_id || findImpresaId(ragioneSociale);
                        return (
                          <Card key={sub.id} className="bg-slate-50">
                            <CardContent className="p-4">
                              {impresaId ? (
                                <Link 
                                  to={createPageUrl(`ImpresaDashboard?id=${impresaId}`)} 
                                  className="block hover:bg-blue-50 -m-4 p-4 rounded-lg transition-colors"
                                >
                                  <span className="font-medium text-slate-900">{ragioneSociale}</span>
                                  <div className="text-sm text-slate-600 mt-1">
                                    {sub.categoria_lavori && `${sub.categoria_lavori.replace(/_/g, ' ')} • `}
                                    {sub.importo_contratto && `€ ${Number(sub.importo_contratto).toLocaleString('it-IT')}`}
                                  </div>
                                </Link>
                              ) : (
                                <div>
                                  <span className="font-medium text-slate-900">{ragioneSociale}</span>
                                  <div className="text-sm text-slate-600 mt-1">
                                    {sub.categoria_lavori && `${sub.categoria_lavori.replace(/_/g, ' ')} • `}
                                    {sub.importo_contratto && `€ ${Number(sub.importo_contratto).toLocaleString('it-IT')}`}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Subaffidamenti */}
              {subaffidamentiList.length > 0 && (
                <AccordionItem value="subaffidamenti">
                  <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-indigo-600" />
                      Subaffidamenti ({subaffidamentiList.length})
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pt-4">
                      {subaffidamentiList.map(sub => {
                        const ragioneSociale = sub.ragione_sociale;
                        const impresaId = sub.impresa_id || findImpresaId(ragioneSociale);
                        return (
                          <Card key={sub.id} className="bg-slate-50">
                            <CardContent className="p-4">
                              {impresaId ? (
                                <Link 
                                  to={createPageUrl(`ImpresaDashboard?id=${impresaId}`)} 
                                  className="block hover:bg-blue-50 -m-4 p-4 rounded-lg transition-colors"
                                >
                                  <span className="font-medium text-slate-900">{ragioneSociale}</span>
                                  <div className="text-sm text-slate-600 mt-1">
                                    {sub.categoria_lavori && `${sub.categoria_lavori.replace(/_/g, ' ')} • `}
                                    {sub.importo_contratto && `€ ${Number(sub.importo_contratto).toLocaleString('it-IT')}`}
                                  </div>
                                </Link>
                              ) : (
                                <div>
                                  <span className="font-medium text-slate-900">{ragioneSociale}</span>
                                  <div className="text-sm text-slate-600 mt-1">
                                    {sub.categoria_lavori && `${sub.categoria_lavori.replace(/_/g, ' ')} • `}
                                    {sub.importo_contratto && `€ ${Number(sub.importo_contratto).toLocaleString('it-IT')}`}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Note Generali */}
              {cantiere.note && (
                <AccordionItem value="note">
                  <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                    <div className="flex items-center gap-2">
                      <StickyNote className="w-5 h-5 text-indigo-600" />
                      Note Generali
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pt-4 whitespace-pre-wrap text-slate-700">
                      {cantiere.note}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

            </Accordion>
          </CardContent>
        </Card>

        {/* Cards laterali - Documenti e Azioni rapide */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Documenti
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Verbale Inizio Lavori - AGGIUNTO */}
                {cantiere.verbale_inizio_lavori_url && (
                  <div className="mb-4 pb-4 border-b">
                    <div className="p-3 border rounded-md bg-indigo-50 border-indigo-200 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900">Verbale Inizio Lavori</p>
                        <p className="text-sm text-slate-500">Documento ufficiale</p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            try {
                              const result = await base44.integrations.Core.CreateFileSignedUrl({
                                file_uri: cantiere.verbale_inizio_lavori_url,
                                expires_in: 3600
                              });
                              window.open(result.signed_url, '_blank');
                            } catch (error) {
                              toast.error("Impossibile aprire il documento");
                            }
                          }}
                          title="Visualizza documento"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                
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
                ) : (
                  !cantiere.verbale_inizio_lavori_url && <p className="text-slate-500">Nessun documento caricato.</p>
                )}
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

        {/* Dialog Visualizzatore Documenti */}
        {showViewer && viewingDocument && (
          <>
            <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => {
              setShowViewer(false);
              setViewingDocument(null);
              setSignedUrl(null);
            }} />
            
            <div className="fixed inset-4 z-[70] bg-white rounded-lg shadow-xl flex flex-col">
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
              
              <div className="flex-1 w-full h-full min-h-0">
                {isLoadingViewer ? (
                  <div className="w-full h-full flex items-center justify-center bg-slate-50">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Caricamento documento...</p>
                  </div>
                ) : signedUrl ? (
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