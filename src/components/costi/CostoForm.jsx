import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X } from "lucide-react";

export default function CostoForm({ cantieri, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    cantiere_id: "",
    categoria: "materiali",
    descrizione: "",
    importo: "",
    data_sostenimento: new Date().toISOString().slice(0, 10),
    fornitore: "",
    numero_documento: "",
    stato_pagamento: "da_pagare",
    note: ""
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
        ...formData,
        importo: parseFloat(formData.importo)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div>
        <Label htmlFor="cantiere_id">Cantiere *</Label>
        <Select value={formData.cantiere_id} onValueChange={(v) => handleChange("cantiere_id", v)} required>
          <SelectTrigger><SelectValue placeholder="Seleziona cantiere" /></SelectTrigger>
          <SelectContent>
            {cantieri.map(c => <SelectItem key={c.id} value={c.id}>{c.denominazione}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="descrizione">Descrizione *</Label>
        <Input id="descrizione" value={formData.descrizione} onChange={(e) => handleChange("descrizione", e.target.value)} required />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="categoria">Categoria *</Label>
          <Select value={formData.categoria} onValueChange={(v) => handleChange("categoria", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="manodopera">Manodopera</SelectItem>
              <SelectItem value="materiali">Materiali</SelectItem>
              <SelectItem value="noli">Noli</SelectItem>
              <SelectItem value="subappalti">Subappalti</SelectItem>
              <SelectItem value="spese_generali">Spese Generali</SelectItem>
              <SelectItem value="sicurezza">Sicurezza</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="importo">Importo (€) *</Label>
          <Input id="importo" type="number" step="0.01" value={formData.importo} onChange={(e) => handleChange("importo", e.target.value)} required />
        </div>
      </div>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
            <Label htmlFor="data_sostenimento">Data Sostenimento *</Label>
            <Input id="data_sostenimento" type="date" value={formData.data_sostenimento} onChange={(e) => handleChange("data_sostenimento", e.target.value)} required />
        </div>
         <div>
            <Label htmlFor="fornitore">Fornitore</Label>
            <Input id="fornitore" value={formData.fornitore} onChange={(e) => handleChange("fornitore", e.target.value)} />
        </div>
      </div>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
            <Label htmlFor="numero_documento">Numero Documento (Fattura)</Label>
            <Input id="numero_documento" value={formData.numero_documento} onChange={(e) => handleChange("numero_documento", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="stato_pagamento">Stato Pagamento</Label>
          <Select value={formData.stato_pagamento} onValueChange={(v) => handleChange("stato_pagamento", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="da_pagare">Da Pagare</SelectItem>
              <SelectItem value="pagato">Pagato</SelectItem>
              <SelectItem value="in_contenzioso">In Contenzioso</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
       <div>
            <Label htmlFor="note">Note</Label>
            <Textarea id="note" value={formData.note} onChange={(e) => handleChange("note", e.target.value)} />
        </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}><X className="w-4 h-4 mr-2" />Annulla</Button>
        <Button type="submit"><Save className="w-4 h-4 mr-2" />Salva Costo</Button>
      </div>
    </form>
  );
}