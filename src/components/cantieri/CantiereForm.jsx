
import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Save, X, Plus, Trash2, Building2, Calendar, Euro, FileText, Users, User, Briefcase, Handshake, ClipboardList, Database, Edit, PlusCircle } from "lucide-react";
import { addDays, format, parseISO } from 'date-fns';

import { Impresa } from "@/entities/Impresa"; // Assuming this entity exists and defines the structure of a company
import CategorieSOASelector from "./CategorieSOASelector";
import ImpresaSelectorForCantiere from "./ImpresaSelectorForCantiere";
import SubappaltoForm from "../subappalti/SubappaltoForm";
import PersonaEsternaSelector from "./PersonaEsternaSelector";
import PolizzaUploader from "./PolizzaUploader"; // Added PolizzaUploader import
import DocumentUploader from "./DocumentUploader"; // Added DocumentUploader import

export default function CantiereForm({ cantiere, onSubmit, onCancel }) { // Removed onDirtyChange prop
  const [form, setForm] = useState({
    denominazione: cantiere?.denominazione || "",
    referente_interno: cantiere?.referente_interno || "",
    responsabile_sicurezza_id: cantiere?.responsabile_sicurezza_id || "", // Changed to ID
    oggetto_lavori: cantiere?.oggetto_lavori || "",
    codice_cig: cantiere?.codice_cig || "",
    codice_cup: cantiere?.codice_cup || "",
    indirizzo: cantiere?.indirizzo || "",
    indirizzo_cap: cantiere?.indirizzo_cap || "",
    indirizzo_citta: cantiere?.indirizzo_citta || "",
    data_consegna_area: cantiere?.data_consegna_area || "",
    data_inizio: cantiere?.data_inizio || "",
    giorni_previsti: cantiere?.giorni_previsti || "",
    data_fine_prevista: cantiere?.data_fine_prevista || "",
    data_inizio_proroga_1: cantiere?.data_inizio_proroga_1 || "",
    data_fine_proroga_1: cantiere?.data_fine_proroga_1 || "",
    data_inizio_proroga_2: cantiere?.data_inizio_proroga_2 || "",
    data_fine_proroga_2: cantiere?.data_fine_proroga_2 || "",
    data_inizio_sospensione: cantiere?.data_inizio_sospensione || "",
    data_fine_sospensione: cantiere?.data_fine_sospensione || "",
    verbale_inizio_lavori_url: cantiere?.verbale_inizio_lavori_url || "",
    tipologia_appalto: cantiere?.tipologia_appalto || "a_corpo",
    importo_lavori_netto_ribasso: cantiere?.importo_lavori_netto_ribasso || "",
    importo_progettazione: cantiere?.importo_progettazione || "",
    oneri_sicurezza_importo: cantiere?.oneri_sicurezza_importo || "",
    percentuale_iva: cantiere?.percentuale_iva ?? 10,
    percentuale_ribasso: cantiere?.percentuale_ribasso || "",
    contratto_data_firma: cantiere?.contratto_data_firma || "",
    contratto_file_url: cantiere?.contratto_file_url || "",
    polizza_definitiva_numero: cantiere?.polizza_definitiva_numero || "",
    polizza_definitiva_url: cantiere?.polizza_definitiva_url || "",
    polizza_definitiva_scadenza: cantiere?.polizza_definitiva_scadenza || "",
    polizza_definitiva_durata: cantiere?.polizza_definitiva_durata || "",
    polizza_definitiva_agenzia: cantiere?.polizza_definitiva_agenzia || "",
    polizza_car_numero: cantiere?.polizza_car_numero || "",
    polizza_car_url: cantiere?.polizza_car_url || "",
    polizza_car_scadenza: cantiere?.polizza_car_scadenza || "",
    polizza_car_durata: cantiere?.polizza_car_durata || "",
    polizza_car_agenzia: cantiere?.polizza_car_agenzia || "",
    polizza_anticipazione_numero: cantiere?.polizza_anticipazione_numero || "",
    polizza_anticipazione_url: cantiere?.polizza_anticipazione_url || "",
    polizza_anticipazione_scadenza: cantiere?.polizza_anticipazione_scadenza || "",
    polizza_anticipazione_durata: cantiere?.polizza_anticipazione_durata || "",
    polizza_anticipazione_agenzia: cantiere?.polizza_anticipazione_agenzia || "",
    categorie_soa: Array.isArray(cantiere?.categorie_soa)
      ? cantiere.categorie_soa.map(item => {
          if (typeof item === 'string') {
            return { category: item, classification: '' };
          }
          return {
            category: item?.category || '',
            classification: item?.classification || ''
          };
        })
      : [],
    contratto_principale_desc: cantiere?.contratto_principale_desc || "",
    contratto_principale_data: cantiere?.contratto_principale_data || "",
    committente_ragione_sociale: cantiere?.committente_ragione_sociale || "",
    committente_indirizzo: cantiere?.committente_indirizzo || "",
    committente_cap: cantiere?.committente_cap || "",
    committente_citta: cantiere?.committente_citta || "",
    committente_telefono: cantiere?.committente_telefono || "",
    committente_email: cantiere?.committente_email || "",
    committente_cf: cantiere?.committente_cf || "",
    committente_piva: cantiere?.committente_piva || "",
    committente_referente_ragione_sociale: cantiere?.committente_referente_ragione_sociale || cantiere?.committente_referente_nome || "",
    committente_referente_indirizzo: cantiere?.committente_referente_indirizzo || "",
    committente_referente_cap: cantiere?.committente_referente_cap || "",
    committente_referente_citta: cantiere?.committente_referente_citta || "",
    committente_referente_telefono: cantiere?.committente_referente_telefono || "",
    committente_referente_email: cantiere?.committente_referente_email || "",
    committente_referente_cf: cantiere?.committente_referente_cf || "",
    committente_referente_piva: cantiere?.committente_referente_piva || "",
    tipologia_azienda_appaltatrice: cantiere?.tipologia_azienda_appaltatrice || "",
    azienda_appaltatrice_ragione_sociale: cantiere?.azienda_appaltatrice_ragione_sociale || "",
    azienda_appaltatrice_indirizzo: cantiere?.azienda_appaltatrice_indirizzo || "",
    azienda_appaltatrice_cap: cantiere?.azienda_appaltatrice_cap || "",
    azienda_appaltatrice_citta: cantiere?.azienda_appaltatrice_citta || "",
    azienda_appaltatrice_telefono: cantiere?.azienda_appaltatrice_telefono || "",
    azienda_appaltatrice_email: cantiere?.azienda_appaltatrice_email || "",
    azienda_appaltatrice_cf: cantiere?.azienda_appaltatrice_cf || "",
    azienda_appaltatrice_piva: cantiere?.azienda_appaltatrice_piva || "",
    partner_consorziati: Array.isArray(cantiere?.partner_consorziati)
      ? cantiere.partner_consorziati.map(p => ({
          ragione_sociale: p?.ragione_sociale || "",
          tipo_impresa: p?.tipo_impresa || "socio",
          indirizzo: p?.indirizzo || "",
          cap: p?.cap || "",
          citta: p?.citta || "",
          telefono: p?.telefono || "",
          email: p?.email || "",
          cf: p?.cf || "",
          piva: p?.piva || ""
        }))
      : [],
    direttore_lavori_id: cantiere?.direttore_lavori_id || "", // Changed to ID
    responsabile_unico_procedimento_id: cantiere?.responsabile_unico_procedimento_id || "", // Changed to ID
    stato: cantiere?.stato || "attivo",
    note: cantiere?.note || ""
  });

  const [initialData, setInitialData] = useState("");

  // State for Subappalti and Subaffidamenti
  const [subappalti, setSubappalti] = useState([]);
  const [subaffidamenti, setSubaffidamenti] = useState([]);
  const [showSubappaltoDialog, setShowSubappaltoDialog] = useState(false);
  const [showSubaffidamentoDialog, setShowSubaffidamentoDialog] = useState(false);
  const [editingSubappalto, setEditingSubappalto] = useState(null); // Used for both subappalti and subaffidamenti

  const calculateImportoContrattualeFromCantiere = useCallback((c) => {
    const lavori = parseFloat(c?.importo_lavori_netto_ribasso) || 0;
    const progettazione = parseFloat(c?.importo_progettazione) || 0;
    const sicurezza = parseFloat(c?.oneri_sicurezza_importo) || 0;
    return (lavori + progettazione + sicurezza).toFixed(2);
  }, []);

  useEffect(() => {
    const data = {
      denominazione: cantiere?.denominazione || "",
      referente_interno: cantiere?.referente_interno || "",
      responsabile_sicurezza_id: cantiere?.responsabile_sicurezza_id || "", // Changed to ID
      oggetto_lavori: cantiere?.oggetto_lavori || "",
      codice_cig: cantiere?.codice_cig || "",
      codice_cup: cantiere?.codice_cup || "",
      indirizzo: cantiere?.indirizzo || "",
      indirizzo_cap: cantiere?.indirizzo_cap || "",
      indirizzo_citta: cantiere?.indirizzo_citta || "",
      data_consegna_area: cantiere?.data_consegna_area || "",
      data_inizio: cantiere?.data_inizio || "",
      giorni_previsti: cantiere?.giorni_previsti || "",
      data_fine_prevista: cantiere?.data_fine_prevista || "",
      data_inizio_proroga_1: cantiere?.data_inizio_proroga_1 || "",
      data_fine_proroga_1: cantiere?.data_fine_proroga_1 || "",
      data_inizio_proroga_2: cantiere?.data_inizio_proroga_2 || "",
      data_fine_proroga_2: cantiere?.data_fine_proroga_2 || "",
      data_inizio_sospensione: cantiere?.data_inizio_sospensione || "",
      data_fine_sospensione: cantiere?.data_fine_sospensione || "",
      verbale_inizio_lavori_url: cantiere?.verbale_inizio_lavori_url || "",
      tipologia_appalto: cantiere?.tipologia_appalto || "a_corpo",
      importo_lavori_netto_ribasso: cantiere?.importo_lavori_netto_ribasso || "",
      importo_progettazione: cantiere?.importo_progettazione || "",
      oneri_sicurezza_importo: cantiere?.oneri_sicurezza_importo || "",
      importo_contrattuale_oltre_iva: calculateImportoContrattualeFromCantiere(cantiere), // Derived value for initial comparison
      percentuale_iva: cantiere?.percentuale_iva ?? 10,
      percentuale_ribasso: cantiere?.percentuale_ribasso || "",
      contratto_data_firma: cantiere?.contratto_data_firma || "",
      contratto_file_url: cantiere?.contratto_file_url || "",
      polizza_definitiva_numero: cantiere?.polizza_definitiva_numero || "",
      polizza_definitiva_url: cantiere?.polizza_definitiva_url || "",
      polizza_definitiva_scadenza: cantiere?.polizza_definitiva_scadenza || "",
      polizza_definitiva_durata: cantiere?.polizza_definitiva_durata || "",
      polizza_definitiva_agenzia: cantiere?.polizza_definitiva_agenzia || "",
      polizza_car_numero: cantiere?.polizza_car_numero || "",
      polizza_car_url: cantiere?.polizza_car_url || "",
      polizza_car_scadenza: cantiere?.polizza_car_scadenza || "",
      polizza_car_durata: cantiere?.polizza_car_durata || "",
      polizza_car_agenzia: cantiere?.polizza_car_agenzia || "",
      polizza_anticipazione_numero: cantiere?.polizza_anticipazione_numero || "",
      polizza_anticipazione_url: cantiere?.polizza_anticipazione_url || "",
      polizza_anticipazione_scadenza: cantiere?.polizza_anticipazione_scadenza || "",
      polizza_anticipazione_durata: cantiere?.polizza_anticipazione_durata || "",
      polizza_anticipazione_agenzia: cantiere?.polizza_anticipazione_agenzia || "",
      categorie_soa: Array.isArray(cantiere?.categorie_soa)
        ? cantiere.categorie_soa.map(item => {
            if (typeof item === 'string') {
              return { category: item, classification: '' };
            }
            return {
              category: item?.category || '',
              classification: item?.classification || ''
            };
          })
        : [],
      contratto_principale_desc: cantiere?.contratto_principale_desc || "",
      contratto_principale_data: cantiere?.contratto_principale_data || "",
      committente_ragione_sociale: cantiere?.committente_ragione_sociale || "",
      committente_indirizzo: cantiere?.committente_indirizzo || "",
      committente_cap: cantiere?.committente_cap || "",
      committente_citta: cantiere?.committente_citta || "",
      committente_telefono: cantiere?.committente_telefono || "",
      committente_email: cantiere?.committente_email || "",
      committente_cf: cantiere?.committente_cf || "",
      committente_piva: cantiere?.committente_piva || "",
      committente_referente_ragione_sociale: cantiere?.committente_referente_ragione_sociale || cantiere?.committente_referente_nome || "",
      committente_referente_indirizzo: cantiere?.committente_referente_indirizzo || "",
      committente_referente_cap: cantiere?.committente_referente_cap || "",
      committente_referente_citta: cantiere?.committente_referente_citta || "",
      committente_referente_telefono: cantiere?.committente_referente_telefono || "",
      committente_referente_email: cantiere?.committente_referente_email || "",
      committente_referente_cf: cantiere?.committente_referente_cf || "",
      committente_referente_piva: cantiere?.committente_referente_piva || "",
      tipologia_azienda_appaltatrice: cantiere?.tipologia_azienda_appaltatrice || "",
      azienda_appaltatrice_ragione_sociale: cantiere?.azienda_appaltatrice_ragione_sociale || "",
      azienda_appaltatrice_indirizzo: cantiere?.azienda_appaltatrice_indirizzo || "",
      azienda_appaltatrice_cap: cantiere?.azienda_appaltatrice_cap || "",
      azienda_appaltatrice_citta: cantiere?.azienda_appaltatrice_citta || "",
      azienda_appaltatrice_telefono: cantiere?.azienda_appaltatrice_telefono || "",
      azienda_appaltatrice_email: cantiere?.azienda_appaltatrice_email || "",
      azienda_appaltatrice_cf: cantiere?.azienda_appaltatrice_cf || "",
      azienda_appaltatrice_piva: cantiere?.azienda_appaltatrice_piva || "",
      partner_consorziati: Array.isArray(cantiere?.partner_consorziati)
        ? cantiere.partner_consorziati.map(p => ({
            ragione_sociale: p?.ragione_sociale || "",
            tipo_impresa: p?.tipo_impresa || "socio",
            indirizzo: p?.indirizzo || "",
            cap: p?.cap || "",
            citta: p?.citta || "",
            telefono: p?.telefono || "",
            email: p?.email || "",
            cf: p?.cf || "",
            piva: p?.piva || ""
          }))
        : [],
      direttore_lavori_id: cantiere?.direttore_lavori_id || "", // Changed to ID
      responsabile_unico_procedimento_id: cantiere?.responsabile_unico_procedimento_id || "", // Changed to ID
      stato: cantiere?.stato || "attivo",
      note: cantiere?.note || ""
    };
    
    setForm(data);
    setInitialData(JSON.stringify(data));
  }, [cantiere, calculateImportoContrattualeFromCantiere]);

  // Removed onDirtyChange useEffect block

  const loadSubappaltiSubaffidamenti = useCallback(async (cantiereId) => {
    try {
      const { Subappalto } = await import("@/entities/Subappalto");
      const data = await Subappalto.filter({ cantiere_id: cantiereId });
      setSubappalti(data.filter(s => s.tipo_relazione === "subappalto"));
      setSubaffidamenti(data.filter(s => s.tipo_relazione === "subaffidamento"));
    } catch (error) {
      console.error("Errore caricamento subappalti/subaffidamenti:", error);
    }
  }, []);

  useEffect(() => {
    if (cantiere?.id) {
      loadSubappaltiSubaffidamenti(cantiere.id);
    }
  }, [cantiere?.id, loadSubappaltiSubaffidamenti]);


  const updateField = useCallback((field, value) => {
    setForm(prev => {
      const updatedForm = { ...prev, [field]: value };

      const startDate = updatedForm.data_inizio;
      const duration = parseInt(updatedForm.giorni_previsti, 10);

      if ((field === 'data_inizio' || field === 'giorni_previsti') && startDate && !isNaN(duration) && duration > 0) {
        try {
          const endDate = addDays(parseISO(startDate), duration - 1);
          updatedForm.data_fine_prevista = format(endDate, 'yyyy-MM-dd');
        } catch (e) {
          console.error("Errore nel calcolo della data di fine prevista:", e);
        }
      }
      return updatedForm;
    });
  }, []);

  // Removed handleImpresaSelection as its logic is now inline or removed for partners

  const addPartner = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      partner_consorziati: [...prev.partner_consorziati, {
        ragione_sociale: "",
        tipo_impresa: "socio", // Default value for new partner
        indirizzo: "",
        cap: "",
        citta: "",
        telefono: "",
        email: "",
        cf: "",
        piva: ""
      }]
    }));
  }, []);

  const removePartner = useCallback((index) => {
    setForm((prev) => ({
      ...prev,
      partner_consorziati: prev.partner_consorziati.filter((_, i) => i !== index)
    }));
  }, []);

  const updatePartner = useCallback((index, field, value) => {
    setForm((prev) => {
      const newPartners = [...prev.partner_consorziati];
      newPartners[index] = { ...newPartners[index], [field]: value };
      return { ...prev, partner_consorziati: newPartners };
    });
  }, []);

  // Removed updatePartnerImpresa as ImpresaSelectorForCantiere is removed for partners

  const getImportoContrattuale = useCallback(() => {
    const lavori = parseFloat(form.importo_lavori_netto_ribasso) || 0;
    const progettazione = parseFloat(form.importo_progettazione) || 0;
    const sicurezza = parseFloat(form.oneri_sicurezza_importo) || 0;
    return (lavori + progettazione + sicurezza).toFixed(2);
  }, [form.importo_lavori_netto_ribasso, form.importo_progettazione, form.oneri_sicurezza_importo]);

  const handleSubappaltoSubmit = async (subappaltoData) => {
    try {
      const { Subappalto } = await import("@/entities/Subappalto");
      if (editingSubappalto) {
        await Subappalto.update(editingSubappalto.id, subappaltoData);
      } else {
        await Subappalto.create(subappaltoData);
      }
      setShowSubappaltoDialog(false);
      setShowSubaffidamentoDialog(false);
      setEditingSubappalto(null);
      if (cantiere?.id) {
        loadSubappaltiSubaffidamenti(cantiere.id);
      }
    } catch (error) {
      console.error("Errore salvataggio:", error);
    }
  };

  const handleDeleteSubappalto = async (id) => {
    if (window.confirm("Sei sicuro di voler eliminare questo elemento?")) {
      try {
        const { Subappalto } = await import("@/entities/Subappalto");
        await Subappalto.delete(id);
        if (cantiere?.id) {
          loadSubappaltiSubaffidamenti(cantiere.id);
        }
      } catch (error) {
        console.error("Errore eliminazione:", error);
      }
    }
  };

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    
    const importoContrattualeOltreIva = parseFloat(getImportoContrattuale()) || 0;
    const ivaPercentuale = parseFloat(form.percentuale_iva) || 0;
    const importoTotaleConIva = importoContrattualeOltreIva * (1 + ivaPercentuale / 100);
    
    const dataToSubmit = {
      ...form,
      importo_lavori_netto_ribasso: parseFloat(form.importo_lavori_netto_ribasso) || null,
      importo_progettazione: parseFloat(form.importo_progettazione) || null,
      oneri_sicurezza_importo: parseFloat(form.oneri_sicurezza_importo) || null,
      importo_contrattuale_oltre_iva: importoContrattualeOltreIva || null,
      importo_contratto: importoTotaleConIva || null, // AGGIUNTO: importo totale comprensivo di IVA
      percentuale_iva: parseFloat(form.percentuale_iva) || null,
      percentuale_ribasso: parseFloat(form.percentuale_ribasso) || null,
      giorni_previsti: parseInt(form.giorni_previsti, 10) || null
    };
    onSubmit(dataToSubmit);
    // Removed onDirtyChange(false)
  }, [form, onSubmit, getImportoContrattuale]);

  return (
    <form onSubmit={handleSubmit} className="space-y-8"> {/* Changed space-y-6 to space-y-8 */}
      <Accordion type="multiple" defaultValue={["dati-cantiere", "impresa-appaltatrice", "subappalti"]} className="w-full">
        
        {/* Sezione 1: Dati Cantiere */}
        <AccordionItem value="dati-cantiere">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Dati Cantiere
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Denominazione Cantiere *</Label>
                    <Input
                      value={form.denominazione}
                      onChange={(e) => updateField("denominazione", e.target.value)}
                      required />
                  </div>
                  <div>
                    <Label>Referente Interno</Label>
                    <Input
                      value={form.referente_interno}
                      onChange={(e) => updateField("referente_interno", e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Responsabile Sicurezza</Label>
                    <PersonaEsternaSelector
                      value={form.responsabile_sicurezza_id}
                      onSelect={(id) => updateField("responsabile_sicurezza_id", id)}
                      label="Seleziona Responsabile Sicurezza"
                    />
                  </div>
                  <div>
                    <Label>Stato</Label>
                    <Select value={form.stato} onValueChange={(value) => updateField("stato", value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="attivo">Attivo</SelectItem>
                        <SelectItem value="sospeso">Sospeso</SelectItem>
                        <SelectItem value="completato">Completato</SelectItem>
                        <SelectItem value="in_gara">In Gara</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Oggetto dei Lavori</Label>
                  <Textarea
                    value={form.oggetto_lavori}
                    onChange={(e) => updateField("oggetto_lavori", e.target.value)}
                    placeholder="Descrizione completa dei lavori" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>CIG</Label>
                    <Input
                      value={form.codice_cig}
                      onChange={(e) => updateField("codice_cig", e.target.value)} />
                  </div>
                  <div>
                    <Label>CUP</Label>
                    <Input
                      value={form.codice_cup}
                      onChange={(e) => updateField("codice_cup", e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Indirizzo</Label>
                    <Input
                      value={form.indirizzo}
                      onChange={(e) => updateField("indirizzo", e.target.value)} />
                  </div>
                  <div>
                    <Label>CAP</Label>
                    <Input
                      value={form.indirizzo_cap}
                      onChange={(e) => updateField("indirizzo_cap", e.target.value)} />
                  </div>
                  <div>
                    <Label>Città</Label>
                    <Input
                      value={form.indirizzo_citta}
                      onChange={(e) => updateField("indirizzo_citta", e.target.value)} />
                  </div>
                </div>

                <div>
                  <Label>Verbale Inizio Lavori</Label>
                  <DocumentUploader
                    label="Verbale Inizio Lavori"
                    value={form.verbale_inizio_lavori_url}
                    onChange={(value) => updateField("verbale_inizio_lavori_url", value)}
                    compact={true}
                  />
                </div>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Sezione 2: Date e Tempistiche Lavori */}
        <AccordionItem value="date-tempistiche">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Date e Tempistiche Lavori
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent className="pt-6 space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Date Principali</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label>Consegna Area</Label>
                      <Input
                        type="date"
                        value={form.data_consegna_area}
                        onChange={(e) => updateField("data_consegna_area", e.target.value)} />
                    </div>
                    <div>
                      <Label>Inizio Lavori *</Label>
                      <Input
                        type="date"
                        value={form.data_inizio}
                        onChange={(e) => updateField("data_inizio", e.target.value)}
                        required />
                    </div>
                    <div>
                      <Label>Giorni Previsti</Label>
                      <Input
                        type="number"
                        value={form.giorni_previsti}
                        onChange={(e) => updateField("giorni_previsti", e.target.value)}
                        placeholder="es. 90" />
                    </div>
                    <div>
                      <Label>Fine Prevista (auto)</Label>
                      <Input
                        type="date"
                        value={form.data_fine_prevista}
                        onChange={(e) => updateField("data_fine_prevista", e.target.value)}
                        className="bg-slate-100"
                        readOnly />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Proroghe</h4>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-slate-600">Prima Proroga</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <div>
                          <Label className="text-xs text-slate-500">Inizio Proroga</Label>
                          <Input
                            type="date"
                            value={form.data_inizio_proroga_1}
                            onChange={(e) => updateField("data_inizio_proroga_1", e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Fine Proroga</Label>
                          <Input
                            type="date"
                            value={form.data_fine_proroga_1}
                            onChange={(e) => updateField("data_fine_proroga_1", e.target.value)} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-slate-600">Seconda Proroga</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <div>
                          <Label className="text-xs text-slate-500">Inizio Proroga</Label>
                          <Input
                            type="date"
                            value={form.data_inizio_proroga_2}
                            onChange={(e) => updateField("data_inizio_proroga_2", e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Fine Proroga</Label>
                          <Input
                            type="date"
                            value={form.data_fine_proroga_2}
                            onChange={(e) => updateField("data_fine_proroga_2", e.target.value)} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Sospensione Lavori</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Inizio Sospensione</Label>
                      <Input
                        type="date"
                        value={form.data_inizio_sospensione}
                        onChange={(e) => updateField("data_inizio_sospensione", e.target.value)} />
                    </div>
                    <div>
                      <Label>Fine Sospensione</Label>
                      <Input
                        type="date"
                        value={form.data_fine_sospensione}
                        onChange={(e) => updateField("data_fine_sospensione", e.target.value)} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Sezione 3: Importi e Contratto */}
        <AccordionItem value="importi">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <Euro className="w-5 h-5" />
              Importi e Contratto
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent className="pt-6 space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Informazioni Contratto</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Data Firma Contratto</Label>
                      <Input
                        type="date"
                        value={form.contratto_data_firma}
                        onChange={(e) => updateField("contratto_data_firma", e.target.value)} />
                    </div>
                    <div>
                      <Label>Link File Contratto</Label>
                      <Input
                        value={form.contratto_file_url}
                        onChange={(e) => updateField("contratto_file_url", e.target.value)}
                        placeholder="https://..." />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Dettagli Importi</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Tipologia Appalto</Label>
                      <Select value={form.tipologia_appalto} onValueChange={(value) => updateField("tipologia_appalto", value)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="a_corpo">A Corpo</SelectItem>
                          <SelectItem value="a_misura">A Misura</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Ribasso (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={form.percentuale_ribasso}
                        onChange={(e) => updateField("percentuale_ribasso", e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label>Importo Lavori al netto del ribasso (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.importo_lavori_netto_ribasso}
                      onChange={(e) => updateField("importo_lavori_netto_ribasso", e.target.value)} />
                  </div>
                  <div>
                    <Label>Importo Progettazione (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.importo_progettazione}
                      onChange={(e) => updateField("importo_progettazione", e.target.value)} />
                    <p className="text-xs text-slate-500 mt-1">Non sempre presente</p>
                  </div>
                  <div>
                    <Label>Oneri Sicurezza (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.oneri_sicurezza_importo}
                      onChange={(e) => updateField("oneri_sicurezza_importo", e.target.value)} />
                  </div>
                  <div>
                    <Label>Importo Contrattuale oltre IVA (€)</Label>
                    <Input
                      value={getImportoContrattuale()}
                      readOnly
                      className="bg-slate-100 font-semibold" />
                  </div>
                  <div>
                    <Label>IVA (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.percentuale_iva}
                      onChange={(e) => updateField("percentuale_iva", e.target.value)} />
                    <p className="text-xs text-slate-500 mt-1">Non è sempre uguale</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Sezione 4: Polizze */}
        <AccordionItem value="polizze">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Polizze Assicurative
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent className="pt-6 space-y-6">
                <PolizzaUploader
                  label="Polizza Definitiva"
                  value={form.polizza_definitiva_url}
                  onChange={(value) => updateField("polizza_definitiva_url", value)}
                  numeroPolizza={form.polizza_definitiva_numero}
                  onNumeroChange={(value) => updateField("polizza_definitiva_numero", value)}
                  dataScadenza={form.polizza_definitiva_scadenza}
                  onDataScadenzaChange={(value) => updateField("polizza_definitiva_scadenza", value)}
                  durata={form.polizza_definitiva_durata}
                  onDurataChange={(value) => updateField("polizza_definitiva_durata", value)}
                  agenzia={form.polizza_definitiva_agenzia}
                  onAgenziaChange={(value) => updateField("polizza_definitiva_agenzia", value)}
                />

                <PolizzaUploader
                  label="Polizza CAR"
                  value={form.polizza_car_url}
                  onChange={(value) => updateField("polizza_car_url", value)}
                  numeroPolizza={form.polizza_car_numero}
                  onNumeroChange={(value) => updateField("polizza_car_numero", value)}
                  dataScadenza={form.polizza_car_scadenza}
                  onDataScadenzaChange={(value) => updateField("polizza_car_scadenza", value)}
                  durata={form.polizza_car_durata}
                  onDurataChange={(value) => updateField("polizza_car_durata", value)}
                  agenzia={form.polizza_car_agenzia}
                  onAgenziaChange={(value) => updateField("polizza_car_agenzia", value)}
                />

                <PolizzaUploader
                  label="Polizza Anticipazione"
                  value={form.polizza_anticipazione_url}
                  onChange={(value) => updateField("polizza_anticipazione_url", value)}
                  numeroPolizza={form.polizza_anticipazione_numero}
                  onNumeroChange={(value) => updateField("polizza_anticipazione_numero", value)}
                  dataScadenza={form.polizza_anticipazione_scadenza}
                  onDataScadenzaChange={(value) => updateField("polizza_anticipazione_scadenza", value)}
                  durata={form.polizza_anticipazione_durata}
                  onDurataChange={(value) => updateField("polizza_anticipazione_durata", value)}
                  agenzia={form.polizza_anticipazione_agenzia}
                  onAgenziaChange={(value) => updateField("polizza_anticipazione_agenzia", value)}
                />
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Sezione 5: Categorie e Classifiche */}
        <AccordionItem value="classificazione">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Categorie e Classifiche
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent className="pt-6">
                <div>
                  <Label>Categorie SOA con Classifiche</Label>
                  <CategorieSOASelector
                    value={form.categorie_soa}
                    onChange={(value) => updateField("categorie_soa", value)}
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Seleziona le categorie SOA e specifica la classifica di importo per ognuna
                  </p>
                </div>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Sezione 6: Committente */}
        <AccordionItem value="committente">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Committente
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent className="pt-6 space-y-6">
                <div>
                  <h4 className="text-md font-semibold text-slate-900 mb-4">Dati Committente</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Ragione Sociale</Label>
                      <Input
                        value={form.committente_ragione_sociale}
                        onChange={(e) => updateField("committente_ragione_sociale", e.target.value)}
                        placeholder="es. Comune di Milano"
                      />
                    </div>
                    <div>
                      <Label>Indirizzo</Label>
                      <Input
                        value={form.committente_indirizzo}
                        onChange={(e) => updateField("committente_indirizzo", e.target.value)}
                        placeholder="Via/Piazza"
                      />
                    </div>
                    <div>
                      <Label>CAP</Label>
                      <Input
                        value={form.committente_cap}
                        onChange={(e) => updateField("committente_cap", e.target.value)}
                        placeholder="20100"
                      />
                    </div>
                    <div>
                      <Label>Città</Label>
                      <Input
                        value={form.committente_citta}
                        onChange={(e) => updateField("committente_citta", e.target.value)}
                        placeholder="Milano"
                      />
                    </div>
                    <div>
                      <Label>Telefono/Fax</Label>
                      <Input
                        value={form.committente_telefono}
                        onChange={(e) => updateField("committente_telefono", e.target.value)}
                        placeholder="+39 02 1234567"
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={form.committente_email}
                        onChange={(e) => updateField("committente_email", e.target.value)}
                        placeholder="email@comune.it"
                      />
                    </div>
                    <div>
                      <Label>Codice Fiscale</Label>
                      <Input
                        value={form.committente_cf}
                        onChange={(e) => updateField("committente_cf", e.target.value)}
                        placeholder="00000000000"
                      />
                    </div>
                    <div>
                      <Label>Partita IVA</Label>
                      <Input
                        value={form.committente_piva}
                        onChange={(e) => updateField("committente_piva", e.target.value)}
                        placeholder="00000000000"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h4 className="text-md font-semibold text-slate-900 mb-4">Nella Persona Di (Referente)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Ragione Sociale / Nome</Label>
                      <Input
                        value={form.committente_referente_ragione_sociale}
                        onChange={(e) => updateField("committente_referente_ragione_sociale", e.target.value)}
                        placeholder="Arch. Mario Rossi"
                      />
                    </div>
                    <div>
                      <Label>Indirizzo</Label>
                      <Input
                        value={form.committente_referente_indirizzo}
                        onChange={(e) => updateField("committente_referente_indirizzo", e.target.value)}
                        placeholder="c/o Via/Piazza"
                      />
                    </div>
                    <div>
                      <Label>CAP</Label>
                      <Input
                        value={form.committente_referente_cap}
                        onChange={(e) => updateField("committente_referente_cap", e.target.value)}
                        placeholder="20100"
                      />
                    </div>
                    <div>
                      <Label>Città</Label>
                      <Input
                        value={form.committente_referente_citta}
                        onChange={(e) => updateField("committente_referente_citta", e.target.value)}
                        placeholder="Milano"
                      />
                    </div>
                    <div>
                      <Label>Telefono/Fax</Label>
                      <Input
                        value={form.committente_referente_telefono}
                        onChange={(e) => updateField("committente_referente_telefono", e.target.value)}
                        placeholder="+39 02 1234567"
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={form.committente_referente_email}
                        onChange={(e) => updateField("committente_referente_email", e.target.value)}
                        placeholder="email@referente.it"
                      />
                    </div>
                    <div>
                      <Label>Codice Fiscale</Label>
                      <Input
                        value={form.committente_referente_cf}
                        onChange={(e) => updateField("committente_referente_cf", e.target.value)}
                        placeholder="RSSMRA80A01H501U"
                      />
                    </div>
                    <div>
                      <Label>Partita IVA</Label>
                      <Input
                        value={form.committente_referente_piva}
                        onChange={(e) => updateField("committente_referente_piva", e.target.value)}
                        placeholder="00000000000"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Sezione 7: Direttore dei Lavori - UPDATED */}
        <AccordionItem value="direttore-lavori">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Direttore dei Lavori
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent className="pt-6">
                <div>
                  <Label>Direttore dei Lavori</Label>
                  <PersonaEsternaSelector
                    value={form.direttore_lavori_id}
                    onSelect={(id) => updateField("direttore_lavori_id", id)}
                    label="Seleziona Direttore Lavori"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Seleziona una persona dall'anagrafica collaboratori esterni
                  </p>
                </div>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Sezione 8: Responsabile Unico del Procedimento - UPDATED */}
        <AccordionItem value="responsabile-unico-procedimento">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Responsabile Unico del Procedimento (RUP)
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent className="pt-6">
                <div>
                  <Label>Responsabile Unico del Procedimento (RUP)</Label>
                  <PersonaEsternaSelector
                    value={form.responsabile_unico_procedimento_id}
                    onSelect={(id) => updateField("responsabile_unico_procedimento_id", id)}
                    label="Seleziona RUP"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Seleziona una persona dall'anagrafica collaboratori esterni
                  </p>
                </div>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
        
        {/* Sezione 9: Impresa Appaltatrice - ORA COLLASSABILE */}
        <AccordionItem value="impresa-appaltatrice">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Impresa Appaltatrice
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Card> {/* Added Card wrapper */}
              <CardContent className="pt-6 space-y-4"> {/* Added CardContent, keeping existing padding and spacing */}
                <ImpresaSelectorForCantiere
                  label="Seleziona Impresa Appaltatrice Principale"
                  currentValues={{
                      ragione_sociale: form.azienda_appaltatrice_ragione_sociale,
                      indirizzo: form.azienda_appaltatrice_indirizzo,
                      cap: form.azienda_appaltatrice_cap,
                      citta: form.azienda_appaltatrice_citta,
                      telefono: form.azienda_appaltatrice_telefono,
                      email: form.azienda_appaltatrice_email,
                      cf: form.azienda_appaltatrice_cf,
                      piva: form.azienda_appaltatrice_piva
                  }}
                  onImpresaSelect={(impresa) => {
                    console.log("Impresa selezionata in CantiereForm:", impresa);
                    if (impresa) {
                      updateField("azienda_appaltatrice_ragione_sociale", impresa.ragione_sociale || "");
                      updateField("azienda_appaltatrice_indirizzo", impresa.indirizzo_legale || "");
                      updateField("azienda_appaltatrice_cap", impresa.cap_legale || "");
                      updateField("azienda_appaltatrice_citta", impresa.citta_legale || "");
                      updateField("azienda_appaltatrice_telefono", impresa.telefono || "");
                      updateField("azienda_appaltatrice_email", impresa.email || "");
                      updateField("azienda_appaltatrice_cf", impresa.codice_fiscale || "");
                      updateField("azienda_appaltatrice_piva", impresa.partita_iva || "");
                    } else {
                      updateField("azienda_appaltatrice_ragione_sociale", "");
                      updateField("azienda_appaltatrice_indirizzo", "");
                      updateField("azienda_appaltatrice_cap", "");
                      updateField("azienda_appaltatrice_citta", "");
                      updateField("azienda_appaltatrice_telefono", "");
                      updateField("azienda_appaltatrice_email", "");
                      updateField("azienda_appaltatrice_cf", "");
                      updateField("azienda_appaltatrice_piva", "");
                    }
                  }}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label>Tipologia Impresa</Label>
                    <Select
                      value={form.tipologia_azienda_appaltatrice}
                      onValueChange={(value) => updateField("tipologia_azienda_appaltatrice", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona tipologia..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="singola">Singola</SelectItem>
                        <SelectItem value="mandataria">Mandataria</SelectItem>
                        <SelectItem value="mandante">Mandante</SelectItem>
                        <SelectItem value="consorzio">Consorzio</SelectItem>
                        <SelectItem value="consortile">Consortile</SelectItem>
                        <SelectItem value="socio">Socio</SelectItem>
                        <SelectItem value="subappaltatore">Subappaltatore</SelectItem>
                        <SelectItem value="subaffidatario">Subaffidatario</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Ragione Sociale</Label>
                    <Input
                      value={form.azienda_appaltatrice_ragione_sociale}
                      onChange={(e) => updateField("azienda_appaltatrice_ragione_sociale", e.target.value)}
                      placeholder="Ragione sociale impresa"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4"> {/* Existing grid for other fields */}
                  <div>
                    <Label>Indirizzo</Label>
                    <Input
                      value={form.azienda_appaltatrice_indirizzo}
                      onChange={(e) => updateField("azienda_appaltatrice_indirizzo", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>CAP</Label>
                    <Input
                      value={form.azienda_appaltatrice_cap}
                      onChange={(e) => updateField("azienda_appaltatrice_cap", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Città</Label>
                    <Input
                      value={form.azienda_appaltatrice_citta}
                      onChange={(e) => updateField("azienda_appaltatrice_citta", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Telefono</Label>
                    <Input
                      value={form.azienda_appaltatrice_telefono}
                      onChange={(e) => updateField("azienda_appaltatrice_telefono", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={form.azienda_appaltatrice_email}
                      onChange={(e) => updateField("azienda_appaltatrice_email", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Codice Fiscale</Label>
                    <Input
                      value={form.azienda_appaltatrice_cf}
                      onChange={(e) => updateField("azienda_appaltatrice_cf", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Partita IVA</Label>
                    <Input
                      value={form.azienda_appaltatrice_piva}
                      onChange={(e) => updateField("azienda_appaltatrice_piva", e.target.value)}
                    />
                  </div>
                </div>

                {/* Partner Consorziati */}
                <div className="border-t pt-4 mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-base font-semibold">Imprese Partner / Consorziate</Label>
                    <Button type="button" onClick={addPartner} variant="outline" size="sm">
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Aggiungi Impresa
                    </Button>
                  </div>

                  {form.partner_consorziati && form.partner_consorziati.map((partner, index) => (
                    <div key={index} className="border rounded-lg p-4 mb-4 bg-slate-50">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-medium text-slate-700">Impresa #{index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removePartner(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-sm">Ragione Sociale</Label>
                            <Input
                              value={partner.ragione_sociale || ''}
                              onChange={(e) => updatePartner(index, 'ragione_sociale', e.target.value)}
                              placeholder="Ragione sociale"
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Tipologia</Label>
                            <Select
                              value={partner.tipo_impresa || 'socio'}
                              onValueChange={(value) => updatePartner(index, 'tipo_impresa', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="socio">Socio</SelectItem>
                                <SelectItem value="consortile">Consortile</SelectItem>
                                <SelectItem value="mandante">Mandante</SelectItem>
                                <SelectItem value="mandataria">Mandataria</SelectItem>
                                <SelectItem value="subappaltatore">Subappaltatore</SelectItem>
                                <SelectItem value="subaffidatario">Subaffidatario</SelectItem>
                                <SelectItem value="esecutrice">Esecutrice</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        {/* Rest of partner fields (keeping existing code) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <Label className="text-sm">Indirizzo</Label>
                                <Input value={partner.indirizzo || ''} onChange={(e) => updatePartner(index, 'indirizzo', e.target.value)} />
                            </div>
                            <div>
                                <Label className="text-sm">CAP</Label>
                                <Input value={partner.cap || ''} onChange={(e) => updatePartner(index, 'cap', e.target.value)} />
                            </div>
                            <div>
                                <Label className="text-sm">Città</Label>
                                <Input value={partner.citta || ''} onChange={(e) => updatePartner(index, 'citta', e.target.value)} />
                            </div>
                            <div>
                                <Label className="text-sm">Telefono</Label>
                                <Input value={partner.telefono || ''} onChange={(e) => updatePartner(index, 'telefono', e.target.value)} />
                            </div>
                            <div>
                                <Label className="text-sm">Email</Label>
                                <Input type="email" value={partner.email || ''} onChange={(e) => updatePartner(index, 'email', e.target.value)} />
                            </div>
                            <div>
                                <Label className="text-sm">Codice Fiscale</Label>
                                <Input value={partner.cf || ''} onChange={(e) => updatePartner(index, 'cf', e.target.value)} />
                            </div>
                            <div>
                                <Label className="text-sm">Partita IVA</Label>
                                <Input value={partner.piva || ''} onChange={(e) => updatePartner(index, 'piva', e.target.value)} />
                            </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card> {/* Closed Card wrapper */}
          </AccordionContent>
        </AccordionItem>

        {/* Sezione 10: Subappalti */}
        <AccordionItem value="subappalti">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <Handshake className="w-5 h-5" />
              Subappalti
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-md font-semibold text-slate-900">Elenco Subappalti</h4>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setEditingSubappalto(null);
                      setShowSubappaltoDialog(true);
                    }}
                    disabled={!cantiere?.id}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Aggiungi Subappalto
                  </Button>
                </div>
                {!cantiere?.id && (
                  <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-200">
                    Salva prima il cantiere per poter aggiungere subappalti
                  </p>
                )}
                {subappalti.length > 0 ? (
                  <div className="space-y-2">
                    {subappalti.map((sub, index) => (
                      <Card key={sub.id || index} className="bg-slate-50 p-4 relative">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-slate-900">{sub.ragione_sociale}</p>
                            <p className="text-sm text-slate-600">
                              {sub.categoria_lavori && `${sub.categoria_lavori.replace('_', ' ')} • `}
                              {sub.importo_contratto && `€ ${Number(sub.importo_contratto).toLocaleString('it-IT')}`}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingSubappalto(sub);
                                setShowSubappaltoDialog(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => handleDeleteSubappalto(sub.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">Nessun subappalto registrato</p>
                )}
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Sezione 11: Subaffidamenti */}
        <AccordionItem value="subaffidamenti">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Subaffidamenti
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-md font-semibold text-slate-900">Elenco Subaffidamenti</h4>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setEditingSubappalto(null);
                      setShowSubaffidamentoDialog(true);
                    }}
                    disabled={!cantiere?.id}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Aggiungi Subaffidamento
                  </Button>
                </div>
                {!cantiere?.id && (
                  <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-200">
                    Salva prima il cantiere per poter aggiungere subaffidamenti
                  </p>
                )}
                {subaffidamenti.length > 0 ? (
                  <div className="space-y-2">
                    {subaffidamenti.map((sub, index) => (
                      <Card key={sub.id || index} className="bg-slate-50 p-4 relative">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-slate-900">{sub.ragione_sociale}</p>
                            <p className="text-sm text-slate-600">
                              {sub.categoria_lavori && `${sub.categoria_lavori.replace('_', ' ')} • `}
                              {sub.importo_contratto && `€ ${Number(sub.importo_contratto).toLocaleString('it-IT')}`}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingSubappalto(sub);
                                setShowSubaffidamentoDialog(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => handleDeleteSubappalto(sub.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">Nessun subaffidamento registrato</p>
                )}
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Sezione 12: Note */}
        <AccordionItem value="note">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Note Generali
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent className="pt-6">
                <div>
                  <Label htmlFor="note">Note</Label>
                  <Textarea
                    id="note"
                    value={form.note}
                    onChange={(e) => updateField("note", e.target.value)}
                    placeholder="Aggiungi note o informazioni aggiuntive sul cantiere..."
                    rows={5}
                  />
                </div>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Pulsanti di azione sempre visibili */}
      <div className="flex justify-end gap-3 pt-4 border-t bg-white sticky bottom-0 pb-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Annulla
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
          <Save className="w-4 h-4 mr-2" />
          {cantiere ? "Aggiorna" : "Salva"} Cantiere
        </Button>
      </div>

      {/* Dialog per Subappalto */}
      <Dialog open={showSubappaltoDialog} onOpenChange={setShowSubappaltoDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSubappalto ? "Modifica Subappalto" : "Nuovo Subappalto"}</DialogTitle>
          </DialogHeader>
          <SubappaltoForm
            subappalto={editingSubappalto}
            cantiereId={cantiere?.id}
            tipoRelazione="subappalto"
            onSubmit={handleSubappaltoSubmit}
            onCancel={() => {
              setShowSubappaltoDialog(false);
              setEditingSubappalto(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog per Subaffidamento */}
      <Dialog open={showSubaffidamentoDialog} onOpenChange={setShowSubaffidamentoDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSubappalto ? "Modifica Subaffidamento" : "Nuovo Subaffidamento"}</DialogTitle>
          </DialogHeader>
          <SubappaltoForm
            subappalto={editingSubappalto}
            cantiereId={cantiere?.id}
            tipoRelazione="subaffidamento"
            onSubmit={handleSubappaltoSubmit}
            onCancel={() => {
              setShowSubaffidamentoDialog(false);
              setEditingSubappalto(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </form>
  );
}
