
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format, differenceInDays, isPast } from 'date-fns';
import { it } from 'date-fns/locale';
import { CheckCircle2, Clock, Calendar } from 'lucide-react';
import { base44 } from "@/api/base44Client";

const DetailField = ({ label, value, className = "" }) => (
  <div className={className}>
    <p className="text-sm font-medium text-slate-500">{label}</p>
    <p className="text-base text-slate-900">{value || "N/D"}</p>
  </div>
);

const Section = ({ title, children }) => (
  <Card>
    <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      {children}
    </CardContent>
  </Card>
);

export default function CantiereDetail({ cantiere }) {
  const [responsabileSicurezza, setResponsabileSicurezza] = React.useState(null);
  const [direttoreLavori, setDirettoreLavori] = React.useState(null);
  const [responsabileUnico, setResponsabileUnico] = React.useState(null);

  React.useEffect(() => {
    loadPersoneEsterne();
  }, [cantiere]);

  const loadPersoneEsterne = async () => {
    setResponsabileSicurezza(null);
    setDirettoreLavori(null);
    setResponsabileUnico(null);

    if (cantiere?.responsabile_sicurezza_id) {
      try {
        const persone = await base44.entities.PersonaEsterna.filter({ id: cantiere.responsabile_sicurezza_id });
        if (persone.length > 0) setResponsabileSicurezza(persone[0]);
      } catch (error) {
        console.error("Errore caricamento responsabile sicurezza:", error);
      }
    }
    
    if (cantiere?.direttore_lavori_id) {
      try {
        const persone = await base44.entities.PersonaEsterna.filter({ id: cantiere.direttore_lavori_id });
        if (persone.length > 0) setDirettoreLavori(persone[0]);
      } catch (error) {
        console.error("Errore caricamento direttore lavori:", error);
      }
    }
    
    if (cantiere?.responsabile_unico_procedimento_id) {
      try {
        const persone = await base44.entities.PersonaEsterna.filter({ id: cantiere.responsabile_unico_procedimento_id });
        if (persone.length > 0) setResponsabileUnico(persone[0]);
      } catch (error) {
        console.error("Errore caricamento RUP:", error);
      }
    }
  };

  const renderDate = (dateString) => {
    if (!dateString) return "N/D";
    try {
      return format(new Date(dateString), 'dd MMM yyyy', { locale: it });
    } catch {
      return "Data non valida";
    }
  };

  const renderImporto = (importo) => {
    if (importo === null || importo === undefined) return "N/D";
    return `€ ${Number(importo).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const renderTipologiaAppaltatrice = (tipologia) => {
    const tipologieLabels = {
      singola: "Singola",
      mandataria: "Mandataria",
      mandante: "Mandante",
      consorzio: "Consorzio",
      consortile: "Consortile",
      socio: "Socio",
      subappaltatore: "Subappaltatore",
      subaffidatario: "Subaffidatario"
    };
    return tipologieLabels[tipologia] || tipologia || "N/D";
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

  const hasCommittenteData = cantiere.committente_ragione_sociale || 
                             cantiere.committente_indirizzo || 
                             cantiere.committente_email ||
                             cantiere.committente_telefono ||
                             cantiere.committente_cf ||
                             cantiere.committente_piva;
  
  const hasCommittenteReferenteData = cantiere.committente_referente_ragione_sociale ||
                                      cantiere.committente_referente_indirizzo ||
                                      cantiere.committente_referente_email ||
                                      cantiere.committente_referente_telefono ||
                                      cantiere.committente_referente_cf ||
                                      cantiere.committente_referente_piva;
  
  const hasDirettoreData = direttoreLavori !== null;
  const hasResponsabileData = responsabileUnico !== null;
  const hasResponsabileSicurezzaData = responsabileSicurezza !== null;

  const percentualeCompletamento = calcolaPercentualeCompletamento();
  const statoAvanzamento = getStatoAvanzamento();
  const StatoIcon = statoAvanzamento.icon;

  return (
    <div className="space-y-6">
      <Section title="Informazioni Generali">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <DetailField label="Denominazione" value={cantiere.denominazione} />
          <DetailField label="Referente Interno" value={cantiere.referente_interno} />
          {hasResponsabileSicurezzaData && (
            <DetailField 
              label="Responsabile Sicurezza" 
              value={`${responsabileSicurezza.nome || ''} ${responsabileSicurezza.cognome || ''}${responsabileSicurezza.qualifica ? ` - ${responsabileSicurezza.qualifica}` : ''}`} 
            />
          )}
          <DetailField label="Oggetto Lavori" value={cantiere.oggetto_lavori} className="md:col-span-2 lg:col-span-3" />
          <DetailField label="Codice CIG" value={cantiere.codice_cig} />
          <DetailField label="Codice CUP" value={cantiere.codice_cup} />
          <DetailField label="Stato" value={cantiere.stato} />
          <DetailField label="Indirizzo" value={`${cantiere.indirizzo || ''}, ${cantiere.indirizzo_cap || ''} ${cantiere.indirizzo_citta || ''}`} className="md:col-span-2" />
        </div>
      </Section>
      
      <Section title="Avanzamento Temporale e Date">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-slate-700">Avanzamento</h4>
            <div className="flex items-center gap-2" style={{ color: statoAvanzamento.color }}>
              <StatoIcon className="w-4 h-4" />
              <span className="text-sm font-medium">{statoAvanzamento.text}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Progress value={percentualeCompletamento} className="h-2 flex-1" />
            <span className="text-sm font-bold text-slate-700 min-w-[50px] text-right">
              {percentualeCompletamento}%
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <DetailField label="Consegna Area" value={renderDate(cantiere.data_consegna_area)} />
          <DetailField label="Inizio Lavori" value={renderDate(cantiere.data_inizio)} />
          <DetailField label="Giorni Previsti" value={cantiere.giorni_previsti} />
          <DetailField label="Fine Prevista" value={renderDate(cantiere.data_fine_prevista)} />
        </div>
        {(cantiere.data_inizio_proroga_1 || cantiere.data_fine_proroga_1 || cantiere.data_inizio_proroga_2 || cantiere.data_fine_proroga_2) && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4 mt-4 border-t">
            {cantiere.data_inizio_proroga_1 && <DetailField label="Inizio Proroga 1" value={renderDate(cantiere.data_inizio_proroga_1)} />}
            {cantiere.data_fine_proroga_1 && <DetailField label="Fine Proroga 1" value={renderDate(cantiere.data_fine_proroga_1)} />}
            {cantiere.data_inizio_proroga_2 && <DetailField label="Inizio Proroga 2" value={renderDate(cantiere.data_inizio_proroga_2)} />}
            {cantiere.data_fine_proroga_2 && <DetailField label="Fine Proroga 2" value={renderDate(cantiere.data_fine_proroga_2)} />}
          </div>
        )}
      </Section>
      
      <Section title="Dati Economici e Contratto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <DetailField label="Importo Lavori" value={renderImporto(cantiere.importo_lavori_netto_ribasso)} />
          <DetailField label="Oneri Sicurezza" value={renderImporto(cantiere.oneri_sicurezza_importo)} />
          <DetailField label="Importo Totale Contratto" value={renderImporto(cantiere.importo_contratto)} />
          <DetailField label="Tipo Contratto" value={cantiere.contratto_principale_desc} />
          <DetailField label="Data Contratto" value={renderDate(cantiere.contratto_principale_data)} />
        </div>
      </Section>
      
      {cantiere.categorie_soa?.length > 0 && (
        <Section title="Categorie e Classificazione SOA">
          <div className="space-y-3">
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
        </Section>
      )}

      {hasCommittenteData && (
        <Section title="Committente">
          <div className="space-y-6">
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

            {hasCommittenteReferenteData && (
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
        </Section>
      )}

      {(cantiere.tipologia_azienda_appaltatrice || cantiere.partner_consorziati?.length > 0) && (
        <Section title="Impresa">
          {cantiere.tipologia_azienda_appaltatrice && (
            <DetailField 
              label="Tipologia Impresa" 
              value={renderTipologiaAppaltatrice(cantiere.tipologia_azienda_appaltatrice)} 
            />
          )}
          
          {cantiere.partner_consorziati && cantiere.partner_consorziati.length > 0 && (
            <div className="pt-4 mt-4 border-t">
              <h4 className="text-md font-semibold mb-2 text-slate-600">Imprese</h4>
              <ul className="space-y-2">
                {cantiere.partner_consorziati.map((partner, index) => (
                  <li key={index} className="p-2 border rounded-md hover:bg-slate-50">
                    {partner.ragione_sociale}
                    {partner.piva && <span className="text-sm text-slate-500 ml-2">P.IVA: {partner.piva}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>
      )}

      {hasDirettoreData && (
        <Section title="Direttore dei Lavori">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DetailField label="Nome e Cognome" value={`${direttoreLavori.nome || ''} ${direttoreLavori.cognome || ''}`} />
            <DetailField label="Qualifica" value={direttoreLavori.qualifica} />
            <DetailField label="Codice Fiscale" value={direttoreLavori.codice_fiscale} />
            <DetailField label="Telefono" value={direttoreLavori.telefono} />
            <DetailField label="Email" value={direttoreLavori.email} />
            <DetailField 
              label="Indirizzo" 
              value={`${direttoreLavori.indirizzo || ''}, ${direttoreLavori.cap || ''} ${direttoreLavori.citta || ''}`} 
              className="md:col-span-2"
            />
          </div>
        </Section>
      )}
      
      {hasResponsabileData && (
        <Section title="Responsabile Unico del Procedimento (RUP)">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DetailField label="Nome e Cognome" value={`${responsabileUnico.nome || ''} ${responsabileUnico.cognome || ''}`} />
            <DetailField label="Qualifica" value={responsabileUnico.qualifica} />
            <DetailField label="Codice Fiscale" value={responsabileUnico.codice_fiscale} />
            <DetailField label="Telefono" value={responsabileUnico.telefono} />
            <DetailField label="Email" value={responsabileUnico.email} />
            <DetailField 
              label="Indirizzo" 
              value={`${responsabileUnico.indirizzo || ''}, ${responsabileUnico.cap || ''} ${responsabileUnico.citta || ''}`} 
              className="md:col-span-2"
            />
          </div>
        </Section>
      )}

      {cantiere.note && (
        <Section title="Note">
          <div className="whitespace-pre-wrap text-slate-700">
            {cantiere.note}
          </div>
        </Section>
      )}
    </div>
  );
}
