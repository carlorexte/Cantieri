import React, { useState, useEffect } from "react";
import { supabaseDB } from "@/lib/supabaseClient";
import { usePermissions } from "@/components/shared/PermissionGuard";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RuoloDialog from "@/components/admin/RuoloDialog";

export default function GestionePermessiPage() {
  const [ruoli, setRuoli] = useState([]);
  const [utenti, setUtenti] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRuoloDialog, setShowRuoloDialog] = useState(false);
  const [editingRuolo, setEditingRuolo] = useState(null);
  const { isAdmin, user: currentUser } = usePermissions();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [ruoliData, utentiData] = await Promise.all([
        supabaseDB.rbac.getAllRuoli(),
        supabaseDB.rbac.getAllProfiles(),
      ]);
      setRuoli(ruoliData);
      setUtenti(utentiData);
    } catch (error) {
      console.error("Errore caricamento dati:", error);
      toast.error("Errore nel caricamento dei dati");
    }
    setIsLoading(false);
  };

  const handleDeleteRuolo = async (ruoloId, isSystem) => {
    if (isSystem) { toast.error("Non puoi eliminare un ruolo di sistema"); return; }
    if (window.confirm("Sei sicuro di voler eliminare questo ruolo?")) {
      try {
        await supabaseDB.rbac.deleteRuolo(ruoloId);
        toast.success("Ruolo eliminato con successo");
        loadData();
      } catch (error) {
        toast.error("Errore: " + error.message);
      }
    }
  };

  const handleAssegnaRuolo = async (profileId, ruoloId) => {
    try {
      await supabaseDB.rbac.assignRuoloToProfile(profileId, ruoloId === 'none' ? null : ruoloId);
      toast.success("Ruolo assegnato con successo");
      loadData();
    } catch (error) {
      toast.error("Errore nell'assegnazione del ruolo");
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
