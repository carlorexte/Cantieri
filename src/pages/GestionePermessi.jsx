import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Shield, Users, Edit, Trash2, Save } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function GestionePermessiPage() {
  const [ruoli, setRuoli] = useState([]);
  const [utenti, setUtenti] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRuoloDialog, setShowRuoloDialog] = useState(false);
  const [editingRuolo, setEditingRuolo] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [ruoliData, utentiData, user] = await Promise.all([
        base44.entities.Ruolo.list(),
        base44.entities.User.list(),
        base44.auth.me()
      ]);
      setRuoli(ruoliData);
      setUtenti(utentiData);
      setCurrentUser(user);
    } catch (error) {
      console.error("Errore caricamento dati:", error);
      toast.error("Errore nel caricamento dei dati");
    }
    setIsLoading(false);
  };

  const handleSaveRuolo = async (ruoloData) => {
    try {
      if (editingRuolo) {
        await base44.entities.Ruolo.update(editingRuolo.id, ruoloData);
        toast.success("Ruolo aggiornato con successo");
      } else {
        await base44.entities.Ruolo.create(ruoloData);
        toast.success("Ruolo creato con successo");
      }
      setShowRuoloDialog(false);
      setEditingRuolo(null);
      loadData();
    } catch (error) {
      console.error("Errore salvataggio ruolo:", error);
      toast.error("Errore nel salvataggio del ruolo");
    }
  };

  const handleDeleteRuolo = async (ruoloId, isSystem) => {
    if (isSystem) {
      toast.error("Non puoi eliminare un ruolo di sistema");
      return;
    }
    if (window.confirm("Sei sicuro di voler eliminare questo ruolo?")) {
      try {
        await base44.entities.Ruolo.delete(ruoloId);
        toast.success("Ruolo eliminato");
        loadData();
      } catch (error) {
        console.error("Errore eliminazione ruolo:", error);
        toast.error("Errore nell'eliminazione del ruolo");
      }
    }
  };

  const handleAssegnaRuolo = async (userId, ruoloId) => {
    try {
      await base44.entities.User.update(userId, { ruolo_id: ruoloId });
      toast.success("Ruolo assegnato con successo");
      loadData();
    } catch (error) {
      console.error("Errore assegnazione ruolo:", error);
      toast.error("Errore nell'assegnazione del ruolo");
    }
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="p-8 text-center">
        <Shield className="w-16 h-16 mx-auto mb-4 text-slate-400" />
        <h2 className="text-xl font-semibold mb-2">Accesso Negato</h2>
        <p className="text-slate-600">Non hai i permessi per accedere a questa pagina.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Gestione Permessi e Ruoli</h1>
          <p className="text-slate-600 mt-1">Configura ruoli personalizzati e assegna permessi agli utenti</p>
        </div>

        <Tabs defaultValue="ruoli" className="space-y-6">
          <TabsList>
            <TabsTrigger value="ruoli" className="gap-2">
              <Shield className="w-4 h-4" />
              Ruoli
            </TabsTrigger>
            <TabsTrigger value="utenti" className="gap-2">
              <Users className="w-4 h-4" />
              Utenti
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ruoli">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Ruoli Personalizzati</h2>
              <Button onClick={() => {
                setEditingRuolo(null);
                setShowRuoloDialog(true);
              }} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Nuovo Ruolo
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-12">Caricamento...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ruoli.map(ruolo => (
                  <Card key={ruolo.id} className="border-0 shadow-sm">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            {ruolo.nome}
                            {ruolo.is_system && (
                              <Badge variant="secondary" className="text-xs">Sistema</Badge>
                            )}
                          </CardTitle>
                          <p className="text-sm text-slate-500 mt-1">{ruolo.descrizione}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 mb-4">
                        <p className="text-sm font-medium text-slate-700">Permessi attivi:</p>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(ruolo.permessi || {})
                            .filter(([_, value]) => value === true)
                            .slice(0, 5)
                            .map(([key]) => (
                              <Badge key={key} variant="outline" className="text-xs">
                                {key.replace(/_/g, ' ')}
                              </Badge>
                            ))}
                          {Object.values(ruolo.permessi || {}).filter(v => v === true).length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{Object.values(ruolo.permessi || {}).filter(v => v === true).length - 5} altri
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingRuolo(ruolo);
                            setShowRuoloDialog(true);
                          }}
                          className="flex-1"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Modifica
                        </Button>
                        {!ruolo.is_system && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteRuolo(ruolo.id, ruolo.is_system)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="utenti">
            <div className="mb-6">
              <h2 className="text-xl font-semibold">Gestione Utenti e Permessi</h2>
              <p className="text-sm text-slate-600 mt-1">Assegna ruoli personalizzati agli utenti</p>
            </div>

            {isLoading ? (
              <div className="text-center py-12">Caricamento...</div>
            ) : (
              <div className="space-y-4">
                {utenti.map(utente => {
                  const ruoloAssegnato = ruoli.find(r => r.id === utente.ruolo_id);
                  return (
                    <Card key={utente.id} className="border-0 shadow-sm">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                <Users className="w-5 h-5 text-indigo-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-slate-900">{utente.full_name}</h3>
                                <p className="text-sm text-slate-500">{utente.email}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-xs text-slate-500">Ruolo Sistema</p>
                              <Badge variant={utente.role === 'admin' ? 'default' : 'secondary'}>
                                {utente.role}
                              </Badge>
                            </div>
                            {ruoloAssegnato && (
                              <div className="text-right">
                                <p className="text-xs text-slate-500">Ruolo Personalizzato</p>
                                <Badge className="bg-indigo-600">
                                  {ruoloAssegnato.nome}
                                </Badge>
                              </div>
                            )}
                            <select
                              value={utente.ruolo_id || ""}
                              onChange={(e) => handleAssegnaRuolo(utente.id, e.target.value || null)}
                              className="px-3 py-2 border rounded-lg text-sm"
                            >
                              <option value="">Nessun ruolo personalizzato</option>
                              {ruoli.map(ruolo => (
                                <option key={ruolo.id} value={ruolo.id}>
                                  {ruolo.nome}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <RuoloDialog
          open={showRuoloDialog}
          onOpenChange={setShowRuoloDialog}
          ruolo={editingRuolo}
          onSave={handleSaveRuolo}
        />
      </div>
    </div>
  );
}

function RuoloDialog({ open, onOpenChange, ruolo, onSave }) {
  const [formData, setFormData] = useState({
    nome: "",
    descrizione: "",
    permessi: {},
    is_system: false
  });

  useEffect(() => {
    if (ruolo) {
      setFormData(ruolo);
    } else {
      setFormData({
        nome: "",
        descrizione: "",
        permessi: {},
        is_system: false
      });
    }
  }, [ruolo]);

  const permessiCategorie = {
    "Cantieri": ["cantieri_view", "cantieri_create", "cantieri_edit", "cantieri_delete"],
    "Documenti": ["documenti_view", "documenti_create", "documenti_edit", "documenti_delete"],
    "Imprese": ["imprese_view", "imprese_create", "imprese_edit", "imprese_delete"],
    "Professionisti": ["persone_view", "persone_create", "persone_edit", "persone_delete"],
    "Subappalti": ["subappalti_view", "subappalti_create", "subappalti_edit", "subappalti_delete"],
    "Costi": ["costi_view", "costi_create", "costi_edit", "costi_delete"],
    "SAL": ["sal_view", "sal_create", "sal_edit", "sal_delete"],
    "Attività": ["attivita_view", "attivita_create", "attivita_edit", "attivita_delete"],
    "Cronoprogramma": ["cronoprogramma_view", "cronoprogramma_edit"],
    "Sistema": ["dashboard_view", "profilo_azienda_view", "profilo_azienda_edit", "utenti_view", "utenti_manage"]
  };

  const handlePermessoChange = (permesso, value) => {
    setFormData(prev => ({
      ...prev,
      permessi: {
        ...prev.permessi,
        [permesso]: value
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ruolo ? "Modifica Ruolo" : "Nuovo Ruolo"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome Ruolo *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                required
                placeholder="es. Responsabile Cantiere"
              />
            </div>
            <div>
              <Label htmlFor="descrizione">Descrizione</Label>
              <Textarea
                id="descrizione"
                value={formData.descrizione}
                onChange={(e) => setFormData(prev => ({ ...prev, descrizione: e.target.value }))}
                placeholder="Descrivi il ruolo e le sue responsabilità"
                rows={3}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Permessi</h3>
            {Object.entries(permessiCategorie).map(([categoria, permessi]) => (
              <Card key={categoria} className="border-0 bg-slate-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{categoria}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {permessi.map(permesso => (
                      <div key={permesso} className="flex items-center space-x-2">
                        <Switch
                          id={permesso}
                          checked={formData.permessi?.[permesso] || false}
                          onCheckedChange={(checked) => handlePermessoChange(permesso, checked)}
                        />
                        <Label htmlFor={permesso} className="text-sm cursor-pointer">
                          {permesso.split('_').slice(1).join(' ')}
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
              <Save className="w-4 h-4 mr-2" />
              {ruolo ? "Aggiorna" : "Crea"} Ruolo
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}