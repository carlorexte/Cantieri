import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, X } from "lucide-react";

export default function PersonaEsternaForm({ persona, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    nome: persona?.nome || "",
    cognome: persona?.cognome || "",
    qualifica: persona?.qualifica || "",
    codice_fiscale: persona?.codice_fiscale || "",
    partita_iva: persona?.partita_iva || "",
    data_nascita: persona?.data_nascita || "",
    indirizzo: persona?.indirizzo || "",
    cap: persona?.cap || "",
    citta: persona?.citta || "",
    provincia: persona?.provincia || "",
    telefono: persona?.telefono || "",
    email: persona?.email || "",
    pec: persona?.pec || "",
    note: persona?.note || ""
  });

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Nome e Cognome */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Nome *</Label>
          <Input
            value={form.nome}
            onChange={(e) => updateField("nome", e.target.value)}
            required
            placeholder="Mario"
          />
        </div>
        <div>
          <Label>Cognome *</Label>
          <Input
            value={form.cognome}
            onChange={(e) => updateField("cognome", e.target.value)}
            required
            placeholder="Rossi"
          />
        </div>
      </div>

      {/* Qualifica */}
      <div>
        <Label>Qualifica</Label>
        <Input
          value={form.qualifica}
          onChange={(e) => updateField("qualifica", e.target.value)}
          placeholder="es. Architetto, Ingegnere, Geometra, Direttore Lavori"
        />
      </div>

      {/* Codice Fiscale / Partita IVA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Codice Fiscale</Label>
          <Input
            value={form.codice_fiscale}
            onChange={(e) => updateField("codice_fiscale", e.target.value)}
            placeholder="RSSMRA80A01H501U"
          />
        </div>
        <div>
          <Label>Partita IVA</Label>
          <Input
            value={form.partita_iva}
            onChange={(e) => updateField("partita_iva", e.target.value)}
            placeholder="12345678901"
          />
          <p className="text-xs text-slate-500 mt-1">Se professionista o impresa</p>
        </div>
      </div>

      {/* Data di Nascita */}
      <div>
        <Label>Data di Nascita</Label>
        <Input
          type="date"
          value={form.data_nascita}
          onChange={(e) => updateField("data_nascita", e.target.value)}
        />
        <p className="text-xs text-slate-500 mt-1">Opzionale, utile per persone fisiche</p>
      </div>

      {/* Recapiti */}
      <div className="space-y-4 pt-4 border-t">
        <h4 className="font-semibold text-slate-900">Recapiti</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Telefono</Label>
            <Input
              value={form.telefono}
              onChange={(e) => updateField("telefono", e.target.value)}
              placeholder="+39 123 456 7890"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="email@example.com"
            />
          </div>
        </div>

        <div>
          <Label>PEC</Label>
          <Input
            type="email"
            value={form.pec}
            onChange={(e) => updateField("pec", e.target.value)}
            placeholder="pec@example.com"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Label>Indirizzo</Label>
            <Input
              value={form.indirizzo}
              onChange={(e) => updateField("indirizzo", e.target.value)}
              placeholder="Via Roma, 123"
            />
          </div>
          <div>
            <Label>CAP</Label>
            <Input
              value={form.cap}
              onChange={(e) => updateField("cap", e.target.value)}
              placeholder="20100"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Città</Label>
            <Input
              value={form.citta}
              onChange={(e) => updateField("citta", e.target.value)}
              placeholder="Milano"
            />
          </div>
          <div>
            <Label>Provincia</Label>
            <Input
              value={form.provincia}
              onChange={(e) => updateField("provincia", e.target.value)}
              placeholder="MI"
              maxLength={2}
            />
          </div>
        </div>
      </div>

      {/* Note */}
      <div className="pt-4 border-t">
        <Label>Note</Label>
        <Textarea
          value={form.note}
          onChange={(e) => updateField("note", e.target.value)}
          placeholder="Note aggiuntive..."
          rows={4}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Annulla
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
          <Save className="w-4 h-4 mr-2" />
          {persona ? "Aggiorna" : "Salva"} Persona
        </Button>
      </div>
    </form>
  );
}