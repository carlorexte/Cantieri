import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save } from "lucide-react";
import { toast } from "sonner";

// Defined modules with actions structure
const modules = [
  { 
      id: "cantieri", 
      label: "Cantieri", 
      actions: [
          { id: "view", label: "Visualizza" },
          { id: "edit", label: "Modifica" },
          { id: "delete", label: "Elimina", path: "admin.delete" },
          { id: "archive", label: "Archivia", path: "admin.archive" }
      ]
  },
  { 
      id: "sal", 
      label: "SAL", 
      actions: [
          { id: "view", label: "Visualizza" },
          { id: "edit", label: "Modifica" },
          { id: "delete", label: "Elimina", path: "admin.delete" },
          { id: "approve", label: "Approva", path: "admin.approve" }
      ]
  },
  { 
      id: "ordini_materiale", 
      label: "Ordini Materiale", 
      actions: [
          { id: "view", label: "Visualizza" },
          { id: "edit", label: "Modifica" },
          { id: "delete", label: "Elimina", path: "admin.delete" },
          { id: "accept", label: "Accetta", path: "admin.accept" }
      ]
  },
  { 
      id: "documenti", 
      label: "Documenti", 
      actions: [
          { id: "view", label: "Visualizza" },
          { id: "edit", label: "Modifica" },
          { id: "delete", label: "Elimina", path: "admin.delete" },
          { id: "archive", label: "Archivia", path: "admin.archive" }
      ]
  },
  { 
      id: "costi", 
      label: "Costi", 
      actions: [
          { id: "view", label: "Visualizza" },
          { id: "edit", label: "Modifica" },
          { id: "delete", label: "Elimina", path: "admin.delete" }
      ]
  },
  { 
      id: "imprese", 
      label: "Imprese", 
      actions: [
          { id: "view", label: "Visualizza" },
          { id: "edit", label: "Modifica" },
          { id: "delete", label: "Elimina", path: "admin.delete" }
      ]
  },
  { 
      id: "persone", 
      label: "Professionisti", 
      actions: [
          { id: "view", label: "Visualizza" },
          { id: "edit", label: "Modifica" },
          { id: "delete", label: "Elimina", path: "admin.delete" }
      ]
  },
  { 
      id: "subappalti", 
      label: "Subappalti", 
      actions: [
          { id: "view", label: "Visualizza" },
          { id: "edit", label: "Modifica" },
          { id: "delete", label: "Elimina", path: "admin.delete" }
      ]
  },
  { 
      id: "attivita_interne", 
      label: "Attività", 
      actions: [
          { id: "view", label: "Visualizza" },
          { id: "edit", label: "Modifica" },
          { id: "delete", label: "Elimina", path: "admin.delete" }
      ]
  },
  { 
      id: "cronoprogramma", 
      label: "Cronoprogramma", 
      actions: [
          { id: "view", label: "Visualizza" },
          { id: "edit", label: "Modifica" }
      ]
  },
  { 
      id: "dashboard", 
      label: "Dashboard", 
      actions: [
          { id: "view", label: "Visualizza" }
      ]
  },
  { 
      id: "ai_assistant", 
      label: "AI Assistant", 
      actions: [
          { id: "view", label: "Visualizza" }
      ]
  },
  { 
      id: "profilo_azienda", 
      label: "Profilo Azienda", 
      actions: [
          { id: "view", label: "Visualizza" },
          { id: "edit", label: "Modifica" }
      ]
  },
  { 
      id: "user_management", 
      label: "Gestione Utenti", 
      actions: [
          { id: "view", label: "Visualizza" },
          { id: "manage_users", label: "Gest. Utenti", path: "manage_users" },
          { id: "manage_roles", label: "Gest. Ruoli", path: "manage_roles" },
          { id: "manage_cantiere_permissions", label: "Permessi Cantieri", path: "manage_cantiere_permissions" }
      ]
  },
];

export default function RuoloDialog({ open, onOpenChange, ruolo, onSave }) {
  const [formData, setFormData] = useState({
    nome: "",
    descrizione: "",
    permessi: {},
    is_system: false
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (ruolo) {
      // Normalize permissions: ensure all modules exist in permessi object
      const normalizedPermessi = ruolo.permessi ? JSON.parse(JSON.stringify(ruolo.permessi)) : {};
      
      modules.forEach(module => {
        if (!normalizedPermessi[module.id]) {
            normalizedPermessi[module.id] = {};
        }
      });

      setFormData({
        ...ruolo,
        permessi: normalizedPermessi
      });
    } else {
      setFormData({
        nome: "",
        descrizione: "",
        permessi: {},
        is_system: false
      });
    }
  }, [ruolo]);

  const updateNestedPermission = (permObj, moduleId, path, value) => {
    // Deep clone to safely mutate
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
        if (current === undefined || current === null) return false;
        current = current[parts[i]];
    }
    return !!current;
  };

  const handlePermessoChange = (moduleId, actionPath, value) => {
    setFormData(prev => ({
        ...prev,
        permessi: updateNestedPermission(prev.permessi, moduleId, actionPath, value)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const action = ruolo ? 'update_role' : 'create_role';
      // Clean up formData before sending, removing system fields that shouldn't be updated manually if present
      // But actually, we need roleId for update.
      // And we pass roleData.
      // Let's create a clean object for roleData
      const roleData = {
          nome: formData.nome,
          descrizione: formData.descrizione,
          permessi: formData.permessi,
          is_system: formData.is_system
      };

      const data = ruolo 
        ? { roleId: ruolo.id, roleData } 
        : { roleData };

      const res = await base44.functions.invoke('managePermissions', { action, data });
      
      if (res.data?.error) throw new Error(res.data.error);
      
      toast.success(ruolo ? "Ruolo aggiornato" : "Ruolo creato");
      onSave(); // Just reload data
    } catch (error) {
      console.error("Errore salvataggio:", error);
      toast.error("Errore: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>{ruolo ? "Modifica Ruolo" : "Nuovo Ruolo"}</DialogTitle>
          <DialogDescription>
            Configura i dettagli del ruolo e i permessi granulari per ogni modulo.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 pt-2">
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

            <div className="space-y-4">
               {modules.map(module => (
                   <div key={module.id} className="border rounded-lg p-4 bg-white shadow-sm">
                       <h3 className="font-semibold text-sm text-slate-800 mb-3 border-b pb-2">{module.label}</h3>
                       <div className="flex flex-wrap gap-4">
                           {module.actions.map(action => {
                               const path = action.path || action.id;
                               const isChecked = getPermissionValue(formData.permessi, module.id, path);
                               
                               return (
                                   <div key={action.id} className="flex items-center gap-2">
                                       <Switch 
                                            id={`${module.id}-${action.id}`}
                                            checked={isChecked}
                                            onCheckedChange={(val) => handlePermessoChange(module.id, path, val)}
                                            className={action.path?.includes('admin') ? "data-[state=checked]:bg-red-500" : ""}
                                       />
                                       <Label htmlFor={`${module.id}-${action.id}`} className="text-xs cursor-pointer">
                                           {action.label}
                                       </Label>
                                   </div>
                               );
                           })}
                       </div>
                   </div>
               ))}
            </div>
            </div>
          </div>

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