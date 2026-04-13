import React, { useState, useEffect, useMemo } from "react";
import { backendClient } from "@/api/backendClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Filter, ClipboardList, Edit, Trash2, CheckCircle, Clock, PlayCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PermissionGuard, usePermissions } from "@/components/shared/PermissionGuard";
import AttivitaInternaForm from "../components/attivita-interne/AttivitaInternaForm";

const prioritaMap = {
  critica: { label: "Critica", color: "bg-red-50 text-red-700 border-red-200" },
  alta: { label: "Alta", color: "bg-orange-50 text-orange-700 border-orange-200" },
  media: { label: "Media", color: "bg-amber-50 text-amber-700 border-amber-200" },
  bassa: { label: "Bassa", color: "bg-blue-50 text-blue-700 border-blue-200" },
};

const statoColors = {
  da_fare: "bg-slate-50 text-slate-700 border-slate-200",
  in_corso: "bg-cyan-50 text-cyan-700 border-cyan-200",
  in_revisione: "bg-purple-50 text-purple-700 border-purple-200",
  completato: "bg-emerald-50 text-emerald-700 border-emerald-200",
  bloccato: "bg-red-50 text-red-700 border-red-200",
};

export default function AttivitaInternePage() {
  const [attivita, setAttivita] = useState([]);
  const [utenti, setUtenti] = useState([]);
  const [cantieri, setCantieri] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAttivita, setEditingAttivita] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const [filtroStato, setFiltroStato] = useState("tutti");
  const [filtroAssegnatario, setFiltroAssegnatario] = useState("tutti");
  const [filtroPriorita, setFiltroPriorita] = useState("tutti");

  const { hasPermission } = usePermissions();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [attivitaData, utentiData, cantieriData, user] = await Promise.all([
        backendClient.entities.AttivitaInterna.list("-data_scadenza"),
        backendClient.entities.User.list(),
        backendClient.entities.Cantiere.list(),
        backendClient.auth.me()
      ]);
      setAttivita(attivitaData);
      setUtenti(utentiData);
      setCantieri(cantieriData);
      setCurrentUser(user);
    } catch (error) {
      console.error("Errore caricamento dati:", error);
    }
    setIsLoading(false);
  };

  const handleSubmit = async (formData) => {
    try {
      if (editingAttivita) {
        await backendClient.entities.AttivitaInterna.update(editingAttivita.id, formData);
      } else {
        await backendClient.entities.AttivitaInterna.create(formData);
      }
      setShowForm(false);
      setEditingAttivita(null);
      loadData();
    } catch (error) {
      console.error("Errore salvataggio attività:", error);
    }
  };

  const handleEdit = (item) => {
    setEditingAttivita(item);
    setShowForm(true);
  };

  const handleAddNew = () => {
    setEditingAttivita(null);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (confirm("Sei sicuro di voler eliminare questa attività?")) {
      try {
        await backendClient.entities.AttivitaInterna.delete(id);
        loadData();
      } catch (error) {
        console.error("Errore eliminazione attività:", error)
      }
    }
  }

  const getNameById = (collection, id, field = 'full_name') => {
    const item = collection.find(i => i.id === id);
    return item ? item[field] : "N/D";
  };

  const getCantiereName = (id) => {
    const cantiere = cantieri.find(c => c.id === id);
    return cantiere ? cantiere.denominazione : "Generale";
  }

  const filteredAttivita = useMemo(() => {
    return attivita.filter(item => {
      const statoMatch = filtroStato === 'tutti' || item.stato === filtroStato;
      const assegnatarioMatch = filtroAssegnatario === 'tutti' || item.assegnatario_id === filtroAssegnatario;
      const prioritaMatch = filtroPriorita === 'tutti' || item.priorita === filtroPriorita;
      return statoMatch && assegnatarioMatch && prioritaMatch;
    });
  }, [attivita, filtroStato, filtroAssegnatario, filtroPriorita]);

  // Stats
  const stats = {
    totali: attivita.length,
    daFare: attivita.filter(a => a.stato === 'da_fare').length,
    inCorso: attivita.filter(a => a.stato === 'in_corso').length,
    completate: attivita.filter(a => a.stato === 'completato').length
  };

  return (
    <PermissionGuard module="attivita_interne" action="view" pageLevelGuard={true}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="p-8">
          <div className="max-w-full mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Attività Interne</h1>
                <p className="text-slate-600 mt-1">Gestione e monitoraggio dei compiti del team</p>
              </div>
              {(currentUser?.role === 'admin' || hasPermission('attivita_interne', 'edit')) && (
                <Dialog open={showForm} onOpenChange={setShowForm}>
                  <DialogTrigger asChild>
                    <Button onClick={handleAddNew} className="shadow-sm h-10">
                      <Plus className="w-4 h-4 mr-2" />
                      Nuova Attività
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingAttivita ? "Modifica Attività" : "Nuova Attività"}
                      </DialogTitle>
                    </DialogHeader>
                    <AttivitaInternaForm
                      attivita={editingAttivita}
                      onSubmit={handleSubmit}
                      onCancel={() => setShowForm(false)}
                      utenti={utenti}
                      cantieri={cantieri}
                    />
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <Card className="border-0 shadow-sm bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Totale</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totali}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center">
                      <ClipboardList className="w-6 h-6 text-slate-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Da Fare</p>
                      <p className="text-2xl font-bold text-slate-700 mt-1">{stats.daFare}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-slate-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">In Corso</p>
                      <p className="text-2xl font-bold text-cyan-600 mt-1">{stats.inCorso}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center">
                      <PlayCircle className="w-6 h-6 text-cyan-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Completate</p>
                      <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.completate}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-emerald-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-0 shadow-sm mb-6 bg-white">
              <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                  <Filter className="w-4 h-4" />
                  Filtra per:
                </div>
                <Select value={filtroStato} onValueChange={setFiltroStato}>
                  <SelectTrigger className="w-full md:w-48 h-10 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tutti">Tutti gli stati</SelectItem>
                    <SelectItem value="da_fare">Da Fare</SelectItem>
                    <SelectItem value="in_corso">In Corso</SelectItem>
                    <SelectItem value="in_revisione">In Revisione</SelectItem>
                    <SelectItem value="completato">Completato</SelectItem>
                    <SelectItem value="bloccato">Bloccato</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filtroAssegnatario} onValueChange={setFiltroAssegnatario}>
                  <SelectTrigger className="w-full md:w-48 h-10 border-slate-200">
                    <SelectValue placeholder="Tutti gli assegnatari" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tutti">Tutti gli assegnatari</SelectItem>
                    {utenti.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filtroPriorita} onValueChange={setFiltroPriorita}>
                  <SelectTrigger className="w-full md:w-48 h-10 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tutti">Tutte le priorità</SelectItem>
                    <SelectItem value="bassa">Bassa</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="critica">Critica</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 border-b border-slate-200">
                      <TableHead className="font-semibold text-slate-700">Descrizione</TableHead>
                      <TableHead className="font-semibold text-slate-700">Cantiere</TableHead>
                      <TableHead className="font-semibold text-slate-700">Assegnato a</TableHead>
                      <TableHead className="font-semibold text-slate-700">Scadenza</TableHead>
                      <TableHead className="font-semibold text-slate-700">Priorità</TableHead>
                      <TableHead className="text-center font-semibold text-slate-700">Stato</TableHead>
                      <TableHead className="text-right font-semibold text-slate-700">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array(5).fill(0).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={7} className="text-center p-4">
                            <div className="animate-pulse h-6 bg-slate-200 rounded"></div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : filteredAttivita.map(item => {
                      const priorita = prioritaMap[item.priorita] || prioritaMap.bassa;
                      return (
                        <TableRow key={item.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <TableCell className="font-medium text-slate-900">{item.descrizione}</TableCell>
                          <TableCell className="text-slate-600 text-sm">{getCantiereName(item.cantiere_id)}</TableCell>
                          <TableCell className="text-slate-600 text-sm">{getNameById(utenti, item.assegnatario_id)}</TableCell>
                          <TableCell className="text-slate-600 text-sm">
                            {item.data_scadenza ? new Date(item.data_scadenza).toLocaleDateString('it-IT') : 'N/D'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`${priorita.color} border capitalize text-xs`}>
                              {priorita.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className={`${statoColors[item.stato]} border capitalize text-xs`}>
                              {item.stato.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {(currentUser?.role === 'admin' || hasPermission('attivita_interne', 'edit')) && (
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(item)}
                                  className="h-8 w-8 hover:bg-indigo-50 hover:text-indigo-600"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                                  onClick={() => handleDelete(item.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              {filteredAttivita.length === 0 && !isLoading && (
                <div className="text-center p-12 text-slate-500">
                  <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-semibold">Nessuna attività trovata</p>
                  <p className="text-sm mt-1">Inizia creando la prima attività per il tuo team</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}