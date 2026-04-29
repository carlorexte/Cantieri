import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Save, X } from "lucide-react";
import PersonaEsternaSelector from "../cantieri/PersonaEsternaSelector";

const DRAFT_KEY = "impresa_form_draft";
const requiredFieldClassName = "border-slate-300 bg-white focus-visible:ring-slate-400";
const optionalFieldClassName = "border-slate-200 bg-slate-50 focus-visible:ring-slate-300";
const requiredLabelClassName = "text-slate-900";
const optionalLabelClassName = "text-slate-500";

const UUID_FIELDS = new Set(["referente_impresa_id", "responsabile_sicurezza_id", "id"]);

function normalizeFormData(source = {}) {
  const normalized = { ...defaultForm, ...source };

  Object.keys(normalized).forEach((key) => {
    const value = normalized[key];

    if (typeof value === "string") {
      const trimmed = value.trim();
      normalized[key] = trimmed === "" ? (UUID_FIELDS.has(key) ? null : "") : trimmed;
      return;
    }

    if (UUID_FIELDS.has(key) && !value) {
      normalized[key] = null;
    }
  });

  return normalized;
}

const defaultForm = {
  ragione_sociale: "",
  rappresentante_legale: "",
  partita_iva: "",
  codice_fiscale: "",
  indirizzo_legale: "",
  cap_legale: "",
  citta_legale: "",
  provincia_legale: "",
  telefono: "",
  email: "",
  pec: "",
  codice_sdi: "",
  banca_appoggio: "",
  iban: "",
  referente_impresa_id: null,
  responsabile_sicurezza_id: null
};

export default function ImpresaForm({ impresa, onSubmit, onCancel, isSaving = false }) {
  const getInitialData = () => {
    if (impresa) return normalizeFormData(impresa);
    try {
      const draft = sessionStorage.getItem(DRAFT_KEY);
      if (draft) return normalizeFormData(JSON.parse(draft));
    } catch (_) {
      // Ignora errori di parsing del draft
    }
    return defaultForm;
  };

  const [formData, setFormData] = useState(getInitialData);

  const handleChange = (field, value) => {
    setFormData(prev => {
      const next = normalizeFormData({ ...prev, [field]: value });
      if (!impresa) {
        try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next)); } catch (_) {
          // Ignora errori di scrittura del draft
        }
      }
      return next;
    });
  };

  const clearDraft = () => {
    try { sessionStorage.removeItem(DRAFT_KEY); } catch (_) {
      // Ignora errori di rimozione del draft
    }
  };

  const cleanPayload = () => {
    const payload = normalizeFormData(formData);
    const finalPayload = {};

    // Includi solo i campi definiti nel defaultForm
    Object.keys(defaultForm).forEach((key) => {
      finalPayload[key] = payload[key];
    });

    // Sanitizzazione aggressiva: converti ogni stringa vuota in null
    // PostgreSQL rifiuta "" per i tipi UUID e altri tipi strutturati
    Object.keys(finalPayload).forEach((key) => {
      if (finalPayload[key] === "") {
        finalPayload[key] = null;
      }
    });

    return finalPayload;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    clearDraft();
    onSubmit(cleanPayload());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="ragione_sociale" className={requiredLabelClassName}>Ragione Sociale *</Label>
              <Input
                id="ragione_sociale"
                value={formData.ragione_sociale}
                onChange={(e) => handleChange("ragione_sociale", e.target.value)}
                className={requiredFieldClassName}
                required
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="rappresentante_legale" className={optionalLabelClassName}>
                Rappresentante Legale
                <span className="ml-2 text-xs text-slate-400">opzionale</span>
              </Label>
              <Input
                id="rappresentante_legale"
                value={formData.rappresentante_legale}
                onChange={(e) => handleChange("rappresentante_legale", e.target.value)}
                className={optionalFieldClassName}
                placeholder="Nome e cognome del rappresentante legale"
              />
            </div>

            <div>
              <Label htmlFor="partita_iva" className={requiredLabelClassName}>Partita IVA *</Label>
              <Input
                id="partita_iva"
                value={formData.partita_iva}
                onChange={(e) => handleChange("partita_iva", e.target.value)}
                className={requiredFieldClassName}
                required
              />
            </div>

            <div>
              <Label htmlFor="codice_fiscale" className={optionalLabelClassName}>
                Codice Fiscale
                <span className="ml-2 text-xs text-slate-400">opzionale</span>
              </Label>
              <Input
                id="codice_fiscale"
                value={formData.codice_fiscale}
                onChange={(e) => handleChange("codice_fiscale", e.target.value)}
                className={optionalFieldClassName}
              />
            </div>

            <div>
              <Label htmlFor="indirizzo_legale" className={optionalLabelClassName}>
                Indirizzo Sede Legale
                <span className="ml-2 text-xs text-slate-400">opzionale</span>
              </Label>
              <Input
                id="indirizzo_legale"
                value={formData.indirizzo_legale}
                onChange={(e) => handleChange("indirizzo_legale", e.target.value)}
                className={optionalFieldClassName}
              />
            </div>

            <div>
              <Label htmlFor="cap_legale" className={optionalLabelClassName}>
                CAP
                <span className="ml-2 text-xs text-slate-400">opzionale</span>
              </Label>
              <Input
                id="cap_legale"
                value={formData.cap_legale}
                onChange={(e) => handleChange("cap_legale", e.target.value)}
                className={optionalFieldClassName}
              />
            </div>

            <div>
              <Label htmlFor="citta_legale" className={optionalLabelClassName}>
                Città
                <span className="ml-2 text-xs text-slate-400">opzionale</span>
              </Label>
              <Input
                id="citta_legale"
                value={formData.citta_legale}
                onChange={(e) => handleChange("citta_legale", e.target.value)}
                className={optionalFieldClassName}
              />
            </div>

            <div>
              <Label htmlFor="provincia_legale" className={optionalLabelClassName}>
                Provincia
                <span className="ml-2 text-xs text-slate-400">opzionale</span>
              </Label>
              <Input
                id="provincia_legale"
                value={formData.provincia_legale}
                onChange={(e) => handleChange("provincia_legale", e.target.value)}
                className={optionalFieldClassName}
                placeholder="es. MI"
              />
            </div>

            <div>
              <Label htmlFor="telefono" className={optionalLabelClassName}>
                Telefono
                <span className="ml-2 text-xs text-slate-400">opzionale</span>
              </Label>
              <Input
                id="telefono"
                value={formData.telefono}
                onChange={(e) => handleChange("telefono", e.target.value)}
                className={optionalFieldClassName}
              />
            </div>

            <div>
              <Label htmlFor="email" className={optionalLabelClassName}>
                Email
                <span className="ml-2 text-xs text-slate-400">opzionale</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className={optionalFieldClassName}
              />
            </div>

            <div>
              <Label htmlFor="pec" className={optionalLabelClassName}>
                PEC
                <span className="ml-2 text-xs text-slate-400">opzionale</span>
              </Label>
              <Input
                id="pec"
                type="email"
                value={formData.pec}
                onChange={(e) => handleChange("pec", e.target.value)}
                className={optionalFieldClassName}
              />
            </div>

            <div>
              <Label htmlFor="codice_sdi" className={optionalLabelClassName}>
                Codice SDI
                <span className="ml-2 text-xs text-slate-400">opzionale</span>
              </Label>
              <Input
                id="codice_sdi"
                value={formData.codice_sdi}
                onChange={(e) => handleChange("codice_sdi", e.target.value)}
                className={optionalFieldClassName}
              />
            </div>

            <div>
              <Label htmlFor="banca_appoggio" className={optionalLabelClassName}>
                Banca d'Appoggio
                <span className="ml-2 text-xs text-slate-400">opzionale</span>
              </Label>
              <Input
                id="banca_appoggio"
                value={formData.banca_appoggio}
                onChange={(e) => handleChange("banca_appoggio", e.target.value)}
                className={optionalFieldClassName}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="iban" className={optionalLabelClassName}>
                IBAN
                <span className="ml-2 text-xs text-slate-400">opzionale</span>
              </Label>
              <Input
                id="iban"
                value={formData.iban}
                onChange={(e) => handleChange("iban", e.target.value)}
                className={optionalFieldClassName}
              />
            </div>

            {/* Referente Impresa con Selettore */}
            <div className="md:col-span-2 pt-4 border-t">
              <Label className={optionalLabelClassName}>
                Referente Impresa
                <span className="ml-2 text-xs text-slate-400">opzionale</span>
              </Label>
              <PersonaEsternaSelector
                value={formData.referente_impresa_id}
                onSelect={(id) => handleChange("referente_impresa_id", id)}
                label="Seleziona referente impresa..."
                buttonClassName={optionalFieldClassName}
              />
              <p className="text-xs text-slate-500 mt-1">
                Seleziona dall'anagrafica Professionisti
              </p>
            </div>

            {/* Responsabile Sicurezza con Selettore */}
            <div className="md:col-span-2">
              <Label className={optionalLabelClassName}>
                Responsabile Sicurezza
                <span className="ml-2 text-xs text-slate-400">opzionale</span>
              </Label>
              <PersonaEsternaSelector
                value={formData.responsabile_sicurezza_id}
                onSelect={(id) => handleChange("responsabile_sicurezza_id", id)}
                label="Seleziona responsabile sicurezza..."
                buttonClassName={optionalFieldClassName}
              />
              <p className="text-xs text-slate-500 mt-1">
                Seleziona dall'anagrafica Professionisti
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Annulla
        </Button>
        <Button type="submit" disabled={isSaving}>
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Salvataggio..." : (impresa ? "Aggiorna" : "Salva") + " Impresa"}
        </Button>
      </div>
    </form>
  );
}
