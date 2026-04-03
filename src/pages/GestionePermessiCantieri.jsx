import React, { useState, useEffect } from "react";
import { supabaseDB } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Save } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { usePermissions } from "@/components/shared/PermissionGuard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const MODULES = [
  { id: "cantieri",       label: "Cantiere",      actions: ["view", "edit", "admin.delete", "admin.archive"] },
  { id: "sal",            label: "SAL",            actions: ["view", "edit", "admin.delete", "admin.approve"] },
  { id: "costi",          label: "Costi",          actions: ["view", "edit", "admin.delete"] },
  { id: "ordini_materiale", label: "Ordini",       actions: ["view", "edit", "admin.delete", "admin.accept"] },
  { id: "documenti",      label: "Documenti",      actions: ["view", "edit", "admin.delete", "admin.archive"] },
  { id: "cronoprogramma", label: "Cronoprogramma", actions: ["view", "edit"] },
];

function getPermValue(permObj, moduleId, path) {
  if (!permObj?.[moduleId]) return false;
  return path.split('.').reduce((cur, k) => cur?.[k], permObj[moduleId]) ?? false;
}

function setPermValue(permObj, moduleId, path, value) {
  const next = JSON.parse(JSON.stringify(permObj));
  if (!next[moduleId]) next[moduleId] = {};
  const parts = path.split('.');
  let cur = next[moduleId];
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]]) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
  // Rimuovi il modulo se tutti i valori sono false
  const allFalse = obj => Object.values(obj).every(v => typeof v === 'object' ? allFalse(v) : !v);
  if (allFalse(next[moduleId])) delete next[moduleId];
  return next;
}

export default function GestionePermessiCantieriPage() {
  const { hasPermission, isLoading: isAuthLoading, user: currentUser } = usePermissions();
  const [cantieri, setCantieri] = useState([]);
  const [utenti, setUtenti] = useState([]);
  const [overrides, setOverrides] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCantiere, setSelectedCantiere] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [filtroUtente, setFiltroUtente] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [cantieriData, utentiData, overridesData] = await Promise.all([
        supabaseDB.cantieri.getAll(),
        supabaseDB.rbac.getAllProfiles(),
        supabaseDB.permessiCantiere.getAll(),
      ]);
      setCantieri(cantieriData);
      setUtenti(utentiData);
      setOverrides(overridesData);
    } catch (err) {
      console.error(err);
      toast.error("Errore nel caricamento dei dati");
    }
    setIsLoading(false);
  };

  const handleEdit = (user, cantiere) => {
    setSelectedUser(user);
    setSelectedCantiere(cantiere);
    setShowDialog(true);
  };

  if (isAuthLoading) return null;

  if (!hasPermission('user_management', 'manage_cantiere_permissions') && currentUser?.role !== 'admin') {
    return (
      <div className="p-8 text-center">
        <Shield className="w-16 h-16 mx-auto mb-4 text-slate-400" />
        <h2 className="text-xl font-semibold mb-2">Accesso Negato</h2>
        <p className="text-slate-600">Non hai i permessi per gestire i permessi dei cantieri.</p>
      </div>
    );
  }

  const utentiFiltrati = filtroUtente
    ? utenti.filter(u => (u.full_name || u.email || '').toLowerCase().includes(filtroUtente.toLowerCase()))
    : utenti;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Permessi Specifici Cantieri</h1>
          <p className="text-slate-600 mt-1">Definisci eccezioni ai ruoli per specifici cantieri e utenti</p>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Matrice Utenti / Cantieri</CardTitle>
              <input
                type="text"
                placeholder="Filtra utente..."
                value={filtroUtente}
                onChange={e => setFiltroUtente(e.target.value)}
                className="border rounded-md px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Clicca su una cella per impostare permessi specifici per quell'utente su quel cantiere.
              <span className="ml-2 inline-flex items-center gap-1">
                <span className="w-3 h-3 bg-indigo-100 border border-indigo-300 rounded-full inline-block" />
                Override attivo
              </span>
            </p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-slate-500 py-8 text-center">Caricamento...</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px] sticky left-0 bg-white z-10">Utente</TableHead>
                      {cantieri.map(c => (
                        <TableHead key={c.id} className="min-w-[140px] text-center">
                          <div className="font-semibold truncate max-w-[130px]" title={c.denominazione}>
                            {c.denominazione}
                          </div>
                          <div className="text-xs font-normal text-slate-400">{c.stato || ''}</div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {utentiFiltrati.map(u => (
                      <TableRow key={u.id}>
                        <TableCell className="sticky left-0 bg-white z-10 font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate max-w-[140px] text-sm" title={u.full_name || u.email}>
                                {u.full_name || u.email || 'Utente senza nome'}
                              </p>
                              {u.ruolo?.nome && (
                                <p className="text-xs text-slate-400">{u.ruolo.nome}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        {cantieri.map(c => {
                          const override = overrides.find(o => o.utente_id === u.id && o.cantiere_id === c.id);
                          const isAssigned = (u.cantieri_assegnati || []).includes(c.id);
                          return (
                            <TableCell key={c.id} className="text-center p-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-8 w-full text-xs ${
                                  override
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                                    : isAssigned
                                    ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                    : 'text-slate-400 hover:bg-slate-50'
                                }`}
                                onClick={() => handleEdit(u, c)}
                              >
                                {override ? 'Custom' : isAssigned ? 'Assegnato' : '—'}
                              </Button>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {showDialog && (
          <OverrideDialog
            open={showDialog}
            onOpenChange={setShowDialog}
            user={selectedUser}
            cantiere={selectedCantiere}
            existingOverride={overrides.find(o => o.utente_id === selectedUser?.id && o.cantiere_id === selectedCantiere?.id)}
            onSave={() => { setShowDialog(false); loadData(); }}
          />
        )}
      </div>
    </div>
  );
}

function OverrideDialog({ open, onOpenChange, user, cantiere, existingOverride, onSave }) {
  const [permessi, setPermessi] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setPermessi(existingOverride?.permessi || {});
  }, [existingOverride]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (Object.keys(permessi).length === 0) {
        if (existingOverride) {
          await supabaseDB.permessiCantiere.delete(user.id, cantiere.id);
          toast.success("Override rimosso");
        }
      } else {
        await supabaseDB.permessiCantiere.upsert(user.id, cantiere.id, permessi);
        toast.success("Permessi salvati");
      }
      onSave();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Errore salvataggio");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveAll = async () => {
    if (!existingOverride) return;
    setIsSaving(true);
    try {
      await supabaseDB.permessiCantiere.delete(user.id, cantiere.id);
      toast.success("Override rimosso");
      onSave();
    } catch (err) {
      toast.error(err.message || "Errore rimozione");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Permessi specifici — {cantiere?.denominazione}</DialogTitle>
          <DialogDescription>
            Utente: <span className="font-semibold text-slate-900">{user?.full_name || user?.email}</span>
            {user?.ruolo?.nome && <span className="ml-2 text-slate-500">({user.ruolo.nome})</span>}
            <br />
            Questi permessi sovrascrivono quelli del ruolo base solo per questo cantiere.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[55vh] pr-4">
          <div className="space-y-3">
            {MODULES.map(mod => (
              <div key={mod.id} className="border rounded-lg p-4 bg-slate-50">
                <h4 className="font-semibold text-sm mb-3 text-slate-800">{mod.label}</h4>
                <div className="flex flex-wrap gap-x-6 gap-y-3">
                  {mod.actions.map(path => (
                    <div key={path} className="flex items-center gap-2">
                      <Switch
                        checked={!!getPermValue(permessi, mod.id, path)}
                        onCheckedChange={val => setPermessi(prev => setPermValue(prev, mod.id, path, val))}
                      />
                      <Label className="text-xs capitalize cursor-pointer">
                        {path.split('.').pop()}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          {existingOverride ? (
            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={handleRemoveAll} disabled={isSaving}>
              Rimuovi override
            </Button>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Salvataggio...' : 'Salva'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
