
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X } from "lucide-react";
import { User } from "@/entities/User";
import { Cantiere } from "@/entities/Cantiere";

export default function AttivitaInternaForm({ attivita, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(attivita || {
    descrizione: "",
    dettagli: "",
    cantiere_id: "",
    assegnatario_id: "",
    data_assegnazione: new Date().toISOString().slice(0, 10),
    data_scadenza: "",
    priorita: "media",
    stato: "da_fare",
    data_completamento: "",
    note: "",
    tipo_attivita: "generale"
  });

  const [utenti, setUtenti] = useState([]);
  const [cantieri, setCantieri] = useState([]);

  useEffect(() => {
    loadDependencies();
  }, []);

  const loadDependencies = async () => {
    try {
      const usersData = await User.list();
      setUtenti(usersData);
      const cantieriData = await Cantiere.list();
      setCantieri(cantieriData);
    } catch (error) {
      console.error("Errore caricamento dipendenze:", error);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Replaced Card components with div elements to maintain structure after import changes */}
      <div className="border rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            {/* ClipboardList icon removed as per import changes */}
            Dettagli Attività
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <Label htmlFor="descrizione">Descrizione Attività *</Label>
            <Input
              id="descrizione"
              value={formData.descrizione}
              onChange={(e) => handleChange("descrizione", e.target.value)}
              placeholder="es. Preparare documentazione per SAL"
              required
            />
          </div>
          <div>
            <Label htmlFor="dettagli">Dettagli</Label>
            <Textarea
              id="dettagli"
              value={formData.dettagli}
              onChange={(e) => handleChange("dettagli", e.target.value)}
              placeholder="Aggiungi maggiori informazioni sul compito"
            />
          </div>
           <div>
            <Label htmlFor="cantiere_id">Cantiere (opzionale)</Label>
            <Select value={formData.cantiere_id} onValueChange={(value) => handleChange("cantiere_id", value)}>
              <SelectTrigger><SelectValue placeholder="Seleziona cantiere di riferimento"/></SelectTrigger>
              <SelectContent>
                {cantieri.map(c => <SelectItem key={c.id} value={c.id}>{c.denominazione}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      {/* Replaced Card components with div elements to maintain structure after import changes */}
      <div className="border rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Pianificazione</h2>
        </div>
        <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="assegnatario_id">Assegnato a *</Label>
                  <Select value={formData.assegnatario_id} onValueChange={(value) => handleChange("assegnatario_id", value)} required>
                    <SelectTrigger><SelectValue placeholder="Seleziona utente"/></SelectTrigger>
                    <SelectContent>
                      {utenti.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                 <div>
                  <Label htmlFor="data_scadenza">Data Scadenza</Label>
                  <Input type="date" id="data_scadenza" value={formData.data_scadenza} onChange={(e) => handleChange("data_scadenza", e.target.value)} />
                </div>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priorita">Priorità</Label>
                  <Select value={formData.priorita} onValueChange={(value) => handleChange("priorita", value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bassa">Bassa</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="critica">Critica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                 <div>
                  <Label htmlFor="stato">Stato</Label>
                   <Select value={formData.stato} onValueChange={(value) => handleChange("stato", value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="da_fare">Da Fare</SelectItem>
                      <SelectItem value="in_corso">In Corso</SelectItem>
                      <SelectItem value="in_revisione">In Revisione</SelectItem>
                      <SelectItem value="bloccato">Bloccato</SelectItem>
                      <SelectItem value="completato">Completato</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
            </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Annulla
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
          <Save className="w-4 h-4 mr-2" />
          {attivita ? "Aggiorna" : "Salva"} Attività
        </Button>
      </div>
    </form>
  );
}
