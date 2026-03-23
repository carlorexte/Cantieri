import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Save, X } from "lucide-react";
import PersonaEsternaSelector from "../cantieri/PersonaEsternaSelector";

const DRAFT_KEY = "impresa_form_draft";

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
  referente_impresa_id: "",
  responsabile_sicurezza_id: ""
};

export default function ImpresaForm({ impresa, onSubmit, onCancel }) {
  const getInitialData = () => {
    if (impresa) return impresa;
    try {
      const draft = sessionStorage.getItem(DRAFT_KEY);
      if (draft) return JSON.parse(draft);
    } catch (_) {}
    return defaultForm;
  };

  const [formData, setFormData] = useState(getInitialData);

  const handleChange = (field, value) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      if (!impresa) {
        try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next)); } catch (_) {}
      }
      return next;
    });
  };

  const clearDraft = () => {
    try { sessionStorage.removeItem(DRAFT_KEY); } catch (_) {}
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    clearDraft();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="ragione_sociale">Ragione Sociale *</Label>
              <Input
                id="ragione_sociale"
                value={formData.ragione_sociale}
                onChange={(e) => handleChange("ragione_sociale", e.target.value)}
                required
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="rappresentante_legale">Rappresentante Legale</Label>
              <Input
                id="rappresentante_legale"
                value={formData.rappresentante_legale}
                onChange={(e) => handleChange("rappresentante_legale", e.target.value)}
                placeholder="Nome e cognome del rappresentante legale"
              />
            </div>

            <div>
              <Label htmlFor="partita_iva">Partita IVA *</Label>
              <Input
                id="partita_iva"
                value={formData.partita_iva}
                onChange={(e) => handleChange("partita_iva", e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="codice_fiscale">Codice Fiscale</Label>
              <Input
                id="codice_fiscale"
                value={formData.codice_fiscale}
                onChange={(e) => handleChange("codice_fiscale", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="indirizzo_legale">Indirizzo Sede Legale</Label>
              <Input
                id="indirizzo_legale"
                value={formData.indirizzo_legale}
                onChange={(e) => handleChange("indirizzo_legale", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="cap_legale">CAP</Label>
              <Input
                id="cap_legale"
                value={formData.cap_legale}
                onChange={(e) => handleChange("cap_legale", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="citta_legale">Città</Label>
              <Input
                id="citta_legale"
                value={formData.citta_legale}
                onChange={(e) => handleChange("citta_legale", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="provincia_legale">Provincia</Label>
              <Input
                id="provincia_legale"
                value={formData.provincia_legale}
                onChange={(e) => handleChange("provincia_legale", e.target.value)}
                placeholder="es. MI"
              />
            </div>

            <div>
              <Label htmlFor="telefono">Telefono</Label>
              <Input
                id="telefono"
                value={formData.telefono}
                onChange={(e) => handleChange("telefono", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="pec">PEC</Label>
              <Input
                id="pec"
                type="email"
                value={formData.pec}
                onChange={(e) => handleChange("pec", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="codice_sdi">Codice SDI</Label>
              <Input
                id="codice_sdi"
                value={formData.codice_sdi}
                onChange={(e) => handleChange("codice_sdi", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="banca_appoggio">Banca d'Appoggio</Label>
              <Input
                id="banca_appoggio"
                value={formData.banca_appoggio}
                onChange={(e) => handleChange("banca_appoggio", e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="iban">IBAN</Label>
              <Input
                id="iban"
                value={formData.iban}
                onChange={(e) => handleChange("iban", e.target.value)}
              />
            </div>

            {/* Referente Impresa con Selettore */}
            <div className="md:col-span-2 pt-4 border-t">
              <Label>Referente Impresa</Label>
              <PersonaEsternaSelector
                value={formData.referente_impresa_id}
                onSelect={(id) => handleChange("referente_impresa_id", id)}
                label="Seleziona referente impresa..."
              />
              <p className="text-xs text-slate-500 mt-1">
                Seleziona dall'anagrafica Professionisti
              </p>
            </div>

            {/* Responsabile Sicurezza con Selettore */}
            <div className="md:col-span-2">
              <Label>Responsabile Sicurezza</Label>
              <PersonaEsternaSelector
                value={formData.responsabile_sicurezza_id}
                onSelect={(id) => handleChange("responsabile_sicurezza_id", id)}
                label="Seleziona responsabile sicurezza..."
              />
              <p className="text-xs text-slate-500 mt-1">
                Seleziona dall'anagrafica Professionisti
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => { clearDraft(); onCancel(); }}>
          <X className="w-4 h-4 mr-2" />
          Annulla
        </Button>
        <Button type="submit" className="">
          <Save className="w-4 h-4 mr-2" />
          {impresa ? "Aggiorna" : "Salva"} Impresa
        </Button>
      </div>
    </form>
  );
}