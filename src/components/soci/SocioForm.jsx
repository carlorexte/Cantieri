
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, X, Calculator, Plus, Trash2, Users } from "lucide-react"; // FileText icon removed

export default function SocioForm({ socio, cantieri, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(socio || {
    cantiere_id: "",
    ragione_sociale: "",
    tipo_socio: "socio_esecutore",
    imprese_socie: [],
    importo_computo: "",
    ribasso_percentuale: "",
    ribasso_importo: "",
    importo_netto_ribasso: "",
    percentuale_ripartizione: "",
    importo_contrattuale: "",
    oneri_sicurezza: "",
    categoria_lavori: "",
    partita_iva: "",
    codice_fiscale: "",
    indirizzo: "",
    telefono: "",
    email: "",
    stato: "attivo",
    data_delibera: "",
    delibera_url: "",
    // documenti_nas field removed from initial state
  });

  const handleChange = (field, value) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };

      // Calcoli automatici quando cambiano importo_computo o ribasso_percentuale
      if (field === "importo_computo" || field === "ribasso_percentuale") {
        const importo = parseFloat(newData.importo_computo) || 0;
        const ribasso = parseFloat(newData.ribasso_percentuale) || 0;
        
        newData.ribasso_importo = (importo * ribasso / 100);
        newData.importo_netto_ribasso = importo - newData.ribasso_importo;
        
        // Calcolo finale: 86% - 3%
        const importo86 = importo * 0.86;
        newData.importo_contrattuale = importo86 * 0.97; // -3%
      }

      return newData;
    });
  };

  const handleImpresaChange = (index, field, value) => {
    const imprese = [...formData.imprese_socie];
    imprese[index] = { ...imprese[index], [field]: value };
    setFormData(prev => ({ ...prev, imprese_socie: imprese }));
  };

  const addImpresa = () => {
    setFormData(prev => ({
      ...prev,
      imprese_socie: [...(prev.imprese_socie || []), { // Added defensive check (prev.imprese_socie || [])
        ragione_sociale: "",
        partita_iva: "",
        codice_fiscale: "",
        indirizzo: "",
        email: "",
        telefono: ""
      }]
    }));
  };

  const removeImpresa = (index) => {
    const imprese = formData.imprese_socie.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, imprese_socie: imprese }));
  };

  // --- Documenti NAS Handlers removed ---

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const dataToSubmit = {
      ...formData,
      importo_computo: parseFloat(formData.importo_computo) || null,
      ribasso_percentuale: parseFloat(formData.ribasso_percentuale) || null,
      ribasso_importo: parseFloat(formData.ribasso_importo) || null,
      importo_netto_ribasso: parseFloat(formData.importo_netto_ribasso) || null,
      percentuale_ripartizione: parseFloat(formData.percentuale_ripartizione) || null,
      importo_contrattuale: parseFloat(formData.importo_contrattuale) || null,
      oneri_sicurezza: parseFloat(formData.oneri_sicurezza) || null,
      // documenti_nas are no longer part of this form
    };
    
    onSubmit(dataToSubmit);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Dati Generali Socio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cantiere_id">Cantiere *</Label>
              <Select value={formData.cantiere_id} onValueChange={(value) => handleChange("cantiere_id", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona cantiere" />
                </SelectTrigger>
                <SelectContent>
                  {cantieri.map(cantiere => (
                    <SelectItem key={cantiere.id} value={cantiere.id}>
                      {cantiere.oggetto_lavori || cantiere.denominazione}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="tipo_socio">Tipo Socio</Label>
              <Select value={formData.tipo_socio} onValueChange={(value) => handleChange("tipo_socio", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="socio_esecutore">Socio Esecutore</SelectItem>
                  <SelectItem value="subappaltatore">Subappaltatore</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="ragione_sociale">Ragione Sociale *</Label>
            <Input
              id="ragione_sociale"
              value={formData.ragione_sociale}
              onChange={(e) => handleChange("ragione_sociale", e.target.value)}
              placeholder="es. RCS s.r.l. - TAXUS s.r.l."
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="partita_iva">Partita IVA</Label>
              <Input
                id="partita_iva"
                value={formData.partita_iva}
                onChange={(e) => handleChange("partita_iva", e.target.value)}
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
          </div>
        </CardContent>
      </Card>

      {/* Sezione Imprese Socie (Consortile) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Imprese Socie (Consortile)
            </CardTitle>
            <Button type="button" variant="outline" onClick={addImpresa}>
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi Impresa
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(formData.imprese_socie || []).length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nessuna impresa socia aggiunta</p>
              <p className="text-sm">Aggiungi le imprese che compongono la consortile</p>
            </div>
          ) : (
            formData.imprese_socie.map((impresa, index) => (
              <Card key={index} className="border border-slate-200">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-semibold">Impresa {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeImpresa(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Ragione Sociale *</Label>
                      <Input
                        value={impresa.ragione_sociale || ""}
                        onChange={(e) => handleImpresaChange(index, "ragione_sociale", e.target.value)}
                        placeholder="Nome dell'impresa"
                        required
                      />
                    </div>
                    <div>
                      <Label>Partita IVA</Label>
                      <Input
                        value={impresa.partita_iva || ""}
                        onChange={(e) => handleImpresaChange(index, "partita_iva", e.target.value)}
                        placeholder="P.IVA"
                      />
                    </div>
                    <div>
                      <Label>Codice Fiscale</Label>
                      <Input
                        value={impresa.codice_fiscale || ""}
                        onChange={(e) => handleImpresaChange(index, "codice_fiscale", e.target.value)}
                        placeholder="Codice Fiscale"
                      />
                    </div>
                    <div>
                      <Label>Telefono</Label>
                      <Input
                        value={impresa.telefono || ""}
                        onChange={(e) => handleImpresaChange(index, "telefono", e.target.value)}
                        placeholder="Numero di telefono"
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={impresa.email || ""}
                        onChange={(e) => handleImpresaChange(index, "email", e.target.value)}
                        placeholder="email@impresa.com"
                      />
                    </div>
                    <div>
                      <Label>Indirizzo</Label>
                      <Input
                        value={impresa.indirizzo || ""}
                        onChange={(e) => handleImpresaChange(index, "indirizzo", e.target.value)}
                        placeholder="Via, città"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Calcoli Contrattuali</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="importo_computo">Importo Computo (€) *</Label>
              <Input
                id="importo_computo"
                type="number"
                value={formData.importo_computo}
                onChange={(e) => handleChange("importo_computo", e.target.value)}
                placeholder="3.025.980,07"
                step="0.01"
                required
              />
            </div>
            <div>
              <Label htmlFor="ribasso_percentuale">Ribasso (%)</Label>
              <Input
                id="ribasso_percentuale"
                type="number"
                value={formData.ribasso_percentuale}
                onChange={(e) => handleChange("ribasso_percentuale", e.target.value)}
                placeholder="21,398"
                step="0.001"
                min="0"
                max="100"
              />
            </div>
          </div>

          {/* Calcoli automatici visualizzati */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
            <div>
              <Label className="text-xs text-slate-600">Ribasso Importo</Label>
              <div className="text-lg font-bold text-red-600">
                € {formData.ribasso_importo ? parseFloat(formData.ribasso_importo).toLocaleString('it-IT') : '0'}
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-600">Importo Netto Ribasso</Label>
              <div className="text-lg font-bold text-blue-600">
                € {formData.importo_netto_ribasso ? parseFloat(formData.importo_netto_ribasso).toLocaleString('it-IT') : '0'}
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-600">Importo Contrattuale (86%-3%)</Label>
              <div className="text-lg font-bold text-green-600">
                € {formData.importo_contrattuale ? parseFloat(formData.importo_contrattuale).toLocaleString('it-IT') : '0'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="percentuale_ripartizione">Ripartizione (%)</Label>
              <Input
                id="percentuale_ripartizione"
                type="number"
                value={formData.percentuale_ripartizione}
                onChange={(e) => handleChange("percentuale_ripartizione", e.target.value)}
                step="0.01"
                min="0"
                max="100"
              />
            </div>
            <div>
              <Label htmlFor="oneri_sicurezza">Oneri Sicurezza (€)</Label>
              <Input
                id="oneri_sicurezza"
                type="number"
                value={formData.oneri_sicurezza}
                onChange={(e) => handleChange("oneri_sicurezza", e.target.value)}
                step="0.01"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sezione Documenti NAS (removed) */}

      <Card>
        <CardHeader>
          <CardTitle>Informazioni Aggiuntive</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="categoria_lavori">Categoria Lavori</Label>
            <Input
              id="categoria_lavori"
              value={formData.categoria_lavori}
              onChange={(e) => handleChange("categoria_lavori", e.target.value)}
              placeholder="es. Opere stradali, Impianti, ecc."
            />
          </div>

          <div>
            <Label htmlFor="indirizzo">Indirizzo</Label>
            <Input
              id="indirizzo"
              value={formData.indirizzo}
              onChange={(e) => handleChange("indirizzo", e.target.value)}
              placeholder="Via dei Mille, 40"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                placeholder="info@azienda.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="data_delibera">Data Delibera</Label>
              <Input
                id="data_delibera"
                type="date"
                value={formData.data_delibera}
                onChange={(e) => handleChange("data_delibera", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="delibera_url">Link Delibera</Label>
              <Input
                id="delibera_url"
                value={formData.delibera_url}
                onChange={(e) => handleChange("delibera_url", e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Annulla
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
          <Save className="w-4 h-4 mr-2" />
          {socio ? "Aggiorna" : "Salva"} Socio
        </Button>
      </div>
    </form>
  );
}
