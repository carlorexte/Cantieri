import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, Circle, Clock, AlertCircle, Plus, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { backendClient } from "@/api/backendClient";
import { useToast } from "@/components/ui/use-toast";

export default function AttivitaManager({ cantiereId, attivitaList, onUpdate }) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingAttivita, setEditingAttivita] = useState(null);
  const { toast } = useToast();
  
  // Form state
  const [formData, setFormData] = useState({
    descrizione: "",
    responsabile: "",
    data_inizio: "",
    data_fine: "",
    priorita: "media",
    stato: "pianificata",
    tipo_attivita: "task"
  });

  const resetForm = () => {
    setFormData({
      descrizione: "",
      responsabile: "",
      data_inizio: "",
      data_fine: "",
      priorita: "media",
      stato: "pianificata",
      tipo_attivita: "task"
    });
    setEditingAttivita(null);
  };

  const handleEdit = (attivita) => {
    setEditingAttivita(attivita);
    setFormData({
      descrizione: attivita.descrizione,
      responsabile: attivita.responsabile || "",
      data_inizio: attivita.data_inizio,
      data_fine: attivita.data_fine,
      priorita: attivita.priorita || "media", // Assumendo che priorità possa non esistere nell'entità originale, la gestiamo o aggiungiamo se necessario. L'entità Attivita ha 'is_critical_path' ma non 'priorita' esplicita nel JSON schema standard, ma AttivitaInterna sì. Qui usiamo i campi standard di Attivita o adattiamo. Attivita ha 'stato' e 'tipo_attivita'. Usiamo quelli. Se manca priorità usiamo un campo custom o note.
      stato: attivita.stato,
      tipo_attivita: attivita.tipo_attivita
    });
    setShowDialog(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Sei sicuro di voler eliminare questa attività?")) return;
    try {
      await backendClient.entities.Attivita.delete(id);
      toast({ title: "Attività eliminata" });
      onUpdate();
    } catch (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        cantiere_id: cantiereId
      };

      if (editingAttivita) {
        await backendClient.entities.Attivita.update(editingAttivita.id, payload);
        toast({ title: "Attività aggiornata" });
      } else {
        await backendClient.entities.Attivita.create(payload);
        toast({ title: "Attività creata" });
      }
      
      setShowDialog(false);
      resetForm();
      onUpdate();
    } catch (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    }
  };

  const statusColors = {
    pianificata: "bg-slate-100 text-slate-700",
    in_corso: "bg-blue-100 text-blue-700",
    completata: "bg-green-100 text-green-700",
    sospesa: "bg-yellow-100 text-yellow-700",
    in_ritardo: "bg-red-100 text-red-700"
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-bold">Attività e Task</CardTitle>
        <Button onClick={() => { resetForm(); setShowDialog(true); }} size="sm" className="gap-1">
          <Plus className="w-4 h-4" /> Nuova Attività
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stato</TableHead>
                <TableHead>Descrizione</TableHead>
                <TableHead>Responsabile</TableHead>
                <TableHead>Scadenza</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attivitaList && attivitaList.length > 0 ? (
                attivitaList.map((att) => (
                  <TableRow key={att.id}>
                    <TableCell>
                      <Badge variant="secondary" className={statusColors[att.stato] || "bg-gray-100"}>
                        {att.stato.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{att.descrizione}</TableCell>
                    <TableCell>{att.responsabile || "-"}</TableCell>
                    <TableCell>
                      {att.data_fine ? format(new Date(att.data_fine), "dd MMM yyyy", { locale: it }) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(att)}>
                          <Pencil className="w-4 h-4 text-slate-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(att.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    Nessuna attività registrata per questo cantiere.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingAttivita ? "Modifica Attività" : "Nuova Attività"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid gap-2">
                <Label htmlFor="descrizione">Descrizione</Label>
                <Input 
                  id="descrizione" 
                  value={formData.descrizione} 
                  onChange={(e) => setFormData({...formData, descrizione: e.target.value})} 
                  required 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="responsabile">Responsabile</Label>
                  <Input 
                    id="responsabile" 
                    value={formData.responsabile} 
                    onChange={(e) => setFormData({...formData, responsabile: e.target.value})} 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="stato">Stato</Label>
                  <Select 
                    value={formData.stato} 
                    onValueChange={(val) => setFormData({...formData, stato: val})}
                  >
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
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="data_inizio">Data Inizio</Label>
                  <Input 
                    id="data_inizio" 
                    type="date" 
                    value={formData.data_inizio} 
                    onChange={(e) => setFormData({...formData, data_inizio: e.target.value})} 
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="data_fine">Data Fine (Scadenza)</Label>
                  <Input 
                    id="data_fine" 
                    type="date" 
                    value={formData.data_fine} 
                    onChange={(e) => setFormData({...formData, data_fine: e.target.value})} 
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Annulla</Button>
                <Button type="submit">Salva</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}