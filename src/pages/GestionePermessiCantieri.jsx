import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Building2, Users, Save, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function GestionePermessiCantieriPage() {
  const [cantieri, setCantieri] = useState([]);
  const [utenti, setUtenti] = useState([]);
  const [permessi, setPermessi] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedCantiere, setSelectedCantiere] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [cantieriData, utentiData, permessiData, user] = await Promise.all([
        base44.entities.Cantiere.list(),
        base44.entities.User.list(),
        base44.entities.PermessoCantiereUtente.list(),
        base44.auth.me()
      ]);
      setCantieri(cantieriData);
      setUtenti(utentiData.filter(u => u.role !== 'admin'));
      setPermessi(permessiData);
      setCurrentUser(user);
    } catch (error) {
      console.error("Errore caricamento dati:", error);
      toast.error("Errore nel caricamento dei dati");
    }
    setIsLoading(false);
  };

  const handleAssegnaUtenti = async (cantiereId, utentiIds) => {
    try {
      await base44.entities.User.bulkUpdate(
        { id: { $in: utentiIds } },
        { $addToSet: { cantieri_assegnati: cantiereId } }
      );
      toast.success("Utenti assegnati al cantiere");
      loadData();
    } catch (error) {
      console.error("Errore assegnazione utenti:", error);
      toast.error("Errore nell'assegnazione degli utenti");
    }
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="p-8 text-center">
        <Building2 className="w-16 h-16 mx-auto mb-4 text-slate-400" />
        <h2 className="text-xl font-semibold mb-2">Accesso Negato</h2>
        <p className="text-slate-600">Non hai i permessi per accedere a questa pagina.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Gestione Permessi per Cantiere</h1>
          <p className="text-slate-600 mt-1">Assegna utenti specifici ai cantieri e configura i loro permessi</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Caricamento...</div>
        ) : (
          <div className="space-y-4">
            {cantieri.map(cantiere => {
              const utentiAssegnati = utenti.filter(u => 
                u.cantieri_assegnati?.includes(cantiere.id)
              );
              const permessiCantiere = permessi.filter(p => p.cantiere_id === cantiere.id);

              return (
                <Card key={cantiere.id} className="border-0 shadow-sm">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Building2 className="w-5 h-5 text-indigo-600" />
                          {cantiere.denominazione}
                        </CardTitle>
                        <p className="text-sm text-slate-500 mt-1">{cantiere.oggetto_lavori}</p>
                      </div>
                      <Button
                        onClick={() => {
                          setSelectedCantiere(cantiere);
                          setShowDialog(true);
                        }}
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Gestisci Utenti
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {utentiAssegnati.length === 0 ? (
                      <p className="text-sm text-slate-500 italic">Nessun utente assegnato (tutti gli utenti hanno accesso se hanno i permessi generali)</p>
                    ) : (
                      <div className="space-y-3">
                        {utentiAssegnati.map(utente => {
                          const permesso = permessiCantiere.find(p => p.utente_id === utente.id);
                          return (
                            <div key={utente.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                  <Users className="w-4 h-4 text-indigo-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{utente.full_name}</p>
                                  <p className="text-xs text-slate-500">{utente.email}</p>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                {permesso?.permessi?.edit && <Badge variant="secondary" className="text-xs">Modifica</Badge>}
                                {permesso?.permessi?.manage_documenti && <Badge variant="secondary" className="text-xs">Doc</Badge>}
                                {permesso?.permessi?.manage_sal && <Badge variant="secondary" className="text-xs">SAL</Badge>}
                                {permesso?.permessi?.manage_costi && <Badge variant="secondary" className="text-xs">Costi</Badge>}
                                {!permesso && <Badge variant="outline" className="text-xs">Solo visualizzazione</Badge>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <GestioneUtentiCantiereDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          cantiere={selectedCantiere}
          utenti={utenti}
          permessi={permessi}
          onSave={loadData}
        />
      </div>
    </div>
  );
}

function GestioneUtentiCantiereDialog({ open, onOpenChange, cantiere, utenti, permessi, onSave }) {
  const [selectedUtente, setSelectedUtente] = useState(null);
  const [permessiUtente, setPermessiUtente] = useState({
    view: true,
    edit: false,
    manage_documenti: false,
    manage_sal: false,
    manage_costi: false,
    manage_subappalti: false,
    manage_cronoprogramma: false
  });

  const handleAssegnaUtente = async () => {
    if (!selectedUtente || !cantiere) return;

    try {
      // Assegna cantiere all'utente
      const utente = await base44.entities.User.filter({ id: selectedUtente });
      if (utente.length > 0) {
        const cantieriAssegnati = utente[0].cantieri_assegnati || [];
        if (!cantieriAssegnati.includes(cantiere.id)) {
          await base44.entities.User.update(selectedUtente, {
            cantieri_assegnati: [...cantieriAssegnati, cantiere.id]
          });
        }
      }

      // Crea o aggiorna permessi specifici
      const permessoEsistente = permessi.find(
        p => p.utente_id === selectedUtente && p.cantiere_id === cantiere.id
      );

      if (permessoEsistente) {
        await base44.entities.PermessoCantiereUtente.update(permessoEsistente.id, {
          permessi: permessiUtente
        });
      } else {
        await base44.entities.PermessoCantiereUtente.create({
          utente_id: selectedUtente,
          cantiere_id: cantiere.id,
          permessi: permessiUtente
        });
      }

      toast.success("Utente assegnato con successo");
      setSelectedUtente(null);
      setPermessiUtente({
        view: true,
        edit: false,
        manage_documenti: false,
        manage_sal: false,
        manage_costi: false,
        manage_subappalti: false,
        manage_cronoprogramma: false
      });
      onSave();
    } catch (error) {
      console.error("Errore assegnazione utente:", error);
      toast.error("Errore nell'assegnazione dell'utente");
    }
  };

  const handleRimuoviUtente = async (utenteId) => {
    if (!cantiere) return;

    try {
      const utente = await base44.entities.User.filter({ id: utenteId });
      if (utente.length > 0) {
        const cantieriAssegnati = (utente[0].cantieri_assegnati || []).filter(
          id => id !== cantiere.id
        );
        await base44.entities.User.update(utenteId, {
          cantieri_assegnati: cantieriAssegnati
        });
      }

      // Rimuovi anche i permessi specifici
      const permesso = permessi.find(
        p => p.utente_id === utenteId && p.cantiere_id === cantiere.id
      );
      if (permesso) {
        await base44.entities.PermessoCantiereUtente.delete(permesso.id);
      }

      toast.success("Utente rimosso dal cantiere");
      onSave();
    } catch (error) {
      console.error("Errore rimozione utente:", error);
      toast.error("Errore nella rimozione dell'utente");
    }
  };

  if (!cantiere) return null;

  const utentiAssegnati = utenti.filter(u => 
    u.cantieri_assegnati?.includes(cantiere.id)
  );
  const utentiDisponibili = utenti.filter(u => 
    !u.cantieri_assegnati?.includes(cantiere.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestisci Utenti - {cantiere.denominazione}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Aggiungi nuovo utente */}
          <Card className="border-0 bg-slate-50">
            <CardHeader>
              <CardTitle className="text-sm">Assegna Nuovo Utente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Seleziona Utente</Label>
                <Select value={selectedUtente || ""} onValueChange={setSelectedUtente}>
                  <SelectTrigger>
                    <SelectValue placeholder="Scegli un utente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {utentiDisponibili.map(utente => (
                      <SelectItem key={utente.id} value={utente.id}>
                        {utente.full_name} ({utente.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedUtente && (
                <>
                  <div className="space-y-3">
                    <Label>Permessi Specifici</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={permessiUtente.edit}
                          onCheckedChange={(checked) => setPermessiUtente(prev => ({ ...prev, edit: checked }))}
                        />
                        <Label className="text-sm">Modifica Cantiere</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={permessiUtente.manage_documenti}
                          onCheckedChange={(checked) => setPermessiUtente(prev => ({ ...prev, manage_documenti: checked }))}
                        />
                        <Label className="text-sm">Gestione Documenti</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={permessiUtente.manage_sal}
                          onCheckedChange={(checked) => setPermessiUtente(prev => ({ ...prev, manage_sal: checked }))}
                        />
                        <Label className="text-sm">Gestione SAL</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={permessiUtente.manage_costi}
                          onCheckedChange={(checked) => setPermessiUtente(prev => ({ ...prev, manage_costi: checked }))}
                        />
                        <Label className="text-sm">Gestione Costi</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={permessiUtente.manage_subappalti}
                          onCheckedChange={(checked) => setPermessiUtente(prev => ({ ...prev, manage_subappalti: checked }))}
                        />
                        <Label className="text-sm">Gestione Subappalti</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={permessiUtente.manage_cronoprogramma}
                          onCheckedChange={(checked) => setPermessiUtente(prev => ({ ...prev, manage_cronoprogramma: checked }))}
                        />
                        <Label className="text-sm">Gestione Cronoprogramma</Label>
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleAssegnaUtente} className="w-full bg-indigo-600 hover:bg-indigo-700">
                    <Save className="w-4 h-4 mr-2" />
                    Assegna Utente
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Lista utenti assegnati */}
          <div>
            <h3 className="font-semibold mb-3">Utenti Assegnati ({utentiAssegnati.length})</h3>
            <div className="space-y-2">
              {utentiAssegnati.map(utente => {
                const permesso = permessi.find(
                  p => p.utente_id === utente.id && p.cantiere_id === cantiere.id
                );
                return (
                  <Card key={utente.id} className="border-0 bg-slate-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                            <Users className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <p className="font-medium">{utente.full_name}</p>
                            <p className="text-sm text-slate-500">{utente.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex flex-wrap gap-1">
                            {permesso?.permessi?.edit && <Badge className="text-xs bg-blue-100 text-blue-800">Modifica</Badge>}
                            {permesso?.permessi?.manage_documenti && <Badge className="text-xs bg-green-100 text-green-800">Doc</Badge>}
                            {permesso?.permessi?.manage_sal && <Badge className="text-xs bg-purple-100 text-purple-800">SAL</Badge>}
                            {permesso?.permessi?.manage_costi && <Badge className="text-xs bg-orange-100 text-orange-800">Costi</Badge>}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRimuoviUtente(utente.id)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}