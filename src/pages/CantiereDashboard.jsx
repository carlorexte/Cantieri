import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { backendClient } from '@/api/backendClient';
import { usePermissions } from '@/components/shared/PermissionGuard';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building2, Handshake, Briefcase, PlusCircle, BarChart3, Calendar, CheckCircle2, Clock, FileText, Download, ExternalLink, X, Edit, Users, Euro, Shield, ClipboardList, User, Tag, AlertTriangle, Boxes, FileSpreadsheet, Trash2 } from 'lucide-react';
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
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import DocumentViewer from '@/components/documenti/DocumentViewer';
import DocumentoForm from '../components/documenti/DocumentoForm';
import AlertScadenzeCard from '../components/cantiere-dashboard/AlertScadenzeCard';
import CantiereForm from '../components/cantieri/CantiereForm';
import AttivitaManager from '../components/cantieri/AttivitaManager';
import ProgressChart from '../components/cantiere-dashboard/ProgressChart';
import QuickNotes from '../components/cantiere-dashboard/QuickNotes';
import SALAlerts from '@/components/sal/SALAlerts';
import SegnalazioneForm from '@/components/cantieri/SegnalazioneForm';
import SegnalazioniList from '@/components/cantieri/SegnalazioniList';
import ImportComputoMetrico from '@/components/computo/ImportComputoMetrico';
import { supabaseDB } from '@/lib/supabaseClient';

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
  const [documentiSubappalti, setDocumentiSubappalti] = useState([]);
  const [imprese, setImprese] = useState([]);
  const [salList, setSalList] = useState([]);
  const [attivita, setAttivita] = useState([]);
  const [vociComputo, setVociComputo] = useState([]);
  const [linksComputo, setLinksComputo] = useState([]);
  const [permissions, setPermissions] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDocumentoForm, setShowDocumentoForm] = useState(false);
  const [showCantiereForm, setShowCantiereForm] = useState(false);
  const [showSegnalazioneForm, setShowSegnalazioneForm] = useState(false);
  const [showImportComputo, setShowImportComputo] = useState(false);
  const { user: currentUser, hasPermission, hasCantiereObjectPermission } = usePermissions();
  
  // Document Viewer State
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);

  const [responsabileSicurezza, setResponsabileSicurezza] = useState(null);
  const [direttoreLavori, setDirettoreLavori] = useState(null);
  const [responsabileUnico, setResponsabileUnico] = useState(null);
  const [segnalazioni, setSegnalazioni] = useState([]);

  // loadUser removed in favor of usePermissions

  const loadData = useCallback(async (cantiereId) => {
    setIsLoading(true);
    try {
      console.log("Loading dashboard data for:", cantiereId);
      // Use backend function to bypass RLS issues and ensure consistent visibility rules
      const response = await backendClient.functions.invoke('getCantiereDashboardData', { cantiere_id: cantiereId });
      
      if (response && response.data && !response.data.error) {
        const {
          cantiere: cantiereData,
          subappalti = [],
          documenti = [],
          imprese = [],
          sal = [],
          attivita = [],
          vociComputo: vociData = [],
          linksComputo: linksData = [],
          permissions: perms = {}
        } = response.data;

        console.log('[CantiereDashboard.loadData] Documenti ricevuti:', documenti.length);
        console.log('[CantiereDashboard.loadData] Documenti:', documenti.map(d => ({ id: d.id, nome: d.nome_documento, tipo: d.tipo_documento })));

        setCantiere(cantiereData);
        setSubappalti(subappalti);
        setDocumenti(documenti);

        // Carica documenti dei subappalti
        if (subappalti.length > 0) {
          supabaseDB.documenti.getBySubappaltiIds(subappalti.map(s => s.id))
            .then(docs => setDocumentiSubappalti(docs))
            .catch(err => console.error("Errore caricamento documenti subappalti:", err));
        } else {
          setDocumentiSubappalti([]);
        }
        setImprese(imprese);
        setSalList(sal);
        setAttivita(attivita);
        setVociComputo(vociData);
        setLinksComputo(linksData);
        setPermissions(perms);

        // Load PersoneEsterne
        if (cantiereData) {
          const personaPromises = [];
          
          if (cantiereData.responsabile_sicurezza_id) {
            personaPromises.push(
              backendClient.entities.PersonaEsterna.get(cantiereData.responsabile_sicurezza_id)
                .then(setResponsabileSicurezza)
                .catch(err => console.error("Errore responsabile sicurezza:", err))
            );
          }
          
          if (cantiereData.direttore_lavori_id) {
            personaPromises.push(
              backendClient.entities.PersonaEsterna.get(cantiereData.direttore_lavori_id)
                .then(setDirettoreLavori)
                .catch(err => console.error("Errore direttore lavori:", err))
            );
          }
          
          if (cantiereData.responsabile_unico_procedimento_id) {
            personaPromises.push(
              backendClient.entities.PersonaEsterna.get(cantiereData.responsabile_unico_procedimento_id)
                .then(setResponsabileUnico)
                .catch(err => console.error("Errore RUP:", err))
            );
          }
          
          await Promise.allSettled(personaPromises);
        }
      } else {
        const errorMsg = response?.data?.error || "Errore sconosciuto dal server";
        console.error("Errore caricamento dati cantiere:", errorMsg);
        toast.error("Errore caricamento dati: " + errorMsg);
        setCantiere(null); 
      }
    } catch (error) {
      console.error("Errore nel caricamento dei dati del cantiere:", error);
      toast.error("Errore di connessione al server API. Verifica che la connessione sia attiva.");
      setCantiere(null);
    } finally {
      setIsLoading(false);
    }
  }, [setCantiere, setSubappalti, setDocumenti, setImprese, setSalList, setResponsabileSicurezza, setDirettoreLavori, setResponsabileUnico]);

  const loadSegnalazioni = useCallback(async (cantiereId) => {
    try {
      const data = await supabaseDB.segnalazioni.getByCantiere(cantiereId);
      setSegnalazioni(data);
    } catch (err) {
      console.error('Errore caricamento segnalazioni:', err);
    }
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (id) {
      loadData(id);
      loadSegnalazioni(id);
    } else {
      setIsLoading(false);
    }
  }, [loadData, loadSegnalazioni]);

  const handleDocumentoSubmit = useCallback(async (formData) => {
    try {
      if (!cantiere?.id) {
        console.error("Cantiere ID non disponibile per l'associazione del documento.");
        toast.error("Errore: ID Cantiere non disponibile.");
        return;
      }
      await backendClient.entities.Documento.create({
        ...formData,
        entita_collegate: [{ entita_tipo: 'cantiere', entita_id: cantiere.id }],
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
        await backendClient.entities.Cantiere.update(cantiere.id, formData);
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

  const salProgressStats = useMemo(() => {
    const tasks = attivita.filter(item => item.tipo_attivita === 'task' && item.data_inizio && item.data_fine_prevista);
    if (!tasks.length) return null;

    const allStarts = tasks.map(i => new Date(i.data_inizio));
    const allEnds = tasks.map(i => new Date(i.data_fine_prevista));
    const projectStart = new Date(Math.min(...allStarts));
    const projectEnd = new Date(Math.max(...allEnds));
    const durataGiorni = Math.max(1, differenceInDays(projectEnd, projectStart) + 1);

    const today = new Date();
    const giorniTrascorsi = Math.max(0, Math.min(differenceInDays(today, projectStart), durataGiorni));
    const percTemporale = durataGiorni > 0 ? Math.round((giorniTrascorsi / durataGiorni) * 100) : 0;

    const valoreContratto =
      (parseFloat(cantiere?.importo_lavori_netto_ribasso) || 0) +
      (parseFloat(cantiere?.importo_progettazione) || 0) +
      (parseFloat(cantiere?.oneri_sicurezza_importo) || 0);
    const valoreAtteso = valoreContratto * percTemporale / 100;

    let totalDurata = 0;
    let sommaPct = 0;
    tasks.forEach(item => {
      const d = Math.max(1, differenceInDays(new Date(item.data_fine_prevista), new Date(item.data_inizio)) + 1);
      totalDurata += d;
      sommaPct += (item.percentuale_completamento || 0) * d;
    });
    const percReale = totalDurata > 0 ? Math.round(sommaPct / totalDurata) : 0;

    return { durataGiorni, giorniTrascorsi, percTemporale, valoreContratto, valoreAtteso, percReale, projectStart, projectEnd };
  }, [attivita, cantiere]);

  const salCurveData = useMemo(() => {
    if (!salProgressStats?.valoreContratto || salProgressStats.valoreContratto <= 0) return null;
    const { valoreContratto, durataGiorni, projectStart, projectEnd } = salProgressStats;

    const sortedSals = [...(salList || [])]
      .filter(s => s.data_sal)
      .sort((a, b) => new Date(a.data_sal) - new Date(b.data_sal));

    let cumulative = 0;
    const salThresholds = sortedSals
      .map(sal => {
        cumulative += parseFloat(sal.imponibile) || 0;
        return { id: sal.id, cumulativeAmount: cumulative, label: sal.descrizione || `SAL ${sal.numero_sal || ''}` };
      })
      .filter(t => t.cumulativeAmount > 0 && t.cumulativeAmount <= valoreContratto);

    const today = new Date();
    const startD = (projectStart instanceof Date) ? projectStart : new Date(projectStart || today);
    const dRate = Number(valoreContratto) / Math.max(1, Number(durataGiorni));
    const vContratto = Number(valoreContratto) || 0;
    const dDays = Number(durataGiorni) || 1;
    
    // Explicitly calculate to avoid lint errors
    const elapsed = differenceInDays(today, startD);
    const daysElapsed = Number(Math.max(0, elapsed));
    const todayAccrued = Number(Math.min(dRate * daysElapsed, vContratto));
    
    const nextSal = salThresholds.find(t => Number(t.cumulativeAmount) > todayAccrued);
    const toNextSal = nextSal ? (Number(nextSal.cumulativeAmount) - todayAccrued) : 0;

    return { valoreContratto: vContratto, durataGiorni: dDays, dailyRate: dRate, projectStart: startD, projectEnd, salThresholds, todayAccrued, nextSal, toNextSal };
  }, [salProgressStats, salList]);

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

  const handleOpenFile = useCallback((uri, nomeDoc) => {
    if (!uri) return;
    
    let finalName = nomeDoc;
    if (!finalName) {
      // Try to extract filename from URI
      try {
        const basename = uri.split('/').pop().split('?')[0];
        finalName = basename || "Documento";
      } catch (e) {
        finalName = "Documento";
      }
    }

    // Create a document object compatible with DocumentViewer
    const docObj = {
      file_uri: uri,
      nome_documento: finalName,
      // If it's already a full http url (cloud_file_url style), use it, otherwise assume it's a file_uri
      ...(uri.startsWith('http') ? { cloud_file_url: uri, file_uri: null } : { file_uri: uri })
    };

    setSelectedDocument(docObj);
    setViewerOpen(true);
  }, []);

  const handleViewDocument = useCallback((documento) => {
    const uri = documento.file_uri || documento.cloud_file_url;
    if (uri) {
      handleOpenFile(uri, documento.nome_documento);
    } else {
      toast.info(`Documento disponibile solo sul NAS: ${documento.percorso_nas}`);
    }
  }, [handleOpenFile]);

  const handleDownloadDocument = useCallback(async (documento) => {
    if (documento.file_uri || documento.cloud_file_url) {
      try {
        let urlToDownload = documento.cloud_file_url;
        if (documento.file_uri) {
          const result = await backendClient.integrations.Core.CreateFileSignedUrl({
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

  const handleDeleteDocument = useCallback(async (documento) => {
    if (!cantiere?.id) return;

    const confirmed = window.confirm(`Eliminare "${documento.nome_documento}"?`);
    if (!confirmed) return;

    try {
      if (documento.source === 'cantiere_field' && documento.source_field) {
        const updates = {};

        if (documento.source_field === 'verbali_consegna') {
          const currentVerbali = Array.isArray(cantiere.verbali_consegna) ? [...cantiere.verbali_consegna] : [];
          const nextVerbali = currentVerbali.filter((_, index) => index !== documento.source_index);
          updates.verbali_consegna = nextVerbali;
        } else {
          updates[documento.source_field] = null;
        }

        await backendClient.entities.Cantiere.update(cantiere.id, updates);
      } else {
        await backendClient.entities.Documento.delete(documento.id);
      }

      await loadData(cantiere.id);
      toast.success("Documento eliminato con successo.");
    } catch (error) {
      console.error("Errore eliminazione documento:", error);
      toast.error("Impossibile eliminare il documento.");
    }
  }, [cantiere, loadData]);

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
          
          <div className="flex gap-2">
            {(currentUser?.role === 'admin' || hasCantiereObjectPermission(cantiere, 'cantieri', 'edit')) && (
              <Button 
                onClick={() => setShowCantiereForm(true)}
                className=""
              >
                <Edit className="w-4 h-4 mr-2" />
                Modifica Cantiere
              </Button>
            )}
            <Button variant="secondary" onClick={() => setShowImportComputo(true)}>
              <FileText className="w-4 h-4 mr-2" />
              Importa Computo
            </Button>
          </div>
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
            {/* AVANZAMENTO CANTIERE (CALCOLO ESPRESSO) */}
            <div className="mb-8 pb-6 border-b">
              {(() => {
                // Calcolo Dati Generali
                const inizio = cantiere?.data_inizio ? new Date(cantiere.data_inizio) : null;
                const fine = cantiere?.data_fine_prevista ? new Date(cantiere.data_fine_prevista) : null;
                const oggi = new Date();
                
                const ggTotali = (inizio && fine) 
                  ? Math.max(1, differenceInDays(fine, inizio)) 
                  : (cantiere?.giorni_previsti || 1);
                
                let ggPassati = 0;
                if (inizio) {
                  ggPassati = Math.max(0, Math.min(differenceInDays(oggi, inizio), ggTotali));
                }

                const valoreAppalto = 
                  (parseFloat(cantiere?.importo_lavori_netto_ribasso) || 0) +
                  (parseFloat(cantiere?.importo_progettazione) || 0) +
                  (parseFloat(cantiere?.oneri_sicurezza_importo) || 0);

                const dailyRate = ggTotali > 0 ? valoreAppalto / ggTotali : 0;
                const valoreAttesoOggi = dailyRate * ggPassati;
                
                const percTemporale = ggTotali > 0 ? (ggPassati / ggTotali) * 100 : 0;

                // Calcolo Avanzamento Reale (Gantt + BIM 5D)
                let percReale = 0;
                
                // Se abbiamo dati BIM (voci di computo collegate), usiamo il peso finanziario reale
                if (linksComputo && linksComputo.length > 0 && vociComputo && vociComputo.length > 0) {
                  let totalBimValue = 0;
                  let earnedBimValue = 0;
                  
                  // Mappa prezzi per voce
                  const priceMap = vociComputo.reduce((acc, v) => {
                    if (v && v.id) acc[v.id] = v.prezzo_unitario || 0;
                    return acc;
                  }, {});

                  (attivita || []).forEach(att => {
                    const links = linksComputo.filter(l => l.attivita_id === att.id);
                    const attBimValue = links.reduce((sum, l) => sum + (l.quantita_allocata * (priceMap[l.voce_computo_id] || 0)), 0);
                    
                    totalBimValue += attBimValue;
                    earnedBimValue += attBimValue * ((att.percentuale_completamento || 0) / 100);
                  });

                  if (totalBimValue > 0) {
                    percReale = Math.round((earnedBimValue / totalBimValue) * 100);
                  }
                } else {
                  // Fallback: Peso temporale (durata task)
                  let totalTaskDuration = 0;
                  let weightedCompletion = 0;
                  const tasks = (attivita || []).filter(item => item && item.tipo_attivita === 'task' && item.data_inizio && item.data_fine);
                  
                  if (tasks.length > 0) {
                    tasks.forEach(task => {
                      const d = Math.max(1, differenceInDays(new Date(task.data_fine), new Date(task.data_inizio)) + 1);
                      totalTaskDuration += d;
                      weightedCompletion += (task.percentuale_completamento || 0) * d;
                    });
                  }
                  percReale = totalTaskDuration > 0 ? Math.round(weightedCompletion / totalTaskDuration) : 0;
                }
                
                // Calcolo Ritardo
                // Il ritardo (in giorni) è la differenza tra i giorni passati e i giorni "guadagnati" col lavoro reale.
                const giorniGuadagnati = (percReale / 100) * ggTotali;
                const delayDays = ggPassati - giorniGuadagnati;
                
                // Colorazione Barra
                let barColor = "bg-slate-300"; // fallback
                let textColor = "text-slate-700";
                let statusText = "Non Iniziato";
                
                if (ggPassati > 0 || percReale > 0) {
                  if (delayDays >= 40) {
                    barColor = "bg-red-500";
                    textColor = "text-red-700";
                    statusText = `Critico (> 40 gg di ritardo)`;
                  } else if (delayDays >= 20) {
                    barColor = "bg-orange-500";
                    textColor = "text-orange-700";
                    statusText = `Serio (> 20 gg di ritardo)`;
                  } else if (delayDays >= 10) {
                    barColor = "bg-amber-400";
                    textColor = "text-amber-700";
                    statusText = `Attenzione (> 10 gg di ritardo)`;
                  } else {
                    barColor = "bg-emerald-500";
                    textColor = "text-emerald-700";
                    statusText = `In Linea`;
                  }
                }
                if (percReale >= 100) {
                   barColor = "bg-emerald-500";
                   statusText = "Lavori Conclusi";
                }

                const formatC = (n) => `€ ${Math.round(n).toLocaleString('it-IT')}`;

                return (
                  <div>
                    <div className="flex items-start justify-between mb-8">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-indigo-600" />
                          Progressione Cantiere
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                          Appalto di {formatC(valoreAppalto)} ÷ {ggTotali} gg previsti = {formatC(dailyRate)} al giorno
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${barColor.replace('bg-', 'bg-').replace('500', '100').replace('400', '100')} ${barColor.replace('bg-', 'border-')} ${textColor}`}>
                          <div className={`w-2 h-2 rounded-full ${barColor}`}></div>
                          Stato: {statusText}
                        </div>
                      </div>
                    </div>

                    {/* Timeline Visiva Multicolore */}
                    <div className="mt-8 mb-6 relative">
                      {/* Traccia di Sfondo */}
                      <div className="h-6 bg-slate-100 rounded-lg border border-slate-200 overflow-hidden relative shadow-inner">
                        {/* Area Lavoro Reale Eseguito (Sempre Verde) */}
                        <div 
                          className="absolute top-0 bottom-0 left-0 bg-emerald-500 transition-all duration-700 ease-out z-10"
                          style={{ width: `${Math.min(100, Math.max(0, percReale))}%` }}
                        ></div>
                        
                        {/* Area Ritardo (Gap tra temporale e reale) - Colore da giallo a rosso */}
                        {ggPassati > 0 && percTemporale > percReale && (
                          <div
                            className={`absolute top-0 bottom-0 ${delayDays >= 40 ? 'bg-red-500' : delayDays >= 20 ? 'bg-orange-500' : 'bg-amber-400'} transition-all duration-700 ease-out z-0`}
                            style={{ 
                              left: `${percReale}%`, 
                              width: `${Math.min(100 - percReale, percTemporale - percReale)}%`,
                            }}
                          ></div>
                        )}

                        {/* Linee Step SAL */}
                        {(() => {
                           let sogliaRaw = cantiere?.soglia_sal;
                           if (!sogliaRaw && typeof window !== 'undefined' && cantiere?.id) {
                             sogliaRaw = window.localStorage.getItem(`soglia_sal_${cantiere.id}`);
                           }
                           const soglia = parseFloat(sogliaRaw);
                           if (soglia && soglia > 0 && valoreAppalto > 0) {
                             const stepsCount = Math.floor(valoreAppalto / soglia);
                             const markers = [];
                             for (let i = 1; i <= stepsCount; i++) {
                               const posXPct = ( (i * soglia) / valoreAppalto ) * 100;
                               if (posXPct < 100) {
                                 markers.push(
                                   <div key={`sal-${i}`} className="absolute top-0 bottom-0 w-[2px] bg-slate-800/20 z-20" style={{ left: `${posXPct}%` }}>
                                     <div className="absolute top-[28px] transform -translate-x-1/2 text-[10px] text-slate-500 font-bold whitespace-nowrap">
                                        SAL {i} ({formatC(soglia * i)})
                                     </div>
                                   </div>
                                 );
                               }
                             }
                             return markers;
                           }
                           return null;
                        })()}
                      </div>

                      {/* Linee di demarcazione & Testi Principali */}
                      <div className="absolute top-[-30px] right-0 text-xs font-bold text-slate-700">
                        {formatC(valoreAppalto)} ({ggTotali} gg)
                      </div>
                      <div className="absolute top-[-30px] left-0 text-xs font-bold text-slate-700">
                        0
                      </div>

                      {/* Marker "Oggi" */}
                      {inizio && ggPassati > 0 && (
                        <div 
                          className="absolute pointer-events-none mt-2 flex flex-col items-center transform -translate-x-1/2 transition-all duration-700 z-30"
                          style={{ left: `${Math.min(100, Math.max(0, percTemporale))}%`, top: '-40px' }}
                        >
                          <div className="bg-slate-800 text-white text-[11px] font-bold py-1 px-2 rounded whitespace-nowrap shadow-md flex flex-col items-center">
                            <span>Oggi: {ggPassati}° gg</span>
                            <span className="text-emerald-400">Atteso: {formatC(valoreAttesoOggi)}</span>
                          </div>
                          <div className="w-[2px] h-[36px] bg-slate-800 mt-[2px]"></div>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-4 border-t border-slate-100">
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase">Giorni Passati</p>
                        <p className="text-xl font-bold text-slate-800">{ggPassati} <span className="text-sm font-normal text-slate-500">su {ggTotali}</span></p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase">Valore Lavoro Atteso</p>
                        <p className="text-xl font-bold text-blue-700">{Math.round(percTemporale)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase">Avanzamento Reale</p>
                        <p className={`text-xl font-bold ${percReale >= percTemporale - 5 ? 'text-emerald-600' : 'text-orange-600'}`}>
                          {percReale}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase">Ritardo Giorno/Lavoro</p>
                        <p className="text-xl font-bold text-slate-800">
                          {delayDays > 0 ? (
                            <span className="text-red-500">+{Math.round(delayDays)} gg</span>
                          ) : (
                            <span className="text-emerald-500">{Math.round(delayDays)} gg</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {vociComputo && vociComputo.length > 0 && (
                      <div className="mt-8 pt-6 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                            <Boxes className="w-4 h-4 text-indigo-500" />
                            Sintesi Economica BIM 5D
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Totale Computo Metrico</p>
                            <p className="text-xl font-black text-slate-900">
                              {renderImporto(vociComputo.reduce((s, v) => s + (parseFloat(v?.importo_totale) || 0), 0))}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-1">Copertura appalto: {Math.round((vociComputo.reduce((s, v) => s + (parseFloat(v?.importo_totale) || 0), 0) / (valoreAppalto || 1)) * 100)}%</p>
                          </div>
                          
                          <div className="bg-indigo-50/30 rounded-xl p-4 border border-indigo-100/50">
                            <p className="text-[10px] font-bold text-indigo-400 uppercase mb-1">Valore Produzione Reale</p>
                            <p className="text-xl font-black text-indigo-700">
                              {renderImporto(vociComputo.reduce((acc, v) => {
                                const links = (linksComputo || []).filter(l => l.voce_computo_id === v.id);
                                const totalAllocated = links.reduce((s, l) => s + (parseFloat(l.quantita_allocata) || 0), 0);
                                const avgComp = links.length > 0 
                                  ? links.reduce((s, l) => {
                                      const att = attivita.find(a => a.id === l.attivita_id);
                                      return s + (parseFloat(att?.percentuale_completamento) || 0);
                                    }, 0) / links.length
                                  : 0;
                                return acc + (totalAllocated * (parseFloat(v.prezzo_unitario) || 0) * (avgComp / 100));
                              }, 0))}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <div className="h-1 flex-1 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500" style={{ width: `${percReale}%` }}></div>
                              </div>
                              <span className="text-[10px] font-bold text-indigo-600">{percReale}%</span>
                            </div>
                          </div>

                          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Disponibilità Prossimo SAL</p>
                            {cantiere?.soglia_sal > 0 ? (
                              <>
                                <p className="text-xl font-black text-slate-900">
                                  {renderImporto(Math.max(0, cantiere.soglia_sal - (totaleCertificatoSAL % cantiere.soglia_sal)))}
                                </p>
                                <p className="text-[10px] text-slate-500 mt-1">Al raggiungimento della soglia di {renderImporto(cantiere.soglia_sal)}</p>
                              </>
                            ) : (
                              <p className="text-sm text-slate-400 italic">Soglia SAL non impostata</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Avanzamento SAL - NEW BLOCK */}
            {permissions?.sal?.view && (
              <div className="mb-6 pb-6 border-b">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-900">Avanzamento SAL</h3>
                  <div className="flex items-center gap-2 text-indigo-600">
                    <BarChart3 className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {renderImporto(totaleCertificatoSAL)} / {renderImporto(cantiere?.importo_contrattuale_oltre_iva)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {(() => {
                    let indicatorColor = "bg-indigo-600";
                    if (salProgressStats) {
                      const delayDays = salProgressStats.giorniTrascorsi - (salProgressStats.percReale / 100 * salProgressStats.durataGiorni);
                      if (delayDays >= 40) {
                        indicatorColor = "bg-red-500";
                      } else if (delayDays >= 20) {
                        indicatorColor = "bg-orange-500";
                      } else if (delayDays >= 10) {
                        indicatorColor = "bg-amber-400";
                      } else {
                        indicatorColor = "bg-emerald-500";
                      }
                    }
                    return (
                      <>
                        <Progress value={calcolaAvanzamentoSAL} className="h-3 flex-1" indicatorClassName={indicatorColor} />
                        <span className="text-lg font-bold text-indigo-700 min-w-[60px] text-right">
                          {calcolaAvanzamentoSAL}%
                        </span>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Alert SAL - Nuova sezione */}
            {permissions?.sal?.view && (
              <div className="mb-6">
                <SALAlerts cantiereId={cantiere.id} />
              </div>
            )}

            {/* Accordion con tutte le sezioni collassabili */}
            <Accordion type="multiple" defaultValue={["dati-generali"]} className="w-full mt-6">

              {/* Attività */}
              <AccordionItem value="attivita">
                <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-indigo-600" />
                    Attività
                    {attivita.length > 0 && (
                      <span className="ml-2 text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5 font-normal">
                        {attivita.length}
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pt-2">
                    <AttivitaManager
                      cantiereId={cantiere.id}
                      attivitaList={attivita}
                      onUpdate={() => loadData(cantiere.id)}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
              
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
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-slate-700 mb-3">Date di Consegna Area</h4>
                      {cantiere.date_consegna && cantiere.date_consegna.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {cantiere.date_consegna.map((dc, idx) => (
                            <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                              <p className="font-medium text-slate-800 capitalize">{dc.tipo?.replace('_', ' ') || 'Generica'}: {renderDate(dc.data)}</p>
                              {dc.note && <p className="text-sm text-slate-500 italic">{dc.note}</p>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">Nessuna data di consegna specifica</p>
                      )}
                    </div>

                    <div className="border-t pt-4 mt-4">
                      <h4 className="text-sm font-semibold text-slate-700 mb-3">Tempistiche Lavori Principali</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <DetailField label="Inizio Lavori" value={renderDate(cantiere.data_inizio)} />
                        <DetailField label="Giorni Previsti" value={cantiere.giorni_previsti} />
                        <DetailField label="Fine Prevista" value={renderDate(cantiere.data_fine_prevista)} />
                        {cantiere.data_consegna_area && <DetailField label="Data Consegna Area (Precedente)" value={renderDate(cantiere.data_consegna_area)} />}
                      </div>
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
                        {(currentUser?.role === 'admin' || hasCantiereObjectPermission(cantiere, 'documenti', 'edit')) && (
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
                              <button 
                                onClick={() => handleOpenFile(cantiere.contratto_file_url, "Contratto")} 
                                className="text-indigo-600 hover:underline text-sm bg-transparent border-0 p-0 h-auto cursor-pointer"
                              >
                                Visualizza contratto
                              </button>
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
                              <button 
                                onClick={() => handleOpenFile(cantiere.polizza_definitiva_url, "Polizza Definitiva")} 
                                className="text-indigo-600 hover:underline text-sm bg-transparent border-0 p-0 h-auto cursor-pointer"
                              >
                                Visualizza polizza
                              </button>
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
                              <button 
                                onClick={() => handleOpenFile(cantiere.polizza_car_url, "Polizza CAR")} 
                                className="text-indigo-600 hover:underline text-sm bg-transparent border-0 p-0 h-auto cursor-pointer"
                              >
                                Visualizza polizza
                              </button>
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
                              <button 
                                onClick={() => handleOpenFile(cantiere.polizza_anticipazione_url, "Polizza Anticipazione")} 
                                className="text-indigo-600 hover:underline text-sm bg-transparent border-0 p-0 h-auto cursor-pointer"
                              >
                                Visualizza polizza
                              </button>
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
                                          <Badge className="bg-orange-500 text-white">PRINCIPALE</Badge>
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
                                      <Badge className="bg-orange-500 text-white">PRINCIPALE</Badge>
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

              {/* Segnalazioni Cantiere */}
              <AccordionItem value="segnalazioni">
                <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    Segnalazioni Cantiere
                    {segnalazioni.length > 0 && (
                      <span className="ml-2 text-xs bg-amber-100 text-amber-800 rounded-full px-2 py-0.5 font-normal">
                        {segnalazioni.length}
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pt-4">
                    <div className="flex justify-end mb-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowSegnalazioneForm(true)}
                      >
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Nuova Segnalazione
                      </Button>
                    </div>
                    <SegnalazioniList
                      segnalazioni={segnalazioni}
                      currentUser={currentUser}
                      onRefresh={() => loadSegnalazioni(cantiere.id)}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

            </Accordion>
          </CardContent>
        </Card>

        {/* Widgets: Grafici e Note */}
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <ProgressChart cantiere={cantiere} salList={salList} />
          </div>
          <div>
            <QuickNotes cantiere={cantiere} onUpdate={() => loadData(cantiere.id)} />
          </div>
        </div>

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
                              const result = await backendClient.integrations.Core.CreateFileSignedUrl({
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
                
                {(documenti.length > 0 || documentiSubappalti.length > 0) ? (
                  <div className="space-y-2">
                    {documenti.map(doc => (
                      <div key={doc.id} className="p-3 border rounded-md hover:bg-slate-50 flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">{doc.nome_documento}</p>
                          <p className="text-sm text-slate-500">
                            {tipoDocumentoLabels[doc.tipo_documento] || doc.tipo_documento}
                            {doc.data_scadenza && ` • Scad: ${format(new Date(doc.data_scadenza), 'dd/MM/yyyy')}`}
                            </p>
                            {doc.tags && doc.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {doc.tags.map((tag, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs bg-slate-100 text-slate-700 px-1.5 py-0 h-5">
                                  <Tag className="w-3 h-3 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            )}
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
                          {(currentUser?.role === 'admin' || hasCantiereObjectPermission(cantiere, 'documenti', 'delete')) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteDocument(doc)}
                              title="Elimina documento"
                              className="hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    {documentiSubappalti.map(doc => {
                      const sub = subappalti.find(s => s.id === doc.entita_collegata_id);
                      return (
                        <div key={doc.id} className="p-3 border border-orange-200 rounded-md hover:bg-orange-50 flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <p className="font-medium text-slate-900 truncate">{doc.nome_documento}</p>
                              <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-300 shrink-0">
                                Subappalto{sub ? ` • ${sub.ragione_sociale}` : ''}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-500">
                              {tipoDocumentoLabels[doc.categoria_principale] || doc.categoria_principale}
                              {doc.data_scadenza && ` • Scad: ${format(new Date(doc.data_scadenza), 'dd/MM/yyyy')}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            {(doc.file_uri || doc.cloud_file_url) && (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => handleViewDocument(doc)} title="Visualizza documento">
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDownloadDocument(doc)} title="Scarica documento">
                                  <Download className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  !cantiere.verbale_inizio_lavori_url && <p className="text-slate-500">Nessun documento caricato.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <AlertScadenzeCard documenti={documenti} attivita={attivita} cantiereId={cantiere.id} />
            
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

                {permissions?.sal?.view ? (
                  <Link to={createPageUrl(`SAL?cantiere_id=${cantiere.id}`)}>
                    <Button variant="outline" className="w-full justify-start">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Vai a SAL
                    </Button>
                  </Link>
                ) : (
                  <TooltipProvider>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <div className="w-full">
                          <Button variant="outline" className="w-full justify-start opacity-50 cursor-not-allowed" disabled>
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Vai a SAL
                          </Button>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p className="font-semibold text-red-500">Non hai i permessi per questa sezione</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                <Link to={createPageUrl(`Cronoprogramma?cantiere_id=${cantiere.id}`)}>
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="w-4 h-4 mr-2" />
                    Vai a Cronoprogramma
                  </Button>
                </Link>

                <Button 
                  variant="outline" 
                  className="w-full justify-start text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                  onClick={() => setShowImportComputo(true)}
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Importa Computo Metrico
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Document Viewer */}
        <DocumentViewer
          isOpen={viewerOpen}
          onClose={() => {
            setViewerOpen(false);
            setSelectedDocument(null);
          }}
          documento={selectedDocument}
        />

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
              cantieri={[cantiere]}
              subappalti={subappalti}
              imprese={imprese}
              sals={salList}
            />
          </DialogContent>
        </Dialog>

        {/* Dialog Form Segnalazione */}
        <Dialog open={showSegnalazioneForm} onOpenChange={setShowSegnalazioneForm}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nuova Segnalazione</DialogTitle>
            </DialogHeader>
            <SegnalazioneForm
              cantiereId={cantiere?.id}
              attivitaList={attivita}
              onSuccess={() => {
                setShowSegnalazioneForm(false);
                loadSegnalazioni(cantiere.id);
              }}
              onCancel={() => setShowSegnalazioneForm(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Dialog Form Cantiere */}
        <Dialog open={showCantiereForm}>
          <DialogContent 
            className="max-w-4xl max-h-[90vh] overflow-y-auto"
            onPointerDownOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
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
        <ImportComputoMetrico 
          isOpen={showImportComputo} 
          onOpenChange={setShowImportComputo}
          cantiereId={cantiere?.id}
          onSuccess={() => loadData(cantiere?.id)}
        />

      </div>
    </div>
  );
}
