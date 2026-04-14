import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, Upload, FileText, Trash2 } from "lucide-react";
import { soaCategories } from "@/components/cantieri/CategorieSOASelector";

import ImpresaSelector from "./ImpresaSelector";

export default function SubappaltoForm({ subappalto, cantiereId, cantieri = [], tipoRelazione = "subappalto", onSubmit, onCancel }) {
  const [documentiDaAllegare, setDocumentiDaAllegare] = useState([]);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    cantiere_id: cantiereId || subappalto?.cantiere_id || "",
    tipo_relazione: tipoRelazione || subappalto?.tipo_relazione || "subappalto",
    impresa_id: subappalto?.impresa_id || "",
    ragione_sociale: subappalto?.ragione_sociale || "",
    referente_nome: subappalto?.referente_nome || "",
    referente_qualifica: subappalto?.referente_qualifica || "",
    partita_iva: subappalto?.partita_iva || "",
    codice_fiscale: subappalto?.codice_fiscale || "",
    telefono: subappalto?.telefono || "",
    email: subappalto?.email || "",
    indirizzo: subappalto?.indirizzo || "",
    cap: subappalto?.cap || "",
    citta: subappalto?.citta || "",
    importo_contratto: subappalto?.importo_contratto || "",
    oneri_sicurezza: subappalto?.oneri_sicurezza || "",
    importo_contrattuale: subappalto?.importo_contrattuale || "",
    ribasso_percentuale: subappalto?.ribasso_percentuale || "",
    categoria_lavori: subappalto?.categoria_lavori || "",
    durc_scadenza: subappalto?.durc_scadenza || "",
    data_firma_contratto: subappalto?.data_firma_contratto || "",
    contratto_file_url: subappalto?.contratto_file_url || "",
    stato: subappalto?.stato || "attivo",
    data_inizio: subappalto?.data_inizio || "",
    data_fine_prevista: subappalto?.data_fine_prevista || ""
  });

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleImpresaSelect = (impresa) => {
    if (impresa) {
      setForm(prev => ({
        ...prev,
        impresa_id: impresa.id,
        ragione_sociale: impresa.ragione_sociale || "",
        partita_iva: impresa.partita_iva || "",
        codice_fiscale: impresa.codice_fiscale || "",
        telefono: impresa.telefono || "",
        email: impresa.email || "",
        indirizzo: impresa.indirizzo_legale || "",
        cap: impresa.cap_legale || "",
        citta: impresa.citta_legale || ""
      }));
    } else {
      // Reset fields if impresa is cleared
      setForm(prev => ({
        ...prev,
        impresa_id: "",
        ragione_sociale: "",
        partita_iva: "",
        codice_fiscale: "",
        telefono: "",
        email: "",
        indirizzo: "",
        cap: "",
        citta: ""
      }));
    }
  };

  const cantiereSelezionato = cantieri.find(c => c.id === form.cantiere_id);
  const categorieSoaCantiere = Array.isArray(cantiereSelezionato?.categorie_soa)
    ? cantiereSelezionato.categorie_soa.map(v =>
        typeof v === 'string' ? { category: v, classification: '' } : { category: v.category || v.categoria || '', classification: v.classification || v.classifica || '' }
      ).filter(v => v.category)
    : [];

  const handleFileSelected = (e) => {
    const files = Array.from(e.target.files || []);
    const nuovi = files.map(f => ({
      file: f,
      titolo: f.name.replace(/\.[^.]+$/, ''),
      categoria: 'contratti'
    }));
    setDocumentiDaAllegare(prev => [...prev, ...nuovi]);
    e.target.value = "";
  };

  const updateDocMeta = (index, field, value) => {
    setDocumentiDaAllegare(prev => prev.map((d, i) => i === index ? { ...d, [field]: value } : d));
  };

  const removeDoc = (index) => {
    setDocumentiDaAllegare(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSubmit = {
      ...form,
      importo_contratto: parseFloat(form.importo_contratto) || null,
      oneri_sicurezza: parseFloat(form.oneri_sicurezza) || null,
      importo_contrattuale: parseFloat(form.importo_contrattuale) || null,
      ribasso_percentuale: parseFloat(form.ribasso_percentuale) || null,
      _documentiDaAllegare: documentiDaAllegare
    };
    onSubmit(dataToSubmit);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label>Cantiere *</Label>
          <Select 
            value={form.cantiere_id} 
            onValueChange={(value) => updateField("cantiere_id", value)} 
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleziona cantiere..." />
            </SelectTrigger>
            <SelectContent>
              {cantieri?.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.denominazione}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Tipo Relazione *</Label>
          <Select value={form.tipo_relazione} onValueChange={(value) => updateField("tipo_relazione", value)} disabled={!!tipoRelazione}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="subappalto">Subappalto</SelectItem>
              <SelectItem value="subaffidamento">Subaffidamento</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ImpresaSelector
          label="Seleziona Impresa dall'Anagrafica (opzionale)"
          onImpresaSelect={handleImpresaSelect}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Ragione Sociale *</Label>
            <Input
              value={form.ragione_sociale}
              onChange={(e) => updateField("ragione_sociale", e.target.value)}
              required
              placeholder="Inserisci o seleziona dall'anagrafica"
            />
          </div>
          <div>
            <Label>Referente</Label>
            <Input
              value={form.referente_nome}
              onChange={(e) => updateField("referente_nome", e.target.value)}
              placeholder="Nome e cognome referente"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Qualifica Referente</Label>
            <Input
              value={form.referente_qualifica}
              onChange={(e) => updateField("referente_qualifica", e.target.value)}
            />
          </div>
          <div>
            <Label>Partita IVA</Label>
            <Input
              value={form.partita_iva}
              onChange={(e) => updateField("partita_iva", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Codice Fiscale</Label>
            <Input
              value={form.codice_fiscale}
              onChange={(e) => updateField("codice_fiscale", e.target.value)}
            />
          </div>
          <div>
            <Label>Telefono</Label>
            <Input
              value={form.telefono}
              onChange={(e) => updateField("telefono", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
            />
          </div>
          <div>
            <Label>Indirizzo</Label>
            <Input
              value={form.indirizzo}
              onChange={(e) => updateField("indirizzo", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>CAP</Label>
            <Input
              value={form.cap}
              onChange={(e) => updateField("cap", e.target.value)}
            />
          </div>
          <div>
            <Label>Città</Label>
            <Input
              value={form.citta}
              onChange={(e) => updateField("citta", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Importo Contratto *</Label>
            <Input
              type="number"
              step="0.01"
              value={form.importo_contratto}
              onChange={(e) => updateField("importo_contratto", e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Oneri Sicurezza</Label>
            <Input
              type="number"
              step="0.01"
              value={form.oneri_sicurezza}
              onChange={(e) => updateField("oneri_sicurezza", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Importo Contrattuale</Label>
            <Input
              type="number"
              step="0.01"
              value={form.importo_contrattuale}
              onChange={(e) => updateField("importo_contrattuale", e.target.value)}
            />
          </div>
          <div>
            <Label>Ribasso %</Label>
            <Input
              type="number"
              step="0.01"
              value={form.ribasso_percentuale}
              onChange={(e) => updateField("ribasso_percentuale", e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label>Categoria Lavori (SOA) *</Label>
          {categorieSoaCantiere.length > 0 && (
            <p className="text-xs text-blue-600 mb-1">★ = presenti nel cantiere selezionato</p>
          )}
          <Select value={form.categoria_lavori} onValueChange={(value) => updateField("categoria_lavori", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleziona categoria SOA..." />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {categorieSoaCantiere.length > 0 && (
                <>
                  {categorieSoaCantiere.map(cat => {
                    const soa = soaCategories.find(s => s.value === cat.category);
                    return (
                      <SelectItem key={`soa-${cat.category}`} value={cat.category}>
                        ★ {soa?.label || cat.category}{cat.classification ? ` — Cl. ${cat.classification}` : ''}
                      </SelectItem>
                    );
                  })}
                  <SelectItem value="__sep__" disabled>──────────────────</SelectItem>
                </>
              )}
              {soaCategories.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
              <SelectItem value="altro">Altro (non SOA)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Scadenza DURC</Label>
            <Input
              type="date"
              value={form.durc_scadenza}
              onChange={(e) => updateField("durc_scadenza", e.target.value)}
            />
          </div>
          <div>
            <Label>Data Firma Contratto</Label>
            <Input
              type="date"
              value={form.data_firma_contratto}
              onChange={(e) => updateField("data_firma_contratto", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Data Inizio</Label>
            <Input
              type="date"
              value={form.data_inizio}
              onChange={(e) => updateField("data_inizio", e.target.value)}
            />
          </div>
          <div>
            <Label>Data Fine Prevista</Label>
            <Input
              type="date"
              value={form.data_fine_prevista}
              onChange={(e) => updateField("data_fine_prevista", e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label>Link Contratto</Label>
          <Input
            value={form.contratto_file_url}
            onChange={(e) => updateField("contratto_file_url", e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div>
          <Label>Stato</Label>
          <Select value={form.stato} onValueChange={(value) => updateField("stato", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="attivo">Attivo</SelectItem>
              <SelectItem value="scaduto">Scaduto</SelectItem>
              <SelectItem value="risolto">Risolto</SelectItem>
              <SelectItem value="completato">Completato</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Sezione documenti */}
      <div className="border rounded-lg p-4 space-y-3 bg-slate-50">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Documenti da allegare
          </Label>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              onChange={handleFileSelected}
              className="hidden"
            />
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Aggiungi file
            </Button>
          </div>
        </div>

        {documentiDaAllegare.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-2">Nessun documento in coda</p>
        ) : (
          <div className="space-y-2">
            {documentiDaAllegare.map((doc, i) => (
              <div key={i} className="flex items-center gap-2 bg-white border rounded p-2">
                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                <Input
                  value={doc.titolo}
                  onChange={(e) => updateDocMeta(i, 'titolo', e.target.value)}
                  placeholder="Titolo"
                  className="h-8 text-sm flex-1"
                />
                <Select value={doc.categoria} onValueChange={(v) => updateDocMeta(i, 'categoria', v)}>
                  <SelectTrigger className="h-8 w-36 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contratti">Contratti</SelectItem>
                    <SelectItem value="visure">Visure</SelectItem>
                    <SelectItem value="durc">DURC</SelectItem>
                    <SelectItem value="certificazioni">Certificazioni</SelectItem>
                    <SelectItem value="polizze">Polizze</SelectItem>
                    <SelectItem value="fatture">Fatture</SelectItem>
                    <SelectItem value="verbali">Verbali</SelectItem>
                    <SelectItem value="altro">Altro</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50 hover:text-red-600 shrink-0" onClick={() => removeDoc(i)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Annulla
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
          <Save className="w-4 h-4 mr-2" />
          {subappalto ? "Aggiorna" : "Salva"}
        </Button>
      </div>
    </form>
  );
}