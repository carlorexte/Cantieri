import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, X, Calendar, Trash2, Flag, Route, Plus, Minus } from "lucide-react";
import { toast } from "sonner";

const TIPO_DIPENDENZA_LABELS = {
  'FS': 'Finish-to-Start (Fine → Inizio)',
  'SS': 'Start-to-Start (Inizio → Inizio)',
  'FF': 'Finish-to-Finish (Fine → Fine)',
  'SF': 'Start-to-Finish (Inizio → Fine)'
};

export default function AttivitaForm({ attivita, cantiere_id, onSubmit, onCancel, onDelete }) {
  const [formData, setFormData] = useState(attivita || {
    cantiere_id: cantiere_id,
    gruppo_fase: "",
    descrizione: "",
    tipo_attivita: "task",
    data_inizio: "",
    data_fine: "",
    durata_giorni: "",
    percentuale_completamento: 0,
    colore: "#3b82f6",
    categoria: "altro",
    predecessori: [],
    responsabile: "",
    note: "",
    stato: "pianificata"
  });

  const [attivitaDisponibili, setAttivitaDisponibili] = useState([]);
  const [attivitaParentId, setAttivitaParentId] = useState("");

  useEffect(() => {
    const loadAttivita = async () => {
      if (cantiere_id) {
        try {
          const attivitaList = await base44.entities.Attivita.filter({ cantiere_id }, "data_inizio");
          const disponibili = attivitaList.filter(a => !attivita || a.id !== attivita.id);
          setAttivitaDisponibili(disponibili);
          
          if (attivita?.gruppo_fase) {
            const parent = disponibili.find(a => a.descrizione === attivita.gruppo_fase);
            if (parent) {
              setAttivitaParentId(parent.id);
            }
          }
        } catch (error) {
          console.error("Errore caricamento attività:", error);
        }
      }
    };
    loadAttivita();
  }, [cantiere_id, attivita]);

  // Quando cambia il tipo di attività, aggiorna la durata
  useEffect(() => {
    if (formData.tipo_attivita === 'milestone') {
      setFormData(prev => ({
        ...prev,
        durata_giorni: 0,
        data_fine: prev.data_inizio // Per milestone, data fine = data inizio
      }));
    }
  }, [formData.tipo_attivita]);

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Calcolo automatico durata per task normali
    if (formData.tipo_attivita === 'task') {
      if (field === "data_inizio" || field === "data_fine") {
        const inizio = new Date(field === "data_inizio" ? value : formData.data_inizio);
        const fine = new Date(field === "data_fine" ? value : formData.data_fine);
        
        if (inizio && fine && fine >= inizio) {
          const diffTime = Math.abs(fine - inizio);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          setFormData(prev => ({
            ...prev,
            durata_giorni: diffDays
          }));
        }
      }
    }
  };

  const handleParentChange = (parentId) => {
    setAttivitaParentId(parentId);
    
    if (parentId === "nessuno") {
      setFormData(prev => ({ ...prev, gruppo_fase: "" }));
    } else {
      const parent = attivitaDisponibili.find(a => a.id === parentId);
      if (parent) {
        setFormData(prev => ({ ...prev, gruppo_fase: parent.descrizione }));
      }
    }
  };

  const aggiungiPredecessore = () => {
    setFormData(prev => ({
      ...prev,
      predecessori: [
        ...(prev.predecessori || []),
        { attivita_id: "", tipo_dipendenza: "FS", lag_giorni: 0 }
      ]
    }));
  };

  const rimuoviPredecessore = (index) => {
    setFormData(prev => ({
      ...prev,
      predecessori: prev.predecessori.filter((_, i) => i !== index)
    }));
  };

  const aggiornaPredecessore = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      predecessori: prev.predecessori.map((p, i) => 
        i === index ? { ...p, [field]: value } : p
      )
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validazione predecessori
    const predecessoriValidi = (formData.predecessori || []).filter(p => p.attivita_id);
    
    // Per milestone, forza durata a 0 e data_fine = data_inizio
    const dataToSubmit = formData.tipo_attivita === 'milestone' 
      ? {
          ...formData,
          durata_giorni: 0,
          data_fine: formData.data_inizio,
          predecessori: predecessoriValidi
        }
      : {
          ...formData,
          durata_giorni: parseInt(formData.durata_giorni) || 1,
          percentuale_completamento: parseInt(formData.percentuale_completamento) || 0,
          predecessori: predecessoriValidi
        };
    
    onSubmit(dataToSubmit);
  };

  const handleDelete = () => {
    if (window.confirm("Sei sicuro di voler eliminare questa attività? L'azione è irreversibile.")) {
      onDelete(attivita.id);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {attivita ? "Modifica Attività" : "Nuova Attività"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tipo Attività */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <Label>Tipo Attività</Label>
            <Select value={formData.tipo_attivita} onValueChange={(value) => handleChange("tipo_attivita", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="task">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Task Standard
                  </div>
                </SelectItem>
                <SelectItem value="milestone">
                  <div className="flex items-center gap-2">
                    <Flag className="w-4 h-4" />
                    Milestone (Evento significativo)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {formData.tipo_attivita === 'milestone' && (
              <p className="text-xs text-indigo-700 mt-2">
                💡 Le milestone hanno durata zero e marcano eventi importanti del progetto
              </p>
            )}
          </div>

          {/* Selezione Attività Parent */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <Label htmlFor="parent">Attività Parent (opzionale)</Label>
            <Select value={attivitaParentId || "nessuno"} onValueChange={handleParentChange}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona un'attività parent o lascia vuoto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nessuno">🔹 Nessun parent (attività indipendente)</SelectItem>
                {attivitaDisponibili.map(att => (
                  <SelectItem key={att.id} value={att.id}>
                    {att.gruppo_fase && `${att.gruppo_fase} > `}{att.descrizione}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-blue-700 mt-2">
              💡 Seleziona un'attività parent per raggrupparla sotto la stessa fase. Lascia vuoto per un'attività indipendente.
            </p>
          </div>

          {/* Gruppo/Fase */}
          <div>
            <Label htmlFor="gruppo_fase">Gruppo/Fase {attivitaParentId && attivitaParentId !== "nessuno" ? "(automatico dal parent)" : "(opzionale)"}</Label>
            <Input
              id="gruppo_fase"
              value={formData.gruppo_fase}
              onChange={(e) => handleChange("gruppo_fase", e.target.value)}
              placeholder="es. Opere Edili, Impiantistica, Finiture..."
              readOnly={attivitaParentId && attivitaParentId !== "nessuno"}
              className={attivitaParentId && attivitaParentId !== "nessuno" ? "bg-slate-100" : ""}
            />
          </div>

          <div>
            <Label htmlFor="descrizione">Descrizione Attività *</Label>
            <Input
              id="descrizione"
              value={formData.descrizione}
              onChange={(e) => handleChange("descrizione", e.target.value)}
              placeholder="es. Consegna lavori"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="data_inizio">Data Inizio *</Label>
              <Input
                id="data_inizio"
                type="date"
                value={formData.data_inizio}
                onChange={(e) => handleChange("data_inizio", e.target.value)}
                required
              />
            </div>
            {formData.tipo_attivita === 'task' && (
              <>
                <div>
                  <Label htmlFor="data_fine">Data Fine *</Label>
                  <Input
                    id="data_fine"
                    type="date"
                    value={formData.data_fine}
                    onChange={(e) => handleChange("data_fine", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="durata_giorni">Durata (giorni)</Label>
                  <Input
                    id="durata_giorni"
                    type="number"
                    value={formData.durata_giorni}
                    onChange={(e) => handleChange("durata_giorni", e.target.value)}
                    placeholder="Calcolato automaticamente"
                    readOnly
                  />
                </div>
              </>
            )}
          </div>

          {/* Predecessori/Dipendenze */}
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Route className="w-5 h-5 text-indigo-600" />
                <Label className="text-base font-semibold">Dipendenze (Predecessori)</Label>
              </div>
              <Button type="button" onClick={aggiungiPredecessore} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Aggiungi Dipendenza
              </Button>
            </div>
            
            {(!formData.predecessori || formData.predecessori.length === 0) && (
              <p className="text-sm text-slate-500 italic">
                Nessuna dipendenza. Questa attività può iniziare indipendentemente.
              </p>
            )}

            {formData.predecessori && formData.predecessori.map((pred, index) => (
              <div key={index} className="border rounded-lg p-3 mb-3 bg-slate-50">
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="secondary" className="bg-indigo-100 text-indigo-800">
                    Dipendenza {index + 1}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => rimuoviPredecessore(index)}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-sm">Attività Predecessore *</Label>
                    <Select 
                      value={pred.attivita_id} 
                      onValueChange={(value) => aggiornaPredecessore(index, 'attivita_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona..." />
                      </SelectTrigger>
                      <SelectContent>
                        {attivitaDisponibili.map(att => (
                          <SelectItem key={att.id} value={att.id}>
                            {att.descrizione}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm">Tipo Dipendenza</Label>
                    <Select 
                      value={pred.tipo_dipendenza || 'FS'} 
                      onValueChange={(value) => aggiornaPredecessore(index, 'tipo_dipendenza', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TIPO_DIPENDENZA_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm">Lag (giorni)</Label>
                    <Input
                      type="number"
                      value={pred.lag_giorni || 0}
                      onChange={(e) => aggiornaPredecessore(index, 'lag_giorni', parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Positivo = ritardo, Negativo = anticipo
                    </p>
                  </div>
                </div>
              </div>
            ))}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
              <p className="text-xs text-blue-800 font-medium">📌 Tipi di Dipendenza:</p>
              <ul className="text-xs text-blue-700 mt-1 space-y-1">
                <li><strong>FS</strong> (Finish-to-Start): L'attività inizia quando il predecessore finisce</li>
                <li><strong>SS</strong> (Start-to-Start): L'attività inizia quando il predecessore inizia</li>
                <li><strong>FF</strong> (Finish-to-Finish): L'attività finisce quando il predecessore finisce</li>
                <li><strong>SF</strong> (Start-to-Finish): L'attività finisce quando il predecessore inizia</li>
              </ul>
            </div>
          </div>

          {formData.tipo_attivita === 'task' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="categoria">Categoria</Label>
                  <Select value={formData.categoria} onValueChange={(value) => handleChange("categoria", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="preparazione">Preparazione</SelectItem>
                      <SelectItem value="strutture">Strutture</SelectItem>
                      <SelectItem value="impianti">Impianti</SelectItem>
                      <SelectItem value="finiture">Finiture</SelectItem>
                      <SelectItem value="collaudi">Collaudi</SelectItem>
                      <SelectItem value="altro">Altro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="stato">Stato</Label>
                  <Select value={formData.stato} onValueChange={(value) => handleChange("stato", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pianificata">Pianificata</SelectItem>
                      <SelectItem value="in_corso">In Corso</SelectItem>
                      <SelectItem value="completata">Completata</SelectItem>
                      <SelectItem value="sospesa">Sospesa</SelectItem>
                      <SelectItem value="in_ritardo">In Ritardo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="percentuale_completamento">Completamento (%)</Label>
                  <Input
                    id="percentuale_completamento"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.percentuale_completamento}
                    onChange={(e) => handleChange("percentuale_completamento", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="responsabile">Responsabile</Label>
                  <Input
                    id="responsabile"
                    value={formData.responsabile}
                    onChange={(e) => handleChange("responsabile", e.target.value)}
                    placeholder="Nome responsabile"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="colore">Colore Barra</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="colore"
                    type="color"
                    value={formData.colore}
                    onChange={(e) => handleChange("colore", e.target.value)}
                    className="w-20 h-10"
                  />
                  <span className="text-sm text-slate-600">Seleziona il colore per il cronoprogramma</span>
                </div>
              </div>
            </>
          )}

          <div>
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              value={formData.note}
              onChange={(e) => handleChange("note", e.target.value)}
              placeholder="Note aggiuntive sull'attività"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between gap-3">
        <div>
          {attivita && onDelete && (
            <Button 
              type="button" 
              variant="destructive" 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Elimina
            </Button>
          )}
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Annulla
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" />
            {attivita ? "Aggiorna" : "Salva"} Attività
          </Button>
        </div>
      </div>
    </form>
  );
}