import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Shield, Users, Edit, Trash2, Save, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

  const handleDeleteRuolo = async (ruoloId, isSystem) => {
    if (isSystem) {
      toast.error("Non puoi eliminare un ruolo di sistema");
      return;
    }
    if (window.confirm("Sei sicuro di voler eliminare questo ruolo? Attenzione: gli utenti assegnati perderanno i permessi associati.")) {
      try {
        const res = await base44.functions.invoke('managePermissions', {
          action: 'delete_role',
          data: { roleId: ruoloId }
        });
        
        if (res.data?.error) throw new Error(res.data.error);

        toast.success("Ruolo eliminato con successo");
        loadData();
      } catch (error) {
        console.error("Errore eliminazione ruolo:", error);
        toast.error("Errore nell'eliminazione del ruolo: " + error.message);
      }
    }
  };

  const handleAssegnaRuolo = async (userId, ruoloId) => {
    try {
      const res = await base44.functions.invoke('managePermissions', {
        action: 'assign_role',
        data: { userId, roleId }
      });
      
      if (res.data?.error) throw new Error(res.data.error);

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
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Gestione Permessi e Ruoli</h1>
          <p className="text-slate-600 mt-1">Definisci i permessi per entità e assegna ruoli agli utenti</p>
        </div>

        <Tabs defaultValue="ruoli" className="space-y-6">
          <TabsList className="bg-white border p-1 rounded-lg">
            <TabsTrigger value="ruoli" className="gap-2 px-6">
              <Shield className="w-4 h-4" />
              Ruoli
            </TabsTrigger>
            <TabsTrigger value="utenti" className="gap-2 px-6">
              <Users className="w-4 h-4" />
              Assegnazione Utenti
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ruoli">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold">Ruoli Personalizzati</h2>
                <p className="text-sm text-slate-600">Gestisci i modelli di permessi</p>
              </div>
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
                  <Card key={ruolo.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            {ruolo.nome}
                            {ruolo.is_system && (
                              <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-600">Sistema</Badge>
                            )}
                          </CardTitle>
                          <p className="text-sm text-slate-500 mt-1 h-10 line-clamp-2">{ruolo.descrizione || "Nessuna descrizione"}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <span className="font-semibold text-slate-700 block mb-1">Permessi inclusi:</span>
                          {Object.values(ruolo.permessi || {}).filter(v => v === true).length} permessi attivi su {Object.keys(ruolo.permessi || {}).length}
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingRuolo(ruolo);
                              setShowRuoloDialog(true);
                            }}
                            className="flex-1 hover:bg-indigo-50 hover:text-indigo-600 border-slate-200"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Modifica
                          </Button>
                          {!ruolo.is_system && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteRuolo(ruolo.id, ruolo.is_system)}
                              className="text-red-600 hover:bg-red-50 border-slate-200"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="utenti">
            <div className="mb-6">
              <h2 className="text-xl font-semibold">Utenti e Ruoli</h2>
              <p className="text-sm text-slate-600">Assegna un ruolo a ciascun utente per definire i suoi permessi</p>
            </div>

            {isLoading ? (
              <div className="text-center py-12">Caricamento...</div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Utente</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Ruolo Base</TableHead>
                      <TableHead>Ruolo Personalizzato</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {utenti.map(utente => {
                      const ruoloAssegnato = ruoli.find(r => r.id === utente.ruolo_id);
                      return (
                        <TableRow key={utente.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                                {utente.full_name?.charAt(0) || "U"}
                              </div>
                              {utente.full_name}
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-500">{utente.email}</TableCell>
                          <TableCell>
                            <Badge variant={utente.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                              {utente.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 max-w-xs">
                              <Select
                                value={utente.ruolo_id || "none"}
                                onValueChange={(val) => handleAssegnaRuolo(utente.id, val === "none" ? null : val)}
                                disabled={utente.role === 'admin'}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="Seleziona ruolo..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Nessun ruolo (default)</SelectItem>
                                  {ruoli.map(ruolo => (
                                    <SelectItem key={ruolo.id} value={ruolo.id}>
                                      {ruolo.nome}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {utente.role === 'admin' && (
                                <div title="Gli admin hanno accesso completo" className="cursor-help">
                                  <AlertCircle className="w-4 h-4 text-slate-400" />
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <RuoloDialog
          open={showRuoloDialog}
          onOpenChange={setShowRuoloDialog}
          ruolo={editingRuolo}
          onSave={() => {
            setShowRuoloDialog(false);
            setEditingRuolo(null);
            loadData();
          }}
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
  const [isSaving, setIsSaving] = useState(false);

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

  const entities = [
    { id: "cantieri", label: "Cantieri" },
    { id: "imprese", label: "Imprese" },
    { id: "persone", label: "Professionisti" },
    { id: "subappalti", label: "Subappalti" },
    { id: "costi", label: "Costi" },
    { id: "sal", label: "SAL" },
    { id: "attivita", label: "Attività" },
    { id: "documenti", label: "Documenti" },
    { id: "teams", label: "Team" },
    { id: "cronoprogramma", label: "Cronoprogramma", actions: ["view", "edit"] },
    { id: "dashboard", label: "Dashboard", actions: ["view"] },
    { id: "profilo_azienda", label: "Profilo Azienda", actions: ["view", "edit"] },
    { id: "utenti", label: "Utenti", actions: ["view", "manage"] },
  ];

  const actions = [
    { id: "view", label: "Visualizza" },
    { id: "create", label: "Crea" },
    { id: "edit", label: "Modifica" },
    { id: "delete", label: "Elimina" }
  ];

  const handlePermessoChange = (entityId, actionId, value) => {
    const key = `${entityId}_${actionId}`;
    setFormData(prev => ({
      ...prev,
      permessi: {
        ...prev.permessi,
        [key]: value
      }
    }));
  };

  const handleRowToggle = (entityId, value) => {
    const entity = entities.find(e => e.id === entityId);
    const entityActions = entity.actions || actions.map(a => a.id);
    
    setFormData(prev => {
      const newPermessi = { ...prev.permessi };
      entityActions.forEach(action => {
        newPermessi[`${entityId}_${action}`] = value;
      });
      return { ...prev, permessi: newPermessi };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const action = ruolo ? 'update_role' : 'create_role';
      const data = ruolo 
        ? { roleId: ruolo.id, roleData: formData } 
        : { roleData: formData };

      const res = await base44.functions.invoke('managePermissions', { action, data });
      
      if (res.data?.error) throw new Error(res.data.error);
      
      toast.success(ruolo ? "Ruolo aggiornato e sincronizzato" : "Ruolo creato");
      onSave();
    } catch (error) {
      console.error("Errore salvataggio:", error);
      toast.error("Errore: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>{ruolo ? "Modifica Ruolo" : "Nuovo Ruolo"}</DialogTitle>
          <DialogDescription>
            Configura i dettagli del ruolo e la matrice dei permessi.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 p-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-3">
                <Label htmlFor="nome">Nome Ruolo *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  required
                  placeholder="es. Project Manager"
                  className="bg-white"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="descrizione">Descrizione</Label>
                <Input
                  id="descrizione"
                  value={formData.descrizione}
                  onChange={(e) => setFormData(prev => ({ ...prev, descrizione: e.target.value }))}
                  placeholder="Breve descrizione..."
                  className="bg-white"
                />
              </div>
            </div>

            <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
              <div className="bg-slate-50 p-4 border-b">
                <h3 className="font-semibold text-slate-800">Matrice Permessi</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Entità</TableHead>
                    <TableHead className="text-center w-[100px]">Tutti</TableHead>
                    {actions.map(action => (
                      <TableHead key={action.id} className="text-center">{action.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entities.map(entity => {
                    const entityActions = entity.actions || actions.map(a => a.id);
                    const allChecked = entityActions.every(a => formData.permessi[`${entity.id}_${a}`]);
                    const someChecked = entityActions.some(a => formData.permessi[`${entity.id}_${a}`]);

                    return (
                      <TableRow key={entity.id} className="hover:bg-slate-50/50">
                        <TableCell className="font-medium text-slate-700">
                          {entity.label}
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox 
                            checked={allChecked}
                            onCheckedChange={(val) => handleRowToggle(entity.id, val)}
                            className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                          />
                        </TableCell>
                        {actions.map(action => {
                          const isAvailable = entityActions.includes(action.id);
                          const permissionKey = `${entity.id}_${action.id}`;
                          
                          if (!isAvailable) {
                            return <TableCell key={action.id} className="bg-slate-50/50" />;
                          }

                          return (
                            <TableCell key={action.id} className="text-center">
                              <div className="flex justify-center">
                                <Switch
                                  checked={formData.permessi[permissionKey] || false}
                                  onCheckedChange={(val) => handlePermessoChange(entity.id, action.id, val)}
                                  className="data-[state=checked]:bg-indigo-600"
                                />
                              </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>

          <div className="p-6 border-t bg-slate-50 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Annulla
            </Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={isSaving}>
              {isSaving ? (
                <>
                  <span className="animate-spin mr-2">⏳</span> Salvataggio...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {ruolo ? "Aggiorna Ruolo" : "Crea Ruolo"}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}