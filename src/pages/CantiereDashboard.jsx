1: import React, { useState, useEffect, useMemo, useCallback } from 'react';
   2: import { base44 } from '@/api/base44Client';
   3: import { usePermissions } from '@/components/shared/PermissionGuard';
   4: import { Link } from 'react-router-dom';
   5: import { createPageUrl } from '@/utils';
   6: import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
   7: import { Button } from '@/components/ui/button';
   8: import { ArrowLeft, Building2, Handshake, Briefcase, PlusCircle, BarChart3, Calendar, CheckCircle2, Clock, FileText, Download, ExternalLink, X, Edit, Users, Euro, Shield, ClipboardList, User, Tag } from 'lucide-react';
   9: import { Progress } from "@/components/ui/progress";
  10: import {
  11:   Dialog,
  12:   DialogContent,
  13:   DialogHeader,
  14:   DialogTitle,
  15: } from "@/components/ui/dialog";
  16: import {
  17:   Accordion,
  18:   AccordionContent,
  19:   AccordionItem,
  20:   AccordionTrigger,
  21: } from "@/components/ui/accordion";
  22: import { format, differenceInDays } from 'date-fns';
  23: import { it } from 'date-fns/locale';
  24: import { toast } from "sonner";
  25: import { Badge } from '@/components/ui/badge';
  26: 
  27: import DocumentViewer from '@/components/documenti/DocumentViewer';
  28: import DocumentoForm from '../components/documenti/DocumentoForm';
  29: import AlertScadenzeCard from '../components/cantiere-dashboard/AlertScadenzeCard';
  30: import CantiereForm from '../components/cantieri/CantiereForm';
  31: import AttivitaManager from '../components/cantieri/AttivitaManager';
  32: import ProgressChart from '../components/cantiere-dashboard/ProgressChart';
  33: import QuickNotes from '../components/cantiere-dashboard/QuickNotes';
  34: 
  35: const DetailField = React.memo(({ label, value }) => (
  36:   <div>
  37:     <p className="text-sm text-slate-500">{label}</p>
  38:     <p className="font-medium text-slate-800">{value || 'N/D'}</p>
  39:   </div>
  40: ));
  41: DetailField.displayName = 'DetailField';
  42: 
  43: export default function CantiereDashboardPage() {
  44:   const [cantiere, setCantiere] = useState(null);
  45:   const [subappalti, setSubappalti] = useState([]);
  46:   const [documenti, setDocumenti] = useState([]);
  47:   const [imprese, setImprese] = useState([]);
  48:   const [salList, setSalList] = useState([]);
  49:   const [attivita, setAttivita] = useState([]);
  50:   const [isLoading, setIsLoading] = useState(true);
  51:   const [showDocumentoForm, setShowDocumentoForm] = useState(false);
  52:   const [showCantiereForm, setShowCantiereForm] = useState(false);
  53:   const { user: currentUser, hasPermission, hasCantiereObjectPermission } = usePermissions();
  54:   
  55:   // Document Viewer State
  56:   const [viewerOpen, setViewerOpen] = useState(false);
  57:   const [selectedDocument, setSelectedDocument] = useState(null);
  58: 
  59:   const [responsabileSicurezza, setResponsabileSicurezza] = useState(null);
  60:   const [direttoreLavori, setDirettoreLavori] = useState(null);
  61:   const [responsabileUnico, setResponsabileUnico] = useState(null);
  62: 
  63:   // loadUser removed in favor of usePermissions
  64: 
  65:   const loadData = useCallback(async (cantiereId) => {
  66:     setIsLoading(true);
  67:     try {
  68:       // Use individual fetches or Promise.allSettled to prevent one failure from blocking everything
  69:       const results = await Promise.allSettled([
  70:         base44.entities.Cantiere.get(cantiereId),
  71:         base44.entities.Subappalto.filter({ cantiere_id: cantiereId }),
  72:         // Punto 17: Cerca documenti collegati a questo cantiere
  73:         base44.entities.Documento.filter({
  74:           "$or": [
  75:             { "entita_collegata_id": cantiereId },
  76:             { "entita_collegate.entita_id": cantiereId }
  77:           ]
  78:         }, "-created_date", 50),
  79:         base44.entities.Impresa.list("-created_date", 100),
  80:         base44.entities.SAL.filter({ cantiere_id: cantiereId }, "-data_sal"),
  81:         base44.entities.Attivita.filter({ cantiere_id: cantiereId }, "-data_fine")
  82:       ]);
  83: 
  84:       const [cantiereRes, subappaltiRes, documentiRes, impreseRes, salRes, attivitaRes] = results;
  85: 
  86:       if (cantiereRes.status === 'fulfilled') {
  87:         setCantiere(cantiereRes.value);
  88:       } else {
  89:         console.error("Errore caricamento Cantiere:", cantiereRes.reason);
  90:         // If main cantiere fails, we can't show much, but maybe we can show error
  91:         toast.error("Errore caricamento dati cantiere");
  92:       }
  93: 
  94:       setSubappalti(subappaltiRes.status === 'fulfilled' ? subappaltiRes.value : []);
  95:       setDocumenti(documentiRes.status === 'fulfilled' ? documentiRes.value : []);
  96:       setImprese(impreseRes.status === 'fulfilled' ? impreseRes.value : []);
  97:       setSalList(salRes.status === 'fulfilled' ? salRes.value : []);
  98:       setAttivita(attivitaRes.status === 'fulfilled' ? attivitaRes.value : []);
  99: 
 100:       const cantiereData = cantiereRes.status === 'fulfilled' ? cantiereRes.value : null;
 101: 
 102:       // Load PersoneEsterne in parallelo
 103:       const personaPromises = [];
 104:       
 105:       if (cantiereData?.responsabile_sicurezza_id) {
 106:         personaPromises.push(
 107:           base44.entities.PersonaEsterna.filter({ id: cantiereData.responsabile_sicurezza_id })
 108:             .then(persone => persone.length > 0 && setResponsabileSicurezza(persone[0]))
 109:             .catch(err => console.error("Errore caricamento responsabile sicurezza:", err))
 110:         );
 111:       }
 112:       
 113:       if (cantiereData?.direttore_lavori_id) {
 114:         personaPromises.push(
 115:           base44.entities.PersonaEsterna.filter({ id: cantiereData.direttore_lavori_id })
 116:             .then(persone => persone.length > 0 && setDirettoreLavori(persone[0]))
 117:             .catch(err => console.error("Errore caricamento direttore lavori:", err))
 118:         );
 119:       }
 120:       
 121:       if (cantiereData?.responsabile_unico_procedimento_id) {
 122:         personaPromises.push(
 123:           base44.entities.PersonaEsterna.filter({ id: cantiereData.responsabile_unico_procedimento_id })
 124:             .then(persone => persone.length > 0 && setResponsabileUnico(persone[0]))
 125:             .catch(err => console.error("Errore caricamento RUP:", err))
 126:         );
 127:       }
 128:       
 129:       await Promise.all(personaPromises);
 130:     } catch (error) {
 131:       console.error("Errore nel caricamento dei dati del cantiere:", error);
 132:     }
 133:     setIsLoading(false);
 134:   }, [setCantiere, setSubappalti, setDocumenti, setImprese, setSalList, setResponsabileSicurezza, setDirettoreLavori, setResponsabileUnico]);
 135: 
 136:   useEffect(() => {
 137:     const urlParams = new URLSearchParams(window.location.search);
 138:     const id = urlParams.get('id');
 139: 
 140:     if (id) {
 141:       loadData(id);
 142:     } else {
 143:       setIsLoading(false);
 144:     }
 145:   }, [loadData]);
 146: 
 147:   const handleDocumentoSubmit = useCallback(async (formData) => {
 148:     try {
 149:       if (!cantiere?.id) {
 150:         console.error("Cantiere ID non disponibile per l'associazione del documento.");
 151:         toast.error("Errore: ID Cantiere non disponibile.");
 152:         return;
 153:       }
 154:       await base44.entities.Documento.create({
 155:         ...formData,
 156:         entita_collegata_id: cantiere.id,
 157:         entita_collegata_tipo: 'cantiere',
 158:       });
 159:       setShowDocumentoForm(false);
 160:       loadData(cantiere.id);
 161:       toast.success("Documento aggiunto con successo!");
 162:     } catch (error) {
 163:       console.error("Errore nel salvataggio del documento:", error);
 164:       toast.error("Errore durante l'aggiunta del documento.");
 165:     }
 166:   }, [cantiere?.id, loadData]);
 167: 
 168:   const handleCantiereSubmit = useCallback(async (formData) => {
 169:     try {
 170:       if (cantiere?.id) {
 171:         await base44.entities.Cantiere.update(cantiere.id, formData);
 172:         setShowCantiereForm(false);
 173:         loadData(cantiere.id);
 174:         toast.success("Cantiere aggiornato con successo!");
 175:       }
 176:     } catch (error) {
 177:       console.error("Errore aggiornamento cantiere:", error);
 178:       toast.error("Errore durante l'aggiornamento del cantiere");
 179:     }
 180:   }, [cantiere?.id, loadData]);
 181: 
 182:   const calcolaPercentualeCompletamento = useMemo(() => {
 183:     if (!cantiere?.data_inizio || !cantiere?.data_fine_prevista) return 0;
 184:     
 185:     const oggi = new Date();
 186:     const inizio = new Date(cantiere.data_inizio);
 187:     const fine = new Date(cantiere.data_fine_prevista);
 188:     
 189:     const giorniTotali = differenceInDays(fine, inizio);
 190:     const giorniTrascorsi = differenceInDays(oggi, inizio);
 191:     
 192:     if (giorniTrascorsi < 0) return 0;
 193:     if (giorniTrascorsi > giorniTotali) return 100;
 194:     
 195:     return Math.round((giorniTrascorsi / giorniTotali) * 100);
 196:   }, [cantiere?.data_inizio, cantiere?.data_fine_prevista]);
 197: 
 198:   const calcolaAvanzamentoSAL = useMemo(() => {
 199:     if (!cantiere?.importo_contrattuale_oltre_iva || cantiere.importo_contrattuale_oltre_iva <= 0) return 0;
 200:     
 201:     const totaleCertificato = salList.reduce((sum, sal) => {
 202:       if (sal.tipo_sal_dettaglio !== 'anticipazione') {
 203:         return sum + (sal.imponibile || 0);
 204:       }
 205:       return sum;
 206:     }, 0);
 207:     
 208:     const percentuale = (totaleCertificato / cantiere.importo_contrattuale_oltre_iva) * 100;
 209:     return Math.min(Math.round(percentuale), 100);
 210:   }, [cantiere?.importo_contrattuale_oltre_iva, salList]);
 211: 
 212:   const statoAvanzamento = useMemo(() => {
 213:     const percentuale = calcolaPercentualeCompletamento;
 214:     if (percentuale === 0) return { text: 'Da iniziare', color: 'text-slate-500', icon: Clock };
 215:     if (percentuale < 100) return { text: 'In corso', color: 'text-blue-600', icon: Calendar };
 216:     return { text: 'Completato', color: 'text-green-600', icon: CheckCircle2 };
 217:   }, [calcolaPercentualeCompletamento]);
 218: 
 219:   const findImpresaId = useCallback((ragioneSociale) => {
 220:     return imprese.find(i => 
 221:       i.ragione_sociale.toLowerCase() === ragioneSociale.toLowerCase()
 222:     )?.id;
 223:   }, [imprese]);
 224: 
 225:   const sortImpresaByPriority = useCallback((imprese) => {
 226:     const priorityOrder = {
 227:       'singola': 1, 'mandataria': 2, 'mandante': 3, 'consorzio': 4,
 228:       'consortile': 5, 'socio': 6, 'subappaltatore': 7, 'subaffidatario': 8, 'esecutrice': 9
 229:     };
 230: 
 231:     return [...imprese].sort((a, b) => {
 232:       if (a.isPrincipale !== b.isPrincipale) return a.isPrincipale ? -1 : 1;
 233:       return (priorityOrder[a.tipo_impresa] || 999) - (priorityOrder[b.tipo_impresa] || 999);
 234:     });
 235:   }, []);
 236: 
 237:   const handleOpenFile = useCallback((uri, nomeDoc) => {
 238:     if (!uri) return;
 239:     
 240:     let finalName = nomeDoc;
 241:     if (!finalName) {
 242:       // Try to extract filename from URI
 243:       try {
 244:         const basename = uri.split('/').pop().split('?')[0];
 245:         finalName = basename || "Documento";
 246:       } catch (e) {
 247:         finalName = "Documento";
 248:       }
 249:     }
 250: 
 251:     // Create a document object compatible with DocumentViewer
 252:     const docObj = {
 253:       file_uri: uri,
 254:       nome_documento: finalName,
 255:       // If it's already a full http url (cloud_file_url style), use it, otherwise assume it's a file_uri
 256:       ...(uri.startsWith('http') ? { cloud_file_url: uri, file_uri: null } : { file_uri: uri })
 257:     };
 258: 
 259:     setSelectedDocument(docObj);
 260:     setViewerOpen(true);
 261:   }, []);
 262: 
 263:   const handleViewDocument = useCallback((documento) => {
 264:     const uri = documento.file_uri || documento.cloud_file_url;
 265:     if (uri) {
 266:       handleOpenFile(uri, documento.nome_documento);
 267:     } else {
 268:       toast.info(`Documento disponibile solo sul NAS: ${documento.percorso_nas}`);
 269:     }
 270:   }, [handleOpenFile]);
 271: 
 272:   const handleDownloadDocument = useCallback(async (documento) => {
 273:     if (documento.file_uri || documento.cloud_file_url) {
 274:       try {
 275:         let urlToDownload = documento.cloud_file_url;
 276:         if (documento.file_uri) {
 277:           const result = await base44.integrations.Core.CreateFileSignedUrl({
 278:             file_uri: documento.file_uri,
 279:             expires_in: 300
 280:           });
 281:           urlToDownload = result.signed_url;
 282:         }
 283:         
 284:         const a = document.createElement('a');
 285:         a.href = urlToDownload;
 286:         a.download = documento.nome_documento;
 287:         document.body.appendChild(a);
 288:         a.click();
 289:         window.URL.revokeObjectURL(urlToDownload);
 290:         a.remove();
 291:         toast.success("Download avviato.");
 292:       } catch (error) {
 293:         console.error("Errore download documento:", error);
 294:         toast.error("Impossibile scaricare il documento.");
 295:       }
 296:     } else {
 297:       toast.info(`Documento disponibile solo sul NAS al percorso: ${documento.percorso_nas}`, {
 298:         duration: 5000
 299:       });
 300:     }
 301:   }, []);
 302: 
 303:   const renderDate = useCallback((dateString) => {
 304:     if (!dateString) return "N/D";
 305:     try {
 306:       return format(new Date(dateString), 'dd MMM yyyy', { locale: it });
 307:     } catch {
 308:       return "Data non valida";
 309:     }
 310:   }, []);
 311: 
 312:   const renderImporto = useCallback((importo) => {
 313:     if (importo === null || importo === undefined) return "N/D";
 314:     return `€ ${Number(importo).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
 315:   }, []);
 316: 
 317:   const totaleCertificatoSAL = useMemo(() => 
 318:     salList.reduce((sum, sal) => {
 319:       if (sal.tipo_sal_dettaglio !== 'anticipazione') {
 320:         return sum + (sal.imponibile || 0);
 321:       }
 322:       return sum;
 323:     }, 0),
 324:     [salList]
 325:   );
 326: 
 327:   const allImprese = useMemo(() => {
 328:     const imprese = [];
 329:     
 330:     if (cantiere?.azienda_appaltatrice_ragione_sociale) {
 331:       imprese.push({
 332:         ragione_sociale: cantiere.azienda_appaltatrice_ragione_sociale,
 333:         tipo_impresa: cantiere.tipologia_azienda_appaltatrice || 'singola',
 334:         indirizzo: cantiere.azienda_appaltatrice_indirizzo,
 335:         cap: cantiere.azienda_appaltatrice_cap,
 336:         citta: cantiere.azienda_appaltatrice_citta,
 337:         telefono: cantiere.azienda_appaltatrice_telefono,
 338:         email: cantiere.azienda_appaltatrice_email,
 339:         cf: cantiere.azienda_appaltatrice_cf,
 340:         piva: cantiere.azienda_appaltatrice_piva,
 341:         isPrincipale: true
 342:       });
 343:     }
 344:     
 345:     if (cantiere?.partner_consorziati?.length > 0) {
 346:       imprese.push(...cantiere.partner_consorziati.map(p => ({ ...p, isPrincipale: false })));
 347:     }
 348:     
 349:     return sortImpresaByPriority(imprese);
 350:   }, [cantiere, sortImpresaByPriority]);
 351: 
 352:   const subappaltiList = useMemo(() => 
 353:     subappalti.filter(s => s.tipo_relazione === "subappalto" || !s.tipo_relazione),
 354:     [subappalti]
 355:   );
 356:   
 357:   const subaffidamentiList = useMemo(() => 
 358:     subappalti.filter(s => s.tipo_relazione === "subaffidamento"),
 359:     [subappalti]
 360:   );
 361: 
 362:   if (isLoading) {
 363:     return <div className="p-6">Caricamento...</div>;
 364:   }
 365: 
 366:   if (!cantiere) {
 367:     return (
 368:       <div className="p-6 text-center">
 369:         <h2 className="text-xl">Cantiere non trovato.</h2>
 370:         <Link to={createPageUrl('Cantieri')}>
 371:           <Button variant="outline" className="mt-4">
 372:             <ArrowLeft className="w-4 h-4 mr-2" />
 373:             Torna ai Cantieri
 374:           </Button>
 375:         </Link>
 376:       </div>
 377:     );
 378:   }
 379: 
 380:   const tipologiaColors = {
 381:     'singola': 'bg-slate-100 text-slate-800',
 382:     'mandataria': 'bg-green-100 text-green-800',
 383:     'mandante': 'bg-teal-100 text-teal-800',
 384:     'consorzio': 'bg-violet-100 text-violet-800',
 385:     'consortile': 'bg-indigo-100 text-indigo-800',
 386:     'socio': 'bg-pink-100 text-pink-800',
 387:     'subappaltatore': 'bg-orange-100 text-orange-800',
 388:     'subaffidatario': 'bg-amber-100 text-amber-800',
 389:     'esecutrice': 'bg-cyan-100 text-cyan-800'
 390:   };
 391: 
 392:   const tipoDocumentoLabels = {
 393:     durc: "DURC",
 394:     visure: "Visure",
 395:     visure_cciaa: "Visure CCIAA",
 396:     certificazioni_soa: "Certificazioni SOA",
 397:     denuncia_inail: "Denuncia INAIL",
 398:     contratto_appalto: "Contratto Appalto",
 399:     contratto_esecutrice: "Contratto Esecutrice",
 400:     contratto_subappaltatori: "Contratto Subappaltatori",
 401:     consortile: "Consortile",
 402:     amministrativa_documentazione_gara: "Documentazione di Gara",
 403:     amministrativa_inviti_bandi: "Inviti - Bandi",
 404:     amministrativa_offerta: "Offerta",
 405:     amministrativa_delibere_aggiudicazione: "Delibere Aggiudicazione",
 406:     polizze_car: "Polizza CAR",
 407:     polizze_decennale: "Polizza Decennale Postuma",
 408:     polizze_rct: "Polizza RCT",
 409:     tecnica_capitolati: "Capitolati",
 410:     tecnica_computo_metrico: "Computo Metrico",
 411:     tecnica_elaborati_grafici: "Elaborati Grafici",
 412:     cantiere_verbale_consegna: "Verbale di Consegna",
 413:     cantiere_ultimazione_collaudi: "Ultimazione e Collaudi",
 414:     sicurezza_pos_esecutrice: "POS Esecutrice",
 415:     sicurezza_pos_subappaltatrice: "POS Subappaltatrice",
 416:     economica_sal: "SAL",
 417:     economica_fatture: "Fatture",
 418:     altro: "Altro"
 419:   };
 420: 
 421:   const StatoIcon = statoAvanzamento.icon;
 422: 
 423:   return (
 424:     <div className="p-6 bg-slate-50 min-h-full">
 425:       <div className="max-w-7xl mx-auto">
 426:         {/* Header */}
 427:         <div className="flex items-center justify-between mb-4">
 428:           <Link to={createPageUrl('Cantieri')}>
 429:             <Button variant="outline">
 430:               <ArrowLeft className="w-4 h-4 mr-2" />
 431:               Tutti i cantieri
 432:             </Button>
 433:           </Link>
 434:           
 435:           {(currentUser?.role === 'admin' || hasCantiereObjectPermission(cantiere, 'cantieri', 'edit')) && (
 436:             <Button 
 437:               onClick={() => setShowCantiereForm(true)}
 438:               className="bg-indigo-600 hover:bg-indigo-700"
 439:             >
 440:               <Edit className="w-4 h-4 mr-2" />
 441:               Modifica Cantiere
 442:             </Button>
 443:           )}
 444:         </div>
 445: 
 446:         {/* Main Card - Header sempre visibile */}
 447:         <Card className="mb-6 shadow-lg border-0">
 448:           <CardHeader>
 449:             <div className="flex items-center gap-4">
 450:               <Building2 className="w-8 h-8 text-blue-600" />
 451:               <div className="flex-1">
 452:                 <div className="flex items-center gap-3 mb-2">
 453:                   {cantiere.numero_cantiere && (
 454:                     <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300 font-mono text-base">
 455:                       #{cantiere.numero_cantiere}
 456:                     </Badge>
 457:                   )}
 458:                   <CardTitle className="text-3xl">{cantiere.denominazione}</CardTitle>
 459:                 </div>
 460:                 <p className="text-slate-500">{cantiere.oggetto_lavori}</p>
 461:               </div>
 462:             </div>
 463:           </CardHeader>
 464:           <CardContent>
 465:             {/* Avanzamento Temporale */}
 466:             <div className="mb-6 pb-6 border-b">
 467:             <div className="flex items-center justify-between mb-3">
 468:               <h3 className="font-semibold text-slate-900">Avanzamento Temporale</h3>
 469:               <div className={`flex items-center gap-2 ${statoAvanzamento.color}`}>
 470:                 <StatoIcon className="w-4 h-4" />
 471:                 <span className="text-sm font-medium">{statoAvanzamento.text}</span>
 472:               </div>
 473:             </div>
 474:             <div className="flex items-center gap-4 mb-2">
 475:               <Progress value={calcolaPercentualeCompletamento} className="h-3 flex-1" />
 476:               <span className="text-lg font-bold text-slate-700 min-w-[60px] text-right">
 477:                 {calcolaPercentualeCompletamento}%
 478:               </span>
 479:             </div>
 480:             <div className="flex justify-between text-sm text-slate-500">
 481:               <span>Inizio: {renderDate(cantiere.data_inizio)}</span>
 482:               <span>Fine: {renderDate(cantiere.data_fine_prevista)}</span>
 483:             </div>
 484:             </div>
 485: 
 486:             {/* Avanzamento SAL - NEW BLOCK */}
 487:             <div className="mb-6 pb-6 border-b">
 488:               <div className="flex items-center justify-between mb-3">
 489:                 <h3 className="font-semibold text-slate-900">Avanzamento SAL</h3>
 490:                 <div className="flex items-center gap-2 text-indigo-600">
 491:                   <BarChart3 className="w-4 h-4" />
 492:                   <span className="text-sm font-medium">
 493:                     {renderImporto(totaleCertificatoSAL)} / {renderImporto(cantiere.importo_contrattuale_oltre_iva)}
 494:                   </span>
 495:                 </div>
 496:               </div>
 497:               <div className="flex items-center gap-4">
 498:                 <Progress value={calcolaAvanzamentoSAL} className="h-3 flex-1" />
 499:                 <span className="text-lg font-bold text-indigo-700 min-w-[60px] text-right">
 500:                   {calcolaAvanzamentoSAL}%
 501:                 </span>
 502:               </div>
 503:             </div>
 504: 
 505:             <div className="mb-6">
 506:               <AttivitaManager 
 507:                 cantiereId={cantiere.id} 
 508:                 attivitaList={attivita} 
 509:                 onUpdate={() => loadData(cantiere.id)} 
 510:               />
 511:             </div>
 512: 
 513:             {/* Accordion con tutte le sezioni collassabili */}
 514:             <Accordion type="multiple" defaultValue={["dati-generali"]} className="w-full mt-6">
 515:               
 516:               {/* Dati Generali */}
 517:               <AccordionItem value="dati-generali">
 518:                 <AccordionTrigger className="text-lg font-semibold hover:no-underline">
 519:                   <div className="flex items-center gap-2">
 520:                     <Building2 className="w-5 h-5 text-indigo-600" />
 521:                     Dati Generali
 522:                   </div>
 523:                 </AccordionTrigger>
 524:                 <AccordionContent>
 525:                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
 526:                     <DetailField label="Indirizzo" value={`${cantiere.indirizzo || ''}, ${cantiere.indirizzo_citta || ''}`} />
 527:                     <DetailField label="CAP" value={cantiere.indirizzo_cap} />
 528:                     <DetailField label="Referente Interno" value={cantiere.referente_interno} />
 529:                     {responsabileSicurezza && (
 530:                       <DetailField 
 531:                         label="Responsabile Sicurezza" 
 532:                         value={`${responsabileSicurezza.nome} ${responsabileSicurezza.cognome}${responsabileSicurezza.qualifica ? ` - ${responsabileSicurezza.qualifica}` : ''}`} 
 533:                       />
 534:                     )}
 535:                     <DetailField label="CIG" value={cantiere.codice_cig} />
 536:                     <DetailField label="CUP" value={cantiere.codice_cup} />
 537:                     <DetailField label="Stato" value={cantiere.stato || "In corso"} />
 538:                   </div>
 539:                 </AccordionContent>
 540:               </AccordionItem>
 541: 
 542:               {/* Date e Tempistiche */}
 543:               <AccordionItem value="date-tempistiche">
 544:                 <AccordionTrigger className="text-lg font-semibold hover:no-underline">
 545:                   <div className="flex items-center gap-2">
 546:                     <Calendar className="w-5 h-5 text-indigo-600" />
 547:                     Date e Tempistiche Lavori
 548:                   </div>
 549:                 </AccordionTrigger>
 550:                 <AccordionContent>
 551:                   <div className="space-y-4 pt-4">
 552:                     <div className="space-y-4">
 553:                       <h4 className="text-sm font-semibold text-slate-700 mb-3">Date di Consegna Area</h4>
 554:                       {cantiere.date_consegna && cantiere.date_consegna.length > 0 ? (
 555:                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 556:                           {cantiere.date_consegna.map((dc, idx) => (
 557:                             <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
 558:                               <p className="font-medium text-slate-800 capitalize">{dc.tipo?.replace('_', ' ') || 'Generica'}: {renderDate(dc.data)}</p>
 559:                               {dc.note && <p className="text-sm text-slate-500 italic">{dc.note}</p>}
 560:                             </div>
 561:                           ))}
 562:                         </div>
 563:                       ) : (
 564:                         <p className="text-sm text-slate-500">Nessuna data di consegna specifica</p>
 565:                       )}
 566:                     </div>
 567: 
 568:                     <div className="border-t pt-4 mt-4">
 569:                       <h4 className="text-sm font-semibold text-slate-700 mb-3">Tempistiche Lavori Principali</h4>
 570:                       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 571:                         <DetailField label="Inizio Lavori" value={renderDate(cantiere.data_inizio)} />
 572:                         <DetailField label="Giorni Previsti" value={cantiere.giorni_previsti} />
 573:                         <DetailField label="Fine Prevista" value={renderDate(cantiere.data_fine_prevista)} />
 574:                         {cantiere.data_consegna_area && <DetailField label="Data Consegna Area (Precedente)" value={renderDate(cantiere.data_consegna_area)} />}
 575:                       </div>
 576:                     </div>
 577:                     
 578:                     {(cantiere.data_inizio_proroga_1 || cantiere.data_fine_proroga_1 || cantiere.data_inizio_proroga_2 || cantiere.data_fine_proroga_2) && (
 579:                       <div className="border-t pt-4">
 580:                         <h4 className="text-sm font-semibold text-slate-700 mb-3">Proroghe</h4>
 581:                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 582:                           {cantiere.data_inizio_proroga_1 && <DetailField label="Inizio Proroga 1" value={renderDate(cantiere.data_inizio_proroga_1)} />}
 583:                           {cantiere.data_fine_proroga_1 && <DetailField label="Fine Proroga 1" value={renderDate(cantiere.data_fine_proroga_1)} />}
 584:                           {cantiere.data_inizio_proroga_2 && <DetailField label="Inizio Proroga 2" value={renderDate(cantiere.data_inizio_proroga_2)} />}
 585:                           {cantiere.data_fine_proroga_2 && <DetailField label="Fine Proroga 2" value={renderDate(cantiere.data_fine_proroga_2)} />}
 586:                         </div>
 587:                       </div>
 588:                     )}
 589:                     
 590:                     {(cantiere.data_inizio_sospensione || cantiere.data_fine_sospensione) && (
 591:                       <div className="border-t pt-4">
 592:                         <h4 className="text-sm font-semibold text-slate-700 mb-3">Sospensione</h4>
 593:                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 594:                           {cantiere.data_inizio_sospensione && <DetailField label="Inizio Sospensione" value={renderDate(cantiere.data_inizio_sospensione)} />}
 595:                           {cantiere.data_fine_sospensione && <DetailField label="Fine Sospensione" value={renderDate(cantiere.data_fine_sospensione)} />}
 596:                         </div>
 597:                       </div>
 598:                     )}
 599:                   </div>
 600:                 </AccordionContent>
 601:               </AccordionItem>
 602: 
 603:               {/* Importi e Contratto */}
 604:               <AccordionItem value="importi">
 605:                 <AccordionTrigger className="text-lg font-semibold hover:no-underline">
 606:                   <div className="flex items-center gap-2">
 607:                     <Euro className="w-5 h-5 text-indigo-600" />
 608:                     Importi e Contratto
 609:                   </div>
 610:                 </AccordionTrigger>
 611:                 <AccordionContent>
 612:                   <div className="space-y-4 pt-4">
 613:                     <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
 614:                       <DetailField label="Tipologia Appalto" value={cantiere.tipologia_appalto === 'a_corpo' ? 'A Corpo' : 'A Misura'} />
 615:                       <DetailField label="Ribasso %" value={cantiere.percentuale_ribasso ? `${cantiere.percentuale_ribasso}%` : 'N/D'} />
 616:                       <DetailField label="IVA %" value={cantiere.percentuale_iva ? `${cantiere.percentuale_iva}%` : 'N/D'} />
 617:                     </div>
 618:                     
 619:                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t pt-4">
 620:                       <DetailField label="Importo Lavori (netto ribasso)" value={renderImporto(cantiere.importo_lavori_netto_ribasso)} />
 621:                       <DetailField label="Importo Progettazione" value={renderImporto(cantiere.importo_progettazione)} />
 622:                       <DetailField label="Oneri Sicurezza" value={renderImporto(cantiere.oneri_sicurezza_importo)} />
 623:                       <DetailField label="Importo Contrattuale (oltre IVA)" value={renderImporto(cantiere.importo_contrattuale_oltre_iva)} />
 624:                       <DetailField label="Importo Totale Contratto" value={renderImporto(cantiere.importo_contratto)} />
 625:                     </div>
 626:                     
 627:                     <div className="border-t pt-4">
 628:                       <div className="flex items-center justify-between mb-3">
 629:                         <h4 className="text-sm font-semibold text-slate-700">Documenti Contratto</h4>
 630:                         {(currentUser?.role === 'admin' || hasCantiereObjectPermission(cantiere, 'documenti', 'edit')) && (
 631:                           <Button 
 632:                             variant="outline" 
 633:                             size="sm"
 634:                             onClick={() => setShowDocumentoForm(true)}
 635:                             className="text-xs"
 636:                           >
 637:                             <PlusCircle className="w-3 h-3 mr-1" />
 638:                             Inserisci Doc
 639:                           </Button>
 640:                         )}
 641:                       </div>
 642:                       {(cantiere.contratto_data_firma || cantiere.contratto_file_url) ? (
 643:                         <div className="grid grid-cols-2 gap-4">
 644:                           {cantiere.contratto_data_firma && <DetailField label="Data Firma Contratto" value={renderDate(cantiere.contratto_data_firma)} />}
 645:                           {cantiere.contratto_file_url && (
 646:                             <div>
 647:                               <p className="text-sm text-slate-500">File Contratto</p>
 648:                               <button 
 649:                                 onClick={() => handleOpenFile(cantiere.contratto_file_url, "Contratto")} 
 650:                                 className="text-indigo-600 hover:underline text-sm bg-transparent border-0 p-0 h-auto cursor-pointer"
 651:                               >
 652:                                 Visualizza contratto
 653:                               </button>
 654:                             </div>
 655:                           )}
 656:                         </div>
 657:                       ) : (
 658:                         <p className="text-sm text-slate-500 italic">Nessun documento presente</p>
 659:                       )}
 660:                     </div>
 661:                   </div>
 662:                 </AccordionContent>
 663:               </AccordionItem>
 664: 
 665:               {/* Polizze Assicurative */}
 666:               <AccordionItem value="polizze">
 667:                 <AccordionTrigger className="text-lg font-semibold hover:no-underline">
 668:                   <div className="flex items-center gap-2">
 669:                     <Shield className="w-5 h-5 text-indigo-600" />
 670:                     Polizze Assicurative
 671:                   </div>
 672:                 </AccordionTrigger>
 673:                 <AccordionContent>
 674:                   <div className="space-y-6 pt-4">
 675:                     {/* Polizza Definitiva */}
 676:                     {(cantiere.polizza_definitiva_numero || cantiere.polizza_definitiva_url || cantiere.polizza_definitiva_scadenza) && (
 677:                       <div>
 678:                         <h4 className="text-md font-semibold text-slate-900 mb-3">Polizza Definitiva</h4>
 679:                         <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
 680:                           {cantiere.polizza_definitiva_numero && <DetailField label="Numero" value={cantiere.polizza_definitiva_numero} />}
 681:                           {cantiere.polizza_definitiva_scadenza && <DetailField label="Scadenza" value={renderDate(cantiere.polizza_definitiva_scadenza)} />}
 682:                           {cantiere.polizza_definitiva_durata && <DetailField label="Durata" value={cantiere.polizza_definitiva_durata} />}
 683:                           {cantiere.polizza_definitiva_agenzia && <DetailField label="Agenzia" value={cantiere.polizza_definitiva_agenzia} />}
 684:                           {cantiere.polizza_definitiva_url && (
 685:                             <div>
 686:                               <p className="text-sm text-slate-500">Documento</p>
 687:                               <button 
 688:                                 onClick={() => handleOpenFile(cantiere.polizza_definitiva_url, "Polizza Definitiva")} 
 689:                                 className="text-indigo-600 hover:underline text-sm bg-transparent border-0 p-0 h-auto cursor-pointer"
 690:                               >
 691:                                 Visualizza polizza
 692:                               </button>
 693:                             </div>
 694:                           )}
 695:                         </div>
 696:                       </div>
 697:                     )}
 698:                     
 699:                     {/* Polizza CAR */}
 700:                     {(cantiere.polizza_car_numero || cantiere.polizza_car_url || cantiere.polizza_car_scadenza) && (
 701:                       <div className="border-t pt-4">
 702:                         <h4 className="text-md font-semibold text-slate-900 mb-3">Polizza CAR</h4>
 703:                         <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
 704:                           {cantiere.polizza_car_numero && <DetailField label="Numero" value={cantiere.polizza_car_numero} />}
 705:                           {cantiere.polizza_car_scadenza && <DetailField label="Scadenza" value={renderDate(cantiere.polizza_car_scadenza)} />}
 706:                           {cantiere.polizza_car_durata && <DetailField label="Durata" value={cantiere.polizza_car_durata} />}
 707:                           {cantiere.polizza_car_agenzia && <DetailField label="Agenzia" value={cantiere.polizza_car_agenzia} />}
 708:                           {cantiere.polizza_car_url && (
 709:                             <div>
 710:                               <p className="text-sm text-slate-500">Documento</p>
 711:                               <button 
 712:                                 onClick={() => handleOpenFile(cantiere.polizza_car_url, "Polizza CAR")} 
 713:                                 className="text-indigo-600 hover:underline text-sm bg-transparent border-0 p-0 h-auto cursor-pointer"
 714:                               >
 715:                                 Visualizza polizza
 716:                               </button>
 717:                             </div>
 718:                           )}
 719:                         </div>
 720:                       </div>
 721:                     )}
 722:                     
 723:                     {/* Polizza Anticipazione */}
 724:                     {(cantiere.polizza_anticipazione_numero || cantiere.polizza_anticipazione_url || cantiere.polizza_anticipazione_scadenza) && (
 725:                       <div className="border-t pt-4">
 726:                         <h4 className="text-md font-semibold text-slate-900 mb-3">Polizza Anticipazione</h4>
 727:                         <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
 728:                           {cantiere.polizza_anticipazione_numero && <DetailField label="Numero" value={cantiere.polizza_anticipazione_numero} />}
 729:                           {cantiere.polizza_anticipazione_scadenza && <DetailField label="Scadenza" value={renderDate(cantiere.polizza_anticipazione_scadenza)} />}
 730:                           {cantiere.polizza_anticipazione_durata && <DetailField label="Durata" value={cantiere.polizza_anticipazione_durata} />}
 731:                           {cantiere.polizza_anticipazione_agenzia && <DetailField label="Agenzia" value={cantiere.polizza_anticipazione_agenzia} />}
 732:                           {cantiere.polizza_anticipazione_url && (
 733:                             <div>
 734:                               <p className="text-sm text-slate-500">Documento</p>
 735:                               <button 
 736:                                 onClick={() => handleOpenFile(cantiere.polizza_anticipazione_url, "Polizza Anticipazione")} 
 737:                                 className="text-indigo-600 hover:underline text-sm bg-transparent border-0 p-0 h-auto cursor-pointer"
 738:                               >
 739:                                 Visualizza polizza
 740:                               </button>
 741:                             </div>
 742:                           )}
 743:                         </div>
 744:                       </div>
 745:                     )}
 746:                   </div>
 747:                 </AccordionContent>
 748:               </AccordionItem>
 749: 
 750:               {/* Categorie e Classifiche SOA */}
 751:               {cantiere.categorie_soa?.length > 0 && (
 752:                 <AccordionItem value="categorie-soa">
 753:                   <AccordionTrigger className="text-lg font-semibold hover:no-underline">
 754:                     <div className="flex items-center gap-2">
 755:                       <ClipboardList className="w-5 h-5 text-indigo-600" />
 756:                       Categorie e Classifiche SOA
 757:                     </div>
 758:                   </AccordionTrigger>
 759:                   <AccordionContent>
 760:                     <div className="space-y-3 pt-4">
 761:                       {cantiere.categorie_soa.map((item, index) => {
 762:                         let categoria = '';
 763:                         let classifica = '';
 764:                         
 765:                         if (typeof item === 'string') {
 766:                           categoria = item;
 767:                         } else if (typeof item === 'object' && item !== null) {
 768:                           categoria = item.category || item.categoria || '';
 769:                           classifica = item.classification || item.classifica || '';
 770:                         }
 771:                         
 772:                         return (
 773:                           <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
 774:                             <Badge variant="secondary" className="text-sm px-3 py-1">
 775:                               {categoria}
 776:                             </Badge>
 777:                             {classifica && (
 778:                               <Badge variant="outline" className="text-sm px-3 py-1 border-blue-300 text-blue-700">
 779:                                 Classifica {classifica}
 780:                               </Badge>
 781:                             )}
 782:                           </div>
 783:                         );
 784:                       })}
 785:                     </div>
 786:                   </AccordionContent>
 787:                 </AccordionItem>
 788:               )}
 789: 
 790:               {/* Committente */}
 791:               {(cantiere.committente_ragione_sociale || cantiere.committente_referente_ragione_sociale) && (
 792:                 <AccordionItem value="committente">
 793:                   <AccordionTrigger className="text-lg font-semibold hover:no-underline">
 794:                     <div className="flex items-center gap-2">
 795:                       <Users className="w-5 h-5 text-indigo-600" />
 796:                       Committente
 797:                     </div>
 798:                   </AccordionTrigger>
 799:                   <AccordionContent>
 800:                     <div className="space-y-6 pt-4">
 801:                       {cantiere.committente_ragione_sociale && (
 802:                         <div>
 803:                           <h4 className="text-sm font-semibold text-slate-700 mb-3">Dati Committente</h4>
 804:                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 805:                             <DetailField label="Ragione Sociale" value={cantiere.committente_ragione_sociale} />
 806:                             <DetailField 
 807:                               label="Indirizzo" 
 808:                               value={[cantiere.committente_indirizzo, cantiere.committente_cap, cantiere.committente_citta].filter(Boolean).join(', ')} 
 809:                             />
 810:                             <DetailField label="Telefono/Fax" value={cantiere.committente_telefono} />
 811:                             <DetailField label="Email" value={cantiere.committente_email} />
 812:                             <DetailField label="Codice Fiscale" value={cantiere.committente_cf} />
 813:                             <DetailField label="Partita IVA" value={cantiere.committente_piva} />
 814:                           </div>
 815:                         </div>
 816:                       )}
 817: 
 818:                       {cantiere.committente_referente_ragione_sociale && (
 819:                         <div className="border-t pt-4">
 820:                           <h4 className="text-sm font-semibold text-slate-700 mb-3">Nella Persona Di (Referente)</h4>
 821:                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 822:                             <DetailField label="Ragione Sociale / Nome" value={cantiere.committente_referente_ragione_sociale} />
 823:                             <DetailField 
 824:                               label="Indirizzo" 
 825:                               value={[cantiere.committente_referente_indirizzo, cantiere.committente_referente_cap, cantiere.committente_referente_citta].filter(Boolean).join(', ')} 
 826:                             />
 827:                             <DetailField label="Telefono/Fax" value={cantiere.committente_referente_telefono} />
 828:                             <DetailField label="Email" value={cantiere.committente_referente_email} />
 829:                             <DetailField label="Codice Fiscale" value={cantiere.committente_referente_cf} />
 830:                             <DetailField label="Partita IVA" value={cantiere.committente_referente_piva} />
 831:                           </div>
 832:                         </div>
 833:                       )}
 834:                     </div>
 835:                   </AccordionContent>
 836:                 </AccordionItem>
 837:               )}
 838: 
 839:               {/* Direttore dei Lavori */}
 840:               {direttoreLavori && (
 841:                 <AccordionItem value="direttore-lavori">
 842:                   <AccordionTrigger className="text-lg font-semibold hover:no-underline">
 843:                     <div className="flex items-center gap-2">
 844:                       <User className="w-5 h-5 text-indigo-600" />
 845:                       Direttore dei Lavori
 846:                     </div>
 847:                   </AccordionTrigger>
 848:                   <AccordionContent>
 849:                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
 850:                       <DetailField label="Nome e Cognome" value={`${direttoreLavori.nome} ${direttoreLavori.cognome}`} />
 851:                       <DetailField label="Qualifica" value={direttoreLavori.qualifica} />
 852:                       <DetailField label="Codice Fiscale" value={direttoreLavori.codice_fiscale} />
 853:                       <DetailField label="Telefono" value={direttoreLavori.telefono} />
 854:                       <DetailField label="Email" value={direttoreLavori.email} />
 855:                       <DetailField 
 856:                         label="Indirizzo" 
 857:                         value={`${direttoreLavori.indirizzo || ''}, ${direttoreLavori.cap || ''} ${direttoreLavori.citta || ''}`} 
 858:                       />
 859:                     </div>
 860:                   </AccordionContent>
 861:                 </AccordionItem>
 862:               )}
 863: 
 864:               {/* Responsabile Unico del Procedimento */}
 865:               {responsabileUnico && (
 866:                 <AccordionItem value="rup">
 867:                   <AccordionTrigger className="text-lg font-semibold hover:no-underline">
 868:                     <div className="flex items-center gap-2">
 869:                       <User className="w-5 h-5 text-indigo-600" />
 870:                       Responsabile Unico del Procedimento (RUP)
 871:                     </div>
 872:                   </AccordionTrigger>
 873:                   <AccordionContent>
 874:                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
 875:                       <DetailField label="Nome e Cognome" value={`${responsabileUnico.nome} ${responsabileUnico.cognome}`} />
 876:                       <DetailField label="Qualifica" value={responsabileUnico.qualifica} />
 877:                       <DetailField label="Codice Fiscale" value={responsabileUnico.codice_fiscale} />
 878:                       <DetailField label="Telefono" value={responsabileUnico.telefono} />
 879:                       <DetailField label="Email" value={responsabileUnico.email} />
 880:                       <DetailField 
 881:                         label="Indirizzo" 
 882:                         value={`${responsabileUnico.indirizzo || ''}, ${responsabileUnico.cap || ''} ${responsabileUnico.citta || ''}`} 
 883:                       />
 884:                     </div>
 885:                   </AccordionContent>
 886:                 </AccordionItem>
 887:               )}
 888: 
 889:               {/* Impresa Appaltatrice */}
 890:               {allImprese.length > 0 && (
 891:                 <AccordionItem value="impresa-appaltatrice">
 892:                   <AccordionTrigger className="text-lg font-semibold hover:no-underline">
 893:                     <div className="flex items-center gap-2">
 894:                       <Briefcase className="w-5 h-5 text-indigo-600" />
 895:                       Impresa Appaltatrice
 896:                     </div>
 897:                   </AccordionTrigger>
 898:                   <AccordionContent>
 899:                     <div className="space-y-3 pt-4">
 900:                       {allImprese.map((impresa, index) => {
 901:                         const impresaId = findImpresaId(impresa.ragione_sociale);
 902:                         const tipoLabels = {
 903:                           singola: "Singola",
 904:                           mandataria: "Mandataria",
 905:                           mandante: "Mandante",
 906:                           consorzio: "Consorzio",
 907:                           consortile: "Consortile",
 908:                           socio: "Socio",
 909:                           subappaltatore: "Subappaltatore",
 910:                           subaffidatario: "Subaffidatario",
 911:                           esecutrice: "Esecutrice"
 912:                         };
 913:                         
 914:                         return (
 915:                           <Card key={index} className="bg-slate-50">
 916:                             <CardContent className="p-4">
 917:                               {impresaId ? (
 918:                                 <Link 
 919:                                   to={createPageUrl(`ImpresaDashboard?id=${impresaId}`)} 
 920:                                   className="block hover:bg-blue-50 -m-4 p-4 rounded-lg transition-colors"
 921:                                 >
 922:                                   <div className="flex items-center justify-between">
 923:                                     <div className="flex-1">
 924:                                       <div className="flex items-center gap-2 mb-2">
 925:                                         <span className="font-medium text-slate-900">{impresa.ragione_sociale || 'Nome non disponibile'}</span>
 926:                                         {impresa.isPrincipale && (
 927:                                           <Badge className="bg-indigo-600 text-white">PRINCIPALE</Badge>
 928:                                         )}
 929:                                       </div>
 930:                                       <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
 931:                                         {impresa.piva && <span className="text-slate-600">P.IVA: {impresa.piva}</span>}
 932:                                         {impresa.telefono && <span className="text-slate-600">Tel: {impresa.telefono}</span>}
 933:                                         {impresa.email && <span className="text-slate-600">Email: {impresa.email}</span>}
 934:                                       </div>
 935:                                     </div>
 936:                                     {impresa.tipo_impresa && (
 937:                                       <Badge variant="secondary" className={`${tipologiaColors[impresa.tipo_impresa]} ml-2`}>
 938:                                         {tipoLabels[impresa.tipo_impresa]}
 939:                                       </Badge>
 940:                                     )}
 941:                                   </div>
 942:                                 </Link>
 943:                               ) : (
 944:                                 <div>
 945:                                   <div className="flex items-center gap-2 mb-2">
 946:                                     <span className="font-medium text-slate-900">{impresa.ragione_sociale || 'Nome non disponibile'}</span>
 947:                                     {impresa.isPrincipale && (
 948:                                       <Badge className="bg-indigo-600 text-white">PRINCIPALE</Badge>
 949:                                     )}
 950:                                   </div>
 951:                                   <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
 952:                                     {impresa.piva && <span className="text-slate-600">P.IVA: {impresa.piva}</span>}
 953:                                     {impresa.telefono && <span className="text-slate-600">Tel: {impresa.telefono}</span>}
 954:                                     {impresa.email && <span className="text-slate-600">Email: {impresa.email}</span>}
 955:                                   </div>
 956:                                   {impresa.tipo_impresa && (
 957:                                     <Badge variant="secondary" className={`${tipologiaColors[impresa.tipo_impresa]} mt-2`}>
 958:                                       {tipoLabels[impresa.tipo_impresa]}
 959:                                     </Badge>
 960:                                   )}
 961:                                 </div>
 962:                               )}
 963:                             </CardContent>
 964:                           </Card>
 965:                         );
 966:                       })}
 967:                     </div>
 968:                   </AccordionContent>
 969:                 </AccordionItem>
 970:               )}
 971: 
 972:               {/* Subappalti */}
 973:               {subappaltiList.length > 0 && (
 974:                 <AccordionItem value="subappalti">
 975:                   <AccordionTrigger className="text-lg font-semibold hover:no-underline">
 976:                     <div className="flex items-center gap-2">
 977:                       <Handshake className="w-5 h-5 text-indigo-600" />
 978:                       Subappalti ({subappaltiList.length})
 979:                     </div>
 980:                   </AccordionTrigger>
 981:                   <AccordionContent>
 982:                     <div className="space-y-2 pt-4">
 983:                       {subappaltiList.map(sub => {
 984:                         const ragioneSociale = sub.ragione_sociale;
 985:                         const impresaId = sub.impresa_id || findImpresaId(ragioneSociale);
 986:                         return (
 987:                           <Card key={sub.id} className="bg-slate-50">
 988:                             <CardContent className="p-4">
 989:                               {impresaId ? (
 990:                                 <Link 
 991:                                   to={createPageUrl(`ImpresaDashboard?id=${impresaId}`)} 
 992:                                   className="block hover:bg-blue-50 -m-4 p-4 rounded-lg transition-colors"
 993:                                 >
 994:                                   <span className="font-medium text-slate-900">{ragioneSociale}</span>
 995:                                   <div className="text-sm text-slate-600 mt-1">
 996:                                     {sub.categoria_lavori && `${sub.categoria_lavori.replace(/_/g, ' ')} • `}
 997:                                     {sub.importo_contratto && `€ ${Number(sub.importo_contratto).toLocaleString('it-IT')}`}
 998:                                   </div>
 999:                                 </Link>
1000:                               ) : (
1001:                                 <div>
1002:                                   <span className="font-medium text-slate-900">{ragioneSociale}</span>
1003:                                   <div className="text-sm text-slate-600 mt-1">
1004:                                     {sub.categoria_lavori && `${sub.categoria_lavori.replace(/_/g, ' ')} • `}
1005:                                     {sub.importo_contratto && `€ ${Number(sub.importo_contratto).toLocaleString('it-IT')}`}
1006:                                   </div>
1007:                                 </div>
1008:                               )}
1009:                             </CardContent>
1010:                           </Card>
1011:                         );
1012:                       })}
1013:                     </div>
1014:                   </AccordionContent>
1015:                 </AccordionItem>
1016:               )}
1017: 
1018:               {/* Subaffidamenti */}
1019:               {subaffidamentiList.length > 0 && (
1020:                 <AccordionItem value="subaffidamenti">
1021:                   <AccordionTrigger className="text-lg font-semibold hover:no-underline">
1022:                     <div className="flex items-center gap-2">
1023:                       <Users className="w-5 h-5 text-indigo-600" />
1024:                       Subaffidamenti ({subaffidamentiList.length})
1025:                     </div>
1026:                   </AccordionTrigger>
1027:                   <AccordionContent>
1028:                     <div className="space-y-2 pt-4">
1029:                       {subaffidamentiList.map(sub => {
1030:                         const ragioneSociale = sub.ragione_sociale;
1031:                         const impresaId = sub.impresa_id || findImpresaId(ragioneSociale);
1032:                         return (
1033:                           <Card key={sub.id} className="bg-slate-50">
1034:                             <CardContent className="p-4">
1035:                               {impresaId ? (
1036:                                 <Link 
1037:                                   to={createPageUrl(`ImpresaDashboard?id=${impresaId}`)} 
1038:                                   className="block hover:bg-blue-50 -m-4 p-4 rounded-lg transition-colors"
1039:                                 >
1040:                                   <span className="font-medium text-slate-900">{ragioneSociale}</span>
1041:                                   <div className="text-sm text-slate-600 mt-1">
1042:                                     {sub.categoria_lavori && `${sub.categoria_lavori.replace(/_/g, ' ')} • `}
1043:                                     {sub.importo_contratto && `€ ${Number(sub.importo_contratto).toLocaleString('it-IT')}`}
1044:                                   </div>
1045:                                 </Link>
1046:                               ) : (
1047:                                 <div>
1048:                                   <span className="font-medium text-slate-900">{ragioneSociale}</span>
1049:                                   <div className="text-sm text-slate-600 mt-1">
1050:                                     {sub.categoria_lavori && `${sub.categoria_lavori.replace(/_/g, ' ')} • `}
1051:                                     {sub.importo_contratto && `€ ${Number(sub.importo_contratto).toLocaleString('it-IT')}`}
1052:                                   </div>
1053:                                 </div>
1054:                               )}
1055:                             </CardContent>
1056:                           </Card>
1057:                         );
1058:                       })}
1059:                     </div>
1060:                   </AccordionContent>
1061:                 </AccordionItem>
1062:               )}
1063: 
1064:             </Accordion>
1065:           </CardContent>
1066:         </Card>
1067: 
1068:         {/* Widgets: Grafici e Note */}
1069:         <div className="grid lg:grid-cols-3 gap-6 mb-6">
1070:           <div className="lg:col-span-2 h-80">
1071:             <ProgressChart cantiere={cantiere} salList={salList} />
1072:           </div>
1073:           <div className="h-80">
1074:             <QuickNotes cantiere={cantiere} onUpdate={() => loadData(cantiere.id)} />
1075:           </div>
1076:         </div>
1077: 
1078:         {/* Cards laterali - Documenti e Azioni rapide */}
1079:         <div className="grid lg:grid-cols-3 gap-6">
1080:           <div className="lg:col-span-2">
1081:             <Card className="shadow-lg border-0">
1082:               <CardHeader>
1083:                 <CardTitle className="flex items-center gap-2">
1084:                   <FileText className="w-5 h-5" />
1085:                   Documenti
1086:                 </CardTitle>
1087:               </CardHeader>
1088:               <CardContent>
1089:                 {/* Verbale Inizio Lavori - AGGIUNTO */}
1090:                 {cantiere.verbale_inizio_lavori_url && (
1091:                   <div className="mb-4 pb-4 border-b">
1092:                     <div className="p-3 border rounded-md bg-indigo-50 border-indigo-200 flex items-center justify-between">
1093:                       <div className="flex-1 min-w-0">
1094:                         <p className="font-medium text-slate-900">Verbale Inizio Lavori</p>
1095:                         <p className="text-sm text-slate-500">Documento ufficiale</p>
1096:                       </div>
1097:                       <div className="flex items-center gap-2 ml-2">
1098:                         <Button
1099:                           variant="ghost"
1100:                           size="icon"
1101:                           onClick={async () => {
1102:                             try {
1103:                               const result = await base44.integrations.Core.CreateFileSignedUrl({
1104:                                 file_uri: cantiere.verbale_inizio_lavori_url,
1105:                                 expires_in: 3600
1106:                               });
1107:                               window.open(result.signed_url, '_blank');
1108:                             } catch (error) {
1109:                               toast.error("Impossibile aprire il documento");
1110:                             }
1111:                           }}
1112:                           title="Visualizza documento"
1113:                         >
1114:                           <ExternalLink className="w-4 h-4" />
1115:                         </Button>
1116:                       </div>
1117:                     </div>
1118:                   </div>
1119:                 )}
1120:                 
1121:                 {documenti.length > 0 ? (
1122:                   <div className="space-y-2">
1123:                     {documenti.map(doc => (
1124:                       <div key={doc.id} className="p-3 border rounded-md hover:bg-slate-50 flex items-center justify-between">
1125:                         <div className="flex-1 min-w-0">
1126:                           <p className="font-medium text-slate-900 truncate">{doc.nome_documento}</p>
1127:                           <p className="text-sm text-slate-500">
1128:                             {tipoDocumentoLabels[doc.tipo_documento] || doc.tipo_documento}
1129:                             {doc.data_scadenza && ` • Scad: ${format(new Date(doc.data_scadenza), 'dd/MM/yyyy')}`}
1130:                             </p>
1131:                             {doc.tags && doc.tags.length > 0 && (
1132:                             <div className="flex flex-wrap gap-1 mt-1">
1133:                               {doc.tags.map((tag, idx) => (
1134:                                 <Badge key={idx} variant="secondary" className="text-xs bg-slate-100 text-slate-700 px-1.5 py-0 h-5">
1135:                                   <Tag className="w-3 h-3 mr-1" />
1136:                                   {tag}
1137:                                 </Badge>
1138:                               ))}
1139:                             </div>
1140:                             )}
1141:                             </div>
1142:                             <div className="flex items-center gap-2 ml-2">
1143:                           {(doc.file_uri || doc.cloud_file_url) && (
1144:                             <>
1145:                               <Button
1146:                                 variant="ghost"
1147:                                 size="icon"
1148:                                 onClick={() => handleViewDocument(doc)}
1149:                                 title="Visualizza documento"
1150:                               >
1151:                                 <ExternalLink className="w-4 h-4" />
1152:                               </Button>
1153:                               <Button
1154:                                 variant="ghost"
1155:                                 size="icon"
1156:                                 onClick={() => handleDownloadDocument(doc)}
1157:                                 title="Scarica documento"
1158:                               >
1159:                                 <Download className="w-4 h-4" />
1160:                               </Button>
1161:                             </>
1162:                           )}
1163:                         </div>
1164:                       </div>
1165:                     ))}
1166:                   </div>
1167:                 ) : (
1168:                   !cantiere.verbale_inizio_lavori_url && <p className="text-slate-500">Nessun documento caricato.</p>
1169:                 )}
1170:               </CardContent>
1171:             </Card>
1172:           </div>
1173: 
1174:           <div className="space-y-6">
1175:             <AlertScadenzeCard documenti={documenti} attivita={attivita} />
1176:             
1177:             <Card className="shadow-lg border-0">
1178:               <CardHeader>
1179:                 <CardTitle>Azioni Rapide</CardTitle>
1180:               </CardHeader>
1181:               <CardContent className="space-y-3">
1182:                 <Button 
1183:                   variant="outline" 
1184:                   className="w-full justify-start"
1185:                   onClick={() => setShowDocumentoForm(true)}
1186:                 >
1187:                   <PlusCircle className="w-4 h-4 mr-2" />
1188:                   Aggiungi Documento
1189:                 </Button>
1190: 
1191:                 <Link to={createPageUrl(`SAL?cantiere_id=${cantiere.id}`)}>
1192:                   <Button variant="outline" className="w-full justify-start">
1193:                     <BarChart3 className="w-4 h-4 mr-2" />
1194:                     Vai a SAL
1195:                   </Button>
1196:                 </Link>
1197: 
1198:                 <Link to={createPageUrl(`Cronoprogramma?cantiere_id=${cantiere.id}`)}>
1199:                   <Button variant="outline" className="w-full justify-start">
1200:                     <Calendar className="w-4 h-4 mr-2" />
1201:                     Vai a Cronoprogramma
1202:                   </Button>
1203:                 </Link>
1204:               </CardContent>
1205:             </Card>
1206:           </div>
1207:         </div>
1208: 
1209:         {/* Document Viewer */}
1210:         <DocumentViewer
1211:           isOpen={viewerOpen}
1212:           onClose={() => {
1213:             setViewerOpen(false);
1214:             setSelectedDocument(null);
1215:           }}
1216:           documento={selectedDocument}
1217:         />
1218: 
1219:         {/* Dialog Form Documento */}
1220:         <Dialog open={showDocumentoForm} onOpenChange={setShowDocumentoForm}>
1221:           <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
1222:             <DialogHeader>
1223:               <DialogTitle>Nuovo Documento per il Cantiere</DialogTitle>
1224:             </DialogHeader>
1225:             <DocumentoForm
1226:               onSubmit={handleDocumentoSubmit}
1227:               onCancel={() => setShowDocumentoForm(false)}
1228:               initialEntity={{ id: cantiere.id, type: 'cantiere' }}
1229:               cantieri={[cantiere]}
1230:               subappalti={subappalti}
1231:               imprese={imprese}
1232:               sals={salList}
1233:             />
1234:           </DialogContent>
1235:         </Dialog>
1236: 
1237:         {/* Dialog Form Cantiere */}
1238:         <Dialog open={showCantiereForm}>
1239:           <DialogContent 
1240:             className="max-w-4xl max-h-[90vh] overflow-y-auto"
1241:             onPointerDownOutside={(e) => e.preventDefault()}
1242:             onEscapeKeyDown={(e) => e.preventDefault()}
1243:           >
1244:             <DialogHeader>
1245:               <DialogTitle>Modifica Cantiere</DialogTitle>
1246:             </DialogHeader>
1247:             <CantiereForm
1248:               cantiere={cantiere}
1249:               onSubmit={handleCantiereSubmit}
1250:               onCancel={() => setShowCantiereForm(false)}
1251:             />
1252:           </DialogContent>
1253:         </Dialog>
1254: 
1255: 
1256:       </div>
1257:     </div>
1258:   );
1259: }