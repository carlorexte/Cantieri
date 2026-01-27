import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Shield, Users, Edit, Trash2, Save, Group } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function UserManagementPage() {
  const [ruoli, setRuoli] = useState([]);
  const [utenti, setUtenti] = useState([]);
  const [teams, setTeams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showRuoloDialog, setShowRuoloDialog] = useState(false);
  const [editingRuolo, setEditingRuolo] = useState(null);
  
  const [showTeamDialog, setShowTeamDialog] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [ruoliData, utentiData, teamsData, user] = await Promise.all([
        base44.entities.Ruolo.list(),
        base44.entities.User.list(),
        base44.entities.Team.list(),
        base44.auth.me()
      ]);
      setRuoli(ruoliData);
      setUtenti(utentiData);
      setTeams(teamsData);
      setCurrentUser(user);
    } catch (error) {
      console.error("Errore caricamento dati:", error);
      toast.error("Errore nel caricamento dei dati");
    }
    setIsLoading(false);
  };

  // --- RUOLI ---
  const handleSaveRuolo = async (ruoloData) => {
    try {
      if (editingRuolo) {
        await base44.functions.invoke('managePermissions', {
          action: 'update_role',
          data: { roleId: editingRuolo.id, roleData: ruoloData }
        });
        toast.success("Ruolo aggiornato con successo");
      } else {
        await base44.functions.invoke('managePermissions', {
          action: 'create_role',
          data: { roleData: ruoloData }
        });
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
        await base44.functions.invoke('managePermissions', {
          action: 'delete_role',
          data: { roleId: ruoloId }
        });
        toast.success("Ruolo eliminato");
        loadData();
      } catch (error) {
        console.error("Errore eliminazione ruolo:", error);
        toast.error("Errore nell'eliminazione del ruolo");
      }
    }
  };

  // --- TEAM ---
  const handleSaveTeam = async (teamData) => {
    try {
      if (editingTeam) {
        await base44.entities.Team.update(editingTeam.id, teamData);
        toast.success("Team aggiornato con successo");
      } else {
        await base44.entities.Team.create(teamData);
        toast.success("Team creato con successo");
      }
      setShowTeamDialog(false);
      setEditingTeam(null);
      loadData();
    } catch (error) {
      console.error("Errore salvataggio team:", error);
      toast.error("Errore nel salvataggio del team");
    }
  };

  const handleDeleteTeam = async (teamId) => {
    if (window.confirm("Sei sicuro di voler eliminare questo team?")) {
      try {
        await base44.entities.Team.delete(teamId);
        toast.success("Team eliminato");
        loadData();
      } catch (error) {
        console.error("Errore eliminazione team:", error);
        toast.error("Errore nell'eliminazione del team");
      }
    }
  };

  // --- UTENTI ---
  const handleUpdateUser = async (userId, data) => {
    try {
      // If updating role or simple fields, use direct update or managePermissions
      if (data.ruolo_id !== undefined) {
        const res = await base44.functions.invoke('managePermissions', {
          action: 'assign_role',
          data: { userId, roleId: data.ruolo_id }
        });
        if (res.data?.error) throw new Error(res.data.error);
        toast.success("Ruolo assegnato con successo");
      } else {
        await base44.entities.User.update(userId, data);
        toast.success("Utente aggiornato con successo");
      }
      loadData();
    } catch (error) {
      console.error("Errore aggiornamento utente:", error);
      toast.error("Errore nell'aggiornamento dell'utente: " + error.message);
    }
  };

  if (!currentUser || (currentUser.role !== 'admin' && !currentUser.perm_manage_users)) {
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
          <h1 className="text-3xl font-bold text-slate-900">Gestione Utenti e Team</h1>
          <p className="text-slate-600 mt-1">Gestisci utenti, ruoli, permessi e gruppi di lavoro</p>
        </div>

        <Tabs defaultValue="utenti" className="space-y-6">
          <TabsList className="bg-white border p-1 rounded-lg">
            <TabsTrigger value="utenti" className="gap-2">
              <Users className="w-4 h-4" />
              Utenti
            </TabsTrigger>
            <TabsTrigger value="teams" className="gap-2">
              <Group className="w-4 h-4" />
              Team
            </TabsTrigger>
            <TabsTrigger value="ruoli" className="gap-2">
              <Shield className="w-4 h-4" />
              Ruoli
            </TabsTrigger>
          </TabsList>

          {/* TAB UTENTI */}
          <TabsContent value="utenti">
            <div className="mb-6">
              <h2 className="text-xl font-semibold">Elenco Utenti</h2>
              <p className="text-sm text-slate-600 mt-1">Configura ruoli e assegna utenti ai team</p>
            </div>

            {isLoading ? (
              <div className="text-center py-12">Caricamento...</div>
            ) : (
              <div className="space-y-4">
                {utenti.map(utente => {
                  const ruoloAssegnato = ruoli.find(r => r.id === utente.ruolo_id);
                  const userTeams = teams.filter(t => (utente.team_ids || []).includes(t.id));
                  
                  return (
                    <Card key={utente.id} className="border-0 shadow-sm overflow-visible">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                          
                          <div className="flex flex-wrap items-center gap-6">
                            {/* Role Selection */}
                            <div className="min-w-[200px]">
                              <p className="text-xs font-medium text-slate-500 mb-1.5">Ruolo</p>
                              <Select
                                value={utente.ruolo_id || ""}
                                onValueChange={(val) => handleUpdateUser(utente.id, { ruolo_id: val || null })}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="Seleziona ruolo..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={null}>Nessun ruolo personalizzato</SelectItem>
                                  {ruoli.map(ruolo => (
                                    <SelectItem key={ruolo.id} value={ruolo.id}>
                                      {ruolo.nome}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Team Selection (Multi-select simulation via Popover or simple list for now) */}
                            <div className="min-w-[200px]">
                              <p className="text-xs font-medium text-slate-500 mb-1.5">Team ({userTeams.length})</p>
                              <div className="flex flex-wrap gap-1 mb-2">
                                {userTeams.map(t => (
                                  <Badge key={t.id} variant="secondary" style={{ backgroundColor: t.colore + '20', color: t.colore, borderColor: t.colore }}>
                                    {t.nome}
                                    <button 
                                      className="ml-1 hover:text-red-600"
                                      onClick={() => {
                                        const newTeams = (utente.team_ids || []).filter(id => id !== t.id);
                                        handleUpdateUser(utente.id, { team_ids: newTeams });
                                      }}
                                    >
                                      &times;
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                              <Select
                                value=""
                                onValueChange={(val) => {
                                  if (val) {
                                    const currentTeams = utente.team_ids || [];
                                    if (!currentTeams.includes(val)) {
                                      handleUpdateUser(utente.id, { team_ids: [...currentTeams, val] });
                                    }
                                  }
                                }}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="+ Aggiungi a team" />
                                </SelectTrigger>
                                <SelectContent>
                                  {teams.filter(t => !(utente.team_ids || []).includes(t.id)).map(t => (
                                    <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* TAB TEAM */}
          <TabsContent value="teams">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold">Gestione Team</h2>
                <p className="text-sm text-slate-600 mt-1">Crea gruppi di lavoro per assegnare attività e cantieri</p>
              </div>
              <Button onClick={() => {
                setEditingTeam(null);
                setShowTeamDialog(true);
              }} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Nuovo Team
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map(team => {
                const members = utenti.filter(u => (u.team_ids || []).includes(team.id));
                return (
                  <Card key={team.id} className="border-0 shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-3 h-10 rounded-full" 
                            style={{ backgroundColor: team.colore || '#3b82f6' }}
                          ></div>
                          <div>
                            <CardTitle className="text-lg">{team.nome}</CardTitle>
                            <p className="text-sm text-slate-500 mt-1 line-clamp-1">{team.descrizione || "Nessuna descrizione"}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => {
                            setEditingTeam(team);
                            setShowTeamDialog(true);
                          }}>
                            <Edit className="w-4 h-4 text-slate-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteTeam(team.id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="mt-2">
                        <p className="text-xs font-medium text-slate-500 mb-2">{members.length} Membri</p>
                        <div className="flex -space-x-2 overflow-hidden">
                          {members.slice(0, 5).map(m => (
                            <div 
                              key={m.id} 
                              className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600"
                              title={m.full_name}
                            >
                              {m.full_name.charAt(0)}
                            </div>
                          ))}
                          {members.length > 5 && (
                            <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-slate-100 flex items-center justify-center text-xs text-slate-500">
                              +{members.length - 5}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* TAB RUOLI */}
          <TabsContent value="ruoli">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold">Ruoli e Permessi</h2>
                <p className="text-sm text-slate-600 mt-1">Definisci i livelli di accesso per ogni ruolo</p>
              </div>
              <Button onClick={() => {
                setEditingRuolo(null);
                setShowRuoloDialog(true);
              }} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Nuovo Ruolo
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ruoli.map(ruolo => (
                <Card key={ruolo.id} className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Shield className="w-4 h-4 text-slate-400" />
                          {ruolo.nome}
                          {ruolo.is_system && (
                            <Badge variant="secondary" className="text-xs">Sistema</Badge>
                          )}
                        </CardTitle>
                        <p className="text-sm text-slate-500 mt-1 line-clamp-2">{ruolo.descrizione}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-1 mb-4">
                        {Object.entries(ruolo.permessi || {})
                          .filter(([_, value]) => value === true)
                          .slice(0, 6)
                          .map(([key]) => (
                            <Badge key={key} variant="outline" className="text-[10px] px-1.5 py-0">
                              {key.replace(/_/g, ' ')}
                            </Badge>
                          ))}
                        {Object.values(ruolo.permessi || {}).filter(v => v === true).length > 6 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-slate-50">
                            +{Object.values(ruolo.permessi || {}).filter(v => v === true).length - 6} altri
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingRuolo(ruolo);
                            setShowRuoloDialog(true);
                          }}
                          className="flex-1"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Modifica
                        </Button>
                        {!ruolo.is_system && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteRuolo(ruolo.id, ruolo.is_system)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* DIALOG RUOLO */}
        <RuoloDialog
          open={showRuoloDialog}
          onOpenChange={setShowRuoloDialog}
          ruolo={editingRuolo}
          onSave={handleSaveRuolo}
        />

        {/* DIALOG TEAM */}
        <TeamDialog
          open={showTeamDialog}
          onOpenChange={setShowTeamDialog}
          team={editingTeam}
          onSave={handleSaveTeam}
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
    "Sistema": ["dashboard_view", "profilo_azienda_view", "profilo_azienda_edit", "utenti_view", "utenti_manage", "perm_view_teams", "perm_manage_teams"]
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
                <CardHeader className="pb-3 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold text-slate-700">{categoria}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {permessi.map(permesso => (
                      <div key={permesso} className="flex items-center space-x-2">
                        <Switch
                          id={permesso}
                          checked={formData.permessi?.[permesso] || false}
                          onCheckedChange={(checked) => handlePermessoChange(permesso, checked)}
                        />
                        <Label htmlFor={permesso} className="text-xs cursor-pointer select-none">
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

function TeamDialog({ open, onOpenChange, team, onSave }) {
  const [formData, setFormData] = useState({
    nome: "",
    descrizione: "",
    colore: "#3b82f6"
  });

  useEffect(() => {
    if (team) {
      setFormData(team);
    } else {
      setFormData({
        nome: "",
        descrizione: "",
        colore: "#3b82f6"
      });
    }
  }, [team]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{team ? "Modifica Team" : "Nuovo Team"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="team-nome">Nome Team *</Label>
            <Input
              id="team-nome"
              value={formData.nome}
              onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
              required
              placeholder="es. Squadra Elettricisti"
            />
          </div>
          <div>
            <Label htmlFor="team-descrizione">Descrizione</Label>
            <Textarea
              id="team-descrizione"
              value={formData.descrizione}
              onChange={(e) => setFormData(prev => ({ ...prev, descrizione: e.target.value }))}
              placeholder="Descrizione del team"
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="team-colore">Colore Identificativo</Label>
            <div className="flex gap-2 items-center">
              <Input
                id="team-colore"
                type="color"
                value={formData.colore}
                onChange={(e) => setFormData(prev => ({ ...prev, colore: e.target.value }))}
                className="w-16 h-10 p-1 cursor-pointer"
              />
              <span className="text-sm text-slate-500">Scegli un colore per il team</span>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
              <Save className="w-4 h-4 mr-2" />
              {team ? "Aggiorna" : "Crea"} Team
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}