import React, { useState, useEffect } from "react";
import { supabaseDB, supabase } from "@/lib/supabaseClient";
import { usePermissions } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Shield, Users, Edit, Trash2, Save, Group, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RuoloDialog from "@/components/admin/RuoloDialog";

export default function UserManagementPage() {
  const [ruoli, setRuoli] = useState([]);
  const [utenti, setUtenti] = useState([]);
  const [teams, setTeams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showRuoloDialog, setShowRuoloDialog] = useState(false);
  const [editingRuolo, setEditingRuolo] = useState(null);
  
  const [showTeamDialog, setShowTeamDialog] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);

  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  const { isAdmin } = usePermissions();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [ruoliData, utentiData, teamsData] = await Promise.all([
        supabaseDB.rbac.getAllRuoli(),
        supabaseDB.rbac.getAllProfiles(),
        supabaseDB.rbac.getAllTeams(),
      ]);
      if (!Array.isArray(ruoliData)) {
        console.warn("getAllRuoli: risultato non array", ruoliData);
      } else {
        const invalidi = ruoliData.filter(r => !r || !r.id);
        if (invalidi.length) {
          console.warn("getAllRuoli: record senza id", invalidi);
        }
      }
      if (!Array.isArray(teamsData)) {
        console.warn("getAllTeams: risultato non array", teamsData);
      } else {
        const invalidi = teamsData.filter(t => !t || !t.id);
        if (invalidi.length) {
          console.warn("getAllTeams: record senza id", invalidi);
        }
      }
      setRuoli(ruoliData);
      const utentiConTeams = utentiData.map(u => ({
        ...u,
        team_ids: teamsData.filter(t => t.team_members?.some(m => m.profile_id === u.id)).map(t => t.id),
      }));
      setUtenti(utentiConTeams);
      setTeams(teamsData);
    } catch (error) {
      console.error("Errore caricamento dati:", error);
      toast.error("Errore nel caricamento dei dati");
    }
    setIsLoading(false);
  };

  // --- RUOLI ---
  // handleSaveRuolo is now handled inside RuoloDialog

  const handleDeleteRuolo = async (ruoloId, isSystem) => {
    if (isSystem) {
      toast.error("Non puoi eliminare un ruolo di sistema");
      return;
    }
    if (window.confirm("Sei sicuro di voler eliminare questo ruolo?")) {
      try {
        await supabaseDB.rbac.deleteRuolo(ruoloId);
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
        await supabaseDB.rbac.updateTeam(editingTeam.id, teamData);
        toast.success("Team aggiornato con successo");
      } else {
        await supabaseDB.rbac.createTeam(teamData);
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
        await supabaseDB.rbac.deleteTeam(teamId);
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
      if (data.ruolo_id !== undefined) {
        // Assegna il nuovo ruolo
        await supabaseDB.rbac.assignRuoloToProfile(userId, data.ruolo_id || null);
        
        // Se l'utente sta modificando il proprio ruolo, forza il refresh della sessione
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser?.id === userId) {
          // Refresh token per aggiornare i claim del ruolo
          const { data: { session } } = await supabase.auth.refreshSession();
          console.log('[UserManagement] Sessione refreshata dopo cambio ruolo');
        }
        
        toast.success("Ruolo assegnato con successo");
      } else if (data.team_ids !== undefined) {
        // diff old vs new team membership
        const utente = utenti.find(u => u.id === userId);
        const oldTeams = utente?.team_ids || [];
        const newTeams = data.team_ids;
        const toAdd = newTeams.filter(id => !oldTeams.includes(id));
        const toRemove = oldTeams.filter(id => !newTeams.includes(id));
        await Promise.all([
          ...toAdd.map(teamId => supabaseDB.rbac.addMemberToTeam(teamId, userId)),
          ...toRemove.map(teamId => supabaseDB.rbac.removeMemberFromTeam(teamId, userId)),
        ]);
        toast.success("Team aggiornati");
      } else {
        await supabaseDB.rbac.updateProfile(userId, data);
        toast.success("Utente aggiornato con successo");
      }
      loadData();
    } catch (error) {
      console.error("Errore aggiornamento utente:", error);
      toast.error("Errore nell'aggiornamento dell'utente: " + error.message);
    }
  };

  const handleInviteUser = async (e) => {
    e.preventDefault();
    setIsInviting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Sessione non valida, rieffettua il login');

      const response = await fetch('/api/invite-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          email: inviteEmail,
          role_id: inviteRoleId || undefined // Invia il ruolo se selezionato
        }),
      });

      let result = {};
      try { result = await response.json(); } catch (_error) { result = {}; }
      if (!response.ok) throw new Error(result.error || `Errore HTTP ${response.status}`);

      const roleName = inviteRoleId ? (ruoli.find(r => r.id === inviteRoleId)?.nome || '') : 'member (default)';
      toast.success(`Invito inviato a ${inviteEmail}${inviteRoleId ? ` con ruolo: ${roleName}` : ''}`);
      setInviteEmail("");
      setInviteRoleId("");
      setShowInviteDialog(false);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsInviting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <Shield className="w-16 h-16 mx-auto mb-4 text-slate-400" />
        <h2 className="text-xl font-semibold mb-2">Accesso Negato</h2>
        <p className="text-slate-600">Non hai i permessi per accedere a questa pagina.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Gestione Utenti e Team</h1>
              <p className="text-slate-600 mt-1">Gestisci utenti, ruoli, permessi e gruppi di lavoro</p>
            </div>
            <Button onClick={() => setShowInviteDialog(true)}>
              <Mail className="w-4 h-4 mr-2" />
              Invita Utente
            </Button>
          </div>

          <Tabs defaultValue="utenti" className="space-y-6">
          <TabsList className="bg-white border p-1 rounded-lg h-auto">
            <TabsTrigger value="utenti" className="gap-2 px-4 py-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">
              <Users className="w-4 h-4" />
              Utenti
            </TabsTrigger>
            <TabsTrigger value="teams" className="gap-2 px-4 py-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">
              <Group className="w-4 h-4" />
              Team
            </TabsTrigger>
            <TabsTrigger value="ruoli" className="gap-2 px-4 py-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">
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
                  const normalizeId = (id) => String(id ?? "").trim();
                  const ruoliInvalidi = ruoli.filter(r => !r || !normalizeId(r.id));
                  const teamsInvalidi = teams.filter(t => !t || !normalizeId(t.id));
                  if (ruoliInvalidi.length) {
                    console.warn("Ruoli con id mancante:", ruoliInvalidi);
                  }
                  if (teamsInvalidi.length) {
                    console.warn("Team con id mancante:", teamsInvalidi);
                  }
                  const ruoliValidi = ruoli.filter(r => r && normalizeId(r.id));
                  const teamsValidi = teams.filter(t => t && normalizeId(t.id));
                  const ruoloAssegnato = ruoliValidi.find(r => r.id === utente.ruolo_id);
                  const userTeams = teamsValidi.filter(t => (utente.team_ids || []).includes(t.id));
                  
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
                                <h3 className="font-semibold text-slate-900">{utente.full_name || utente.email || "Utente senza nome"}</h3>
                                <p className="text-sm text-slate-500">{utente.email}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-6">
                            {/* Role Selection */}
                            <div className="min-w-[200px]">
                              <p className="text-xs font-medium text-slate-500 mb-1.5">Ruolo</p>
                              <Select
                                value={utente.ruolo_id ? String(utente.ruolo_id) : "none"}
                                onValueChange={(val) => handleUpdateUser(utente.id, { ruolo_id: val === "none" ? null : val })}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="Seleziona ruolo..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Nessun ruolo personalizzato</SelectItem>
                                  {ruoliValidi.map(ruolo => {
                                    const ruoloId = normalizeId(ruolo.id);
                                    if (!ruoloId) return null;
                                    return (
                                    <SelectItem key={ruoloId} value={ruoloId}>
                                      {ruolo.nome}
                                    </SelectItem>
                                  )})}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {/* Responsabile Azienda Toggle */}
                            <div className="flex items-center space-x-2">
                                <Switch 
                                    id={`force-view-${utente.id}`}
                                    checked={utente.force_all_cantieri_view || false}
                                    onCheckedChange={(val) => handleUpdateUser(utente.id, { force_all_cantieri_view: val })}
                                />
                                <Label htmlFor={`force-view-${utente.id}`} className="text-xs">Vede Tutti i Cantieri</Label>
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
                                value="placeholder"
                                onValueChange={(val) => {
                                  if (val && val !== "placeholder") {
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
                                  <SelectItem value="placeholder" disabled>+ Aggiungi a team</SelectItem>
                                  {teamsValidi.filter(t => !(utente.team_ids || []).includes(t.id)).map(t => {
                                    const teamId = normalizeId(t.id);
                                    if (!teamId) return null;
                                    return (
                                      <SelectItem key={teamId} value={teamId}>{t.nome}</SelectItem>
                                    );
                                  })}
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
              }} className="">
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
                              title={m.full_name || m.email}
                            >
                              {(m.full_name || m.email || "?").charAt(0).toUpperCase()}
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
              }} className="">
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
          onSave={() => {
            setShowRuoloDialog(false);
            setEditingRuolo(null);
            loadData();
          }}
        />

        {/* DIALOG TEAM */}
        <TeamDialog
          open={showTeamDialog}
          onOpenChange={setShowTeamDialog}
          team={editingTeam}
          onSave={handleSaveTeam}
        />

        {/* DIALOG INVITO */}
        <Dialog open={showInviteDialog} onOpenChange={(open) => { setShowInviteDialog(open); if (!open) { setInviteEmail(""); setInviteRoleId(""); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Invita un nuovo utente</DialogTitle>
              <DialogDescription>
                L'utente riceverà un'email con il link per accedere all'applicazione.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleInviteUser} className="space-y-4 pt-2">
              <div>
                <Label htmlFor="invite-email">Indirizzo email *</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="nome@esempio.it"
                  required
                  autoFocus
                  className="mt-1.5"
                />
              </div>
              
              <div>
                <Label htmlFor="invite-role">Ruolo *</Label>
                <Select value={inviteRoleId} onValueChange={setInviteRoleId} required>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Seleziona un ruolo" />
                  </SelectTrigger>
                  <SelectContent>
                    {ruoli.map((ruolo) => (
                      <SelectItem key={ruolo.id} value={ruolo.id}>
                        {ruolo.nome} {ruolo.is_system && <Badge variant="outline" className="ml-2 text-xs">Sistema</Badge>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowInviteDialog(false)} disabled={isInviting}>
                  Annulla
                </Button>
                <Button type="submit" disabled={isInviting || !inviteEmail || !inviteRoleId}>
                  {isInviting ? (
                    <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Invio...</>
                  ) : (
                    <><Mail className="w-4 h-4 mr-2" />Invia Invito</>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
    </div>
  );
}



const TeamDialog = React.memo(({ open, onOpenChange, team, onSave }) => {
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
            <Button type="submit" className="">
              <Save className="w-4 h-4 mr-2" />
              {team ? "Aggiorna" : "Crea"} Team
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
});
