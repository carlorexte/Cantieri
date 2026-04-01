import React, { useEffect, useState } from "react";
import { backendClient } from "@/api/backendClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, X, Calendar, Trash2, Flag, Route, Plus, Minus } from "lucide-react";

const TIPO_DIPENDENZA_LABELS = {
  FS: "Finish-to-Start (Fine -> Inizio)",
  SS: "Start-to-Start (Inizio -> Inizio)",
  FF: "Finish-to-Finish (Fine -> Fine)",
  SF: "Start-to-Finish (Inizio -> Fine)"
};

const TIPO_VINCOLO_LABELS = {
  asap: "ASAP - Al piu presto",
  alap: "ALAP - Il piu tardi possibile",
  snet: "SNET - Inizio non prima del",
  snlt: "SNLT - Inizio non oltre il",
  fnet: "FNET - Fine non prima del",
  fnlt: "FNLT - Fine non oltre il",
  mso: "MSO - Deve iniziare il",
  mfo: "MFO - Deve finire il"
};

function createInitialFormData(attivita, cantiereId) {
  return attivita || {
    cantiere_id: cantiereId,
    gruppo_fase: "",
    wbs: "",
    parent_id: null,
    descrizione: "",
    tipo_attivita: "task",
    data_inizio: "",
    data_fine: "",
    durata_giorni: "",
    percentuale_completamento: 0,
    importo_previsto: 0,
    importo_eseguito: 0,
    colore: "#3b82f6",
    categoria: "altro",
    predecessori: [],
    responsabile: "",
    assegnatario_tipo: "",
    assegnatario_id: "",
    note: "",
    stato: "pianificata",
    vincolo_tipo: "asap",
    vincolo_data: "",
    baseline_start_date: "",
    baseline_end_date: ""
  };
}

export default function AttivitaForm({ attivita, cantiere_id, onSubmit, onCancel, onDelete }) {
  const [formData, setFormData] = useState(createInitialFormData(attivita, cantiere_id));
  const [attivitaDisponibili, setAttivitaDisponibili] = useState([]);
  const [imprese, setImprese] = useState([]);
  const [subappalti, setSubappalti] = useState([]);
  const [persone, setPersone] = useState([]);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    setFormData(createInitialFormData(attivita, cantiere_id));
  }, [attivita, cantiere_id]);

  useEffect(() => {
    const loadData = async () => {
      if (!cantiere_id) return;

      try {
        const [attivitaList, impreseList, subappaltiList, personeList, teamsList] = await Promise.all([
          backendClient.entities.Attivita.filter({ cantiere_id }, "data_inizio"),
          backendClient.entities.Impresa.list("ragione_sociale"),
          backendClient.entities.Subappalto.filter({ cantiere_id }),
          backendClient.entities.PersonaEsterna.list("cognome"),
          backendClient.entities.Team.list("nome")
        ]);

        const disponibili = attivitaList.filter((item) => !attivita || item.id !== attivita.id);
        setAttivitaDisponibili(disponibili);
        setImprese(impreseList);
        setSubappalti(subappaltiList);
        setPersone(personeList);
        setTeams(teamsList);

        if (attivita?.gruppo_fase && !attivita?.parent_id) {
          const parent = disponibili.find((item) => item.descrizione === attivita.gruppo_fase);
          if (parent) {
            setFormData((prev) => ({ ...prev, parent_id: parent.id }));
          }
        }
      } catch (error) {
        console.error("Errore caricamento dati:", error);
      }
    };

    loadData();
  }, [cantiere_id, attivita]);

  useEffect(() => {
    if (formData.tipo_attivita === "milestone") {
      setFormData((prev) => ({
        ...prev,
        durata_giorni: 1,
        data_fine: prev.data_inizio
      }));
    }
  }, [formData.tipo_attivita]);

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const next = {
        ...prev,
        [field]: value
      };

      if (next.tipo_attivita === "task" && (field === "data_inizio" || field === "data_fine")) {
        const start = new Date((field === "data_inizio" ? value : next.data_inizio) || "");
        const end = new Date((field === "data_fine" ? value : next.data_fine) || "");
        if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end >= start) {
          next.durata_giorni = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
        }
      }

      return next;
    });
  };

  const handleParentChange = (value) => {
    if (value === "nessuno") {
      setFormData((prev) => ({ ...prev, parent_id: null, gruppo_fase: "" }));
      return;
    }

    const parent = attivitaDisponibili.find((item) => item.id === value);
    setFormData((prev) => ({
      ...prev,
      parent_id: value,
      gruppo_fase: parent?.descrizione || ""
    }));
  };

  const aggiungiPredecessore = () => {
    setFormData((prev) => ({
      ...prev,
      predecessori: [
        ...(prev.predecessori || []),
        { attivita_id: "", tipo_dipendenza: "FS", lag_giorni: 0 }
      ]
    }));
  };

  const rimuoviPredecessore = (index) => {
    setFormData((prev) => ({
      ...prev,
      predecessori: prev.predecessori.filter((_, currentIndex) => currentIndex !== index)
    }));
  };

  const aggiornaPredecessore = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      predecessori: prev.predecessori.map((item, currentIndex) =>
        currentIndex === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const predecessoriValidi = (formData.predecessori || []).filter((item) => item.attivita_id);
    const duration = formData.tipo_attivita === "milestone"
      ? 1
      : Math.max(1, parseInt(formData.durata_giorni, 10) || 1);

    const payload = {
      ...formData,
      durata_giorni: duration,
      data_fine: formData.tipo_attivita === "milestone" ? formData.data_inizio : formData.data_fine,
      percentuale_completamento: parseInt(formData.percentuale_completamento, 10) || 0,
      importo_previsto: parseFloat(formData.importo_previsto) || 0,
      predecessori: predecessoriValidi,
      vincolo_data: ["asap", "alap"].includes(formData.vincolo_tipo) ? "" : formData.vincolo_data
    };

    onSubmit(payload);
  };

  const handleDelete = () => {
    if (!attivita?.id || !onDelete) return;
    if (window.confirm("Sei sicuro di voler eliminare questa attivita? L'azione e irreversibile.")) {
      onDelete(attivita.id);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {attivita ? "Modifica Attivita" : "Nuova Attivita"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <Label>Tipo Attivita</Label>
            <Select value={formData.tipo_attivita} onValueChange={(value) => handleChange("tipo_attivita", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="task">Task Standard</SelectItem>
                <SelectItem value="milestone">Milestone</SelectItem>
                <SelectItem value="raggruppamento">Raggruppamento WBS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <Label htmlFor="parent_id">Attivita Parent (WBS)</Label>
            <Select value={formData.parent_id || "nessuno"} onValueChange={handleParentChange}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona livello superiore..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nessuno">Radice (Livello 0)</SelectItem>
                {attivitaDisponibili
                  .filter((item) => item.tipo_attivita === "raggruppamento" || !item.tipo_attivita)
                  .map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.wbs_code ? `${item.wbs_code} - ` : ""}{item.descrizione}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-blue-700 mt-2">Struttura gerarchica WBS del planning.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="wbs">Codice WBS</Label>
              <Input
                id="wbs"
                value={formData.wbs || ""}
                onChange={(event) => handleChange("wbs", event.target.value)}
                placeholder="es. 1.2.3"
              />
            </div>
            <div className="md:col-span-3">
              <Label htmlFor="descrizione">Descrizione Attivita *</Label>
              <Input
                id="descrizione"
                value={formData.descrizione}
                onChange={(event) => handleChange("descrizione", event.target.value)}
                placeholder="es. Getto fondazioni"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="data_inizio">Data Inizio *</Label>
              <Input
                id="data_inizio"
                type="date"
                value={formData.data_inizio}
                onChange={(event) => handleChange("data_inizio", event.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="data_fine">Data Fine {formData.tipo_attivita === "milestone" ? "" : "*"}</Label>
              <Input
                id="data_fine"
                type="date"
                value={formData.tipo_attivita === "milestone" ? formData.data_inizio : formData.data_fine}
                onChange={(event) => handleChange("data_fine", event.target.value)}
                required={formData.tipo_attivita !== "milestone"}
                disabled={formData.tipo_attivita === "milestone"}
              />
            </div>
            <div>
              <Label htmlFor="durata_giorni">Durata (giorni)</Label>
              <Input
                id="durata_giorni"
                type="number"
                min="1"
                value={formData.durata_giorni}
                onChange={(event) => handleChange("durata_giorni", event.target.value)}
                readOnly={formData.tipo_attivita === "task"}
              />
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <Flag className="w-5 h-5 text-amber-600" />
              <Label className="text-base font-semibold">Vincoli di pianificazione</Label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vincolo_tipo">Tipo vincolo</Label>
                <Select value={formData.vincolo_tipo || "asap"} onValueChange={(value) => handleChange("vincolo_tipo", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_VINCOLO_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="vincolo_data">Data vincolo</Label>
                <Input
                  id="vincolo_data"
                  type="date"
                  value={formData.vincolo_data || ""}
                  onChange={(event) => handleChange("vincolo_data", event.target.value)}
                  disabled={["asap", "alap"].includes(formData.vincolo_tipo || "asap")}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-emerald-600" />
              <Label className="text-base font-semibold">Baseline</Label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="baseline_start_date">Inizio baseline</Label>
                <Input
                  id="baseline_start_date"
                  type="date"
                  value={formData.baseline_start_date || ""}
                  onChange={(event) => handleChange("baseline_start_date", event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="baseline_end_date">Fine baseline</Label>
                <Input
                  id="baseline_end_date"
                  type="date"
                  value={formData.baseline_end_date || ""}
                  onChange={(event) => handleChange("baseline_end_date", event.target.value)}
                />
              </div>
            </div>
          </div>

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
              <p className="text-sm text-slate-500 italic">Nessuna dipendenza. L'attivita puo iniziare indipendentemente.</p>
            )}

            {formData.predecessori?.map((pred, index) => (
              <div key={`${pred.attivita_id || "pred"}-${index}`} className="border rounded-lg p-3 mb-3 bg-slate-50">
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="secondary">Dipendenza {index + 1}</Badge>
                  <Button type="button" variant="ghost" size="sm" onClick={() => rimuoviPredecessore(index)}>
                    <Minus className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-sm">Attivita predecessore *</Label>
                    <Select value={pred.attivita_id} onValueChange={(value) => aggiornaPredecessore(index, "attivita_id", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona..." />
                      </SelectTrigger>
                      <SelectContent>
                        {attivitaDisponibili.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.wbs_code ? `${item.wbs_code} - ` : ""}{item.descrizione}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm">Tipo dipendenza</Label>
                    <Select value={pred.tipo_dipendenza || "FS"} onValueChange={(value) => aggiornaPredecessore(index, "tipo_dipendenza", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TIPO_DIPENDENZA_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm">Lag (giorni)</Label>
                    <Input
                      type="number"
                      value={pred.lag_giorni || 0}
                      onChange={(event) => aggiornaPredecessore(index, "lag_giorni", parseInt(event.target.value, 10) || 0)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {formData.tipo_attivita === "task" && (
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
                    onChange={(event) => handleChange("percentuale_completamento", event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="importo_previsto">Importo Previsto (EUR)</Label>
                  <Input
                    id="importo_previsto"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.importo_previsto}
                    onChange={(event) => handleChange("importo_previsto", parseFloat(event.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="assegnatario_tipo">Tipo Assegnatario</Label>
                  <Select value={formData.assegnatario_tipo || "nessuno"} onValueChange={(value) => handleChange("assegnatario_tipo", value === "nessuno" ? "" : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona tipo..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nessuno">Nessuno</SelectItem>
                      <SelectItem value="impresa">Impresa</SelectItem>
                      <SelectItem value="subappalto">Subappalto</SelectItem>
                      <SelectItem value="interno">Persona Esterna / Interno</SelectItem>
                      <SelectItem value="team">Team / Squadra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.assegnatario_tipo && (
                  <div>
                    <Label htmlFor="assegnatario_id">Assegnatario</Label>
                    <Select value={formData.assegnatario_id} onValueChange={(value) => handleChange("assegnatario_id", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona..." />
                      </SelectTrigger>
                      <SelectContent>
                        {formData.assegnatario_tipo === "impresa" && imprese.map((item) => (
                          <SelectItem key={item.id} value={item.id}>{item.ragione_sociale}</SelectItem>
                        ))}
                        {formData.assegnatario_tipo === "subappalto" && subappalti.map((item) => (
                          <SelectItem key={item.id} value={item.id}>{item.ragione_sociale} ({item.categoria_lavori})</SelectItem>
                        ))}
                        {formData.assegnatario_tipo === "interno" && persone.map((item) => (
                          <SelectItem key={item.id} value={item.id}>{item.cognome} {item.nome} ({item.qualifica})</SelectItem>
                        ))}
                        {formData.assegnatario_tipo === "team" && teams.map((item) => (
                          <SelectItem key={item.id} value={item.id}>Team: {item.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="colore">Colore Barra</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="colore"
                    type="color"
                    value={formData.colore}
                    onChange={(event) => handleChange("colore", event.target.value)}
                    className="w-20 h-10"
                  />
                  <span className="text-sm text-slate-600">Colore della barra sul cronoprogramma</span>
                </div>
              </div>
            </>
          )}

          <div>
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              value={formData.note}
              onChange={(event) => handleChange("note", event.target.value)}
              placeholder="Note aggiuntive sull'attivita"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between gap-3">
        <div>
          {attivita && onDelete && (
            <Button type="button" variant="destructive" onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
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
            {attivita ? "Aggiorna" : "Salva"} Attivita
          </Button>
        </div>
      </div>
    </form>
  );
}
