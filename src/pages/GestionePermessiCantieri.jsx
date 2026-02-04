import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Save, Search, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { usePermissions } from "@/components/shared/PermissionGuard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function GestionePermessiCantieriPage() {
  const { hasPermission, isLoading: isAuthLoading } = usePermissions();
  const [cantieri, setCantieri] = useState([]);
  const [utenti, setUtenti] = useState([]);
  const [permessiOverrides, setPermessiOverrides] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCantiere, setSelectedCantiere] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [cantieriData, utentiData, overridesData] = await Promise.all([
        base44.entities.Cantiere.list('-created_date', 100),
        base44.entities.User.list(),
        base44.entities.PermessoCantiereUtente.list()
      ]);
      setCantieri(cantieriData);
      setUtenti(utentiData);
      setPermessiOverrides(overridesData);
    } catch (error) {
      console.error("Errore caricamento dati:", error);
      toast.error("Errore nel caricamento dei dati");
    }
    setIsLoading(false);
  };

  const handleEditOverride = (user, cantiere) => {
    setSelectedUser(user);
    setSelectedCantiere(cantiere);
    setShowDialog(true);
  };

  if (isAuthLoading) return null;

  if (!hasPermission('user_management', 'manage_cantiere_permissions')) {
     return (
       <div className="p-8 text-center">
         <Shield className="w-16 h-16 mx-auto mb-4 text-slate-400" />
         <h2 className="text-xl font-semibold mb-2">Accesso Negato</h2>
         <p className="text-slate-600">Non hai i permessi per gestire i permessi dei cantieri.</p>
       </div>
     );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Permessi Specifici Cantieri</h1>
          <p className="text-slate-600 mt-1">Definisci eccezioni ai ruoli per specifici cantieri e utenti</p>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader>
             <CardTitle>Matrice Utenti / Cantieri</CardTitle>
          </CardHeader>
          <CardContent>
             <p className="text-sm text-slate-500 mb-4">
                 Seleziona una cella per modificare i permessi specifici di un utente su un cantiere.
                 <br/>
                 <span className="inline-block w-3 h-3 bg-indigo-100 border border-indigo-300 rounded-full mr-1 align-middle"></span> 
                 Indica che è presente un override specifico.
             </p>
             <div className="overflow-x-auto">
                 <Table>
                     <TableHeader>
                         <TableRow>
                             <TableHead className="w-[200px]">Utente</TableHead>
                             {cantieri.map(c => (
                                 <TableHead key={c.id} className="min-w-[150px] text-center">
                                     <div className="font-semibold truncate max-w-[140px]" title={c.denominazione}>
                                         {c.denominazione}
                                     </div>
                                     <div className="text-xs font-normal text-slate-400">{c.codice_cig || 'NO CIG'}</div>
                                 </TableHead>
                             ))}
                         </TableRow>
                     </TableHeader>
                     <TableBody>
                         {utenti.map(u => (
                             <TableRow key={u.id}>
                                 <TableCell className="font-medium">
                                     <div className="flex items-center gap-2">
                                         <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs">
                                             {u.full_name?.charAt(0)}
                                         </div>
                                         <div className="truncate max-w-[180px]" title={u.full_name}>
                                             {u.full_name}
                                         </div>
                                     </div>
                                 </TableCell>
                                 {cantieri.map(c => {
                                     const override = permessiOverrides.find(p => p.utente_id === u.id && p.cantiere_id === c.id);
                                     const isAssigned = (u.cantieri_assegnati || []).includes(c.id);
                                     
                                     return (
                                         <TableCell key={c.id} className="text-center p-1">
                                             <Button 
                                                 variant="ghost" 
                                                 className={`h-8 w-full ${override ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : (isAssigned ? 'bg-slate-50' : 'opacity-50')}`}
                                                 onClick={() => handleEditOverride(u, c)}
                                             >
                                                 {override ? "Custom" : (isAssigned ? "Assegnato" : "-")}
                                             </Button>
                                         </TableCell>
                                     );
                                 })}
                             </TableRow>
                         ))}
                     </TableBody>
                 </Table>
             </div>
          </CardContent>
        </Card>

        {showDialog && (
            <OverrideDialog 
                open={showDialog}
                onOpenChange={setShowDialog}
                user={selectedUser}
                cantiere={selectedCantiere}
                existingOverride={permessiOverrides.find(p => p.utente_id === selectedUser?.id && p.cantiere_id === selectedCantiere?.id)}
                onSave={loadData}
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
        if (existingOverride && existingOverride.permessi) {
            setPermessi(existingOverride.permessi);
        } else {
            setPermessi({});
        }
    }, [existingOverride]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (Object.keys(permessi).length === 0) {
                // If empty, verify if we should delete existing override
                if (existingOverride) {
                    await base44.entities.PermessoCantiereUtente.delete(existingOverride.id);
                    toast.success("Override rimosso");
                }
            } else {
                if (existingOverride) {
                    await base44.entities.PermessoCantiereUtente.update(existingOverride.id, { permessi });
                } else {
                    await base44.entities.PermessoCantiereUtente.create({
                        utente_id: user.id,
                        cantiere_id: cantiere.id,
                        permessi
                    });
                }
                toast.success("Permessi salvati");
            }
            onSave();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast.error("Errore salvataggio");
        } finally {
            setIsSaving(false);
        }
    };

    const modules = [
        { id: "cantieri", label: "Cantiere", actions: ["view", "edit", "admin.delete", "admin.archive"] },
        { id: "sal", label: "SAL", actions: ["view", "edit", "admin.delete", "admin.approve"] },
        { id: "costi", label: "Costi", actions: ["view", "edit", "admin.delete"] },
        { id: "ordini_materiale", label: "Ordini", actions: ["view", "edit", "admin.delete", "admin.accept"] },
        { id: "documenti", label: "Documenti", actions: ["view", "edit", "admin.delete", "admin.archive"] },
        { id: "cronoprogramma", label: "Cronoprogramma", actions: ["view", "edit"] },
    ];

    const updateNestedPermission = (permObj, moduleId, path, value) => {
        const newPerm = JSON.parse(JSON.stringify(permObj));
        if (!newPerm[moduleId]) newPerm[moduleId] = {};
        
        const parts = path.split('.');
        let current = newPerm[moduleId];
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!current[part]) current[part] = {};
            current = current[part];
        }
        current[parts[parts.length - 1]] = value;
        return newPerm;
    };
    
    const getPermissionValue = (permObj, moduleId, path) => {
        if (!permObj || !permObj[moduleId]) return false;
        const parts = path.split('.');
        let current = permObj[moduleId];
        for (let i = 0; i < parts.length; i++) {
            if (current === undefined) return false;
            current = current[parts[i]];
        }
        return !!current;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Permessi specifici: {cantiere?.denominazione}</DialogTitle>
                    <DialogDescription>
                        Utente: <span className="font-semibold text-slate-900">{user?.full_name}</span>
                        <br/>
                        Questi permessi sovrascrivono quelli del ruolo base per questo specifico cantiere.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {modules.map(module => (
                            <div key={module.id} className="border rounded-lg p-4 bg-slate-50">
                                <h4 className="font-semibold text-sm mb-3">{module.label}</h4>
                                <div className="flex flex-wrap gap-4">
                                    {module.actions.map(actionPath => (
                                        <div key={actionPath} className="flex items-center gap-2">
                                            <Switch 
                                                checked={getPermissionValue(permessi, module.id, actionPath)}
                                                onCheckedChange={(val) => setPermessi(prev => updateNestedPermission(prev, module.id, actionPath, val))}
                                            />
                                            <Label className="text-xs">
                                                {actionPath.split('.').pop()}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>

                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
                    <Button onClick={handleSave} disabled={isSaving}>Salva</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}