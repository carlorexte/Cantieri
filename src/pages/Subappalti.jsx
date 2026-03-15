import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Handshake, Filter, Edit, Trash2, Eye, Building2, Euro, Calendar, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

import SubappaltoForm from "../components/subappalti/SubappaltoForm";
import SubappaltoDetail from "../components/subappalti/SubappaltoDetail";

const statoColors = {
  attivo: "bg-emerald-50 text-emerald-700 border-emerald-200",
  scaduto: "bg-red-50 text-red-700 border-red-200",
  risolto: "bg-amber-50 text-amber-700 border-amber-200",
  completato: "bg-blue-50 text-blue-700 border-blue-200"
};

const tipoRelazioneColors = {
  subappalto: "bg-indigo-50 text-indigo-700 border-indigo-200",
  subaffidamento: "bg-purple-50 text-purple-700 border-purple-200"
};

export default function SubappaltiPage() {
  const [subappalti, setSubappalti] = useState([]);
  const [cantieri, setCantieri] = useState([]);
  const [imprese, setImprese] = useState([]);
  const [filteredSubappalti, setFilteredSubappalti] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statoFilter, setStatoFilter] = useState("tutti");
  const [cantiereFilter, setCantiereFilter] = useState("tutti");
  const [tipoRelazioneFilter, setTipoRelazioneFilter] = useState("tutti");
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSubappalto, setEditingSubappalto] = useState(null);
  const [nuovoTipoRelazione, setNuovoTipoRelazione] = useState("subappalto");
  const [showDetail, setShowDetail] = useState(false);
  const [selectedSubappalto, setSelectedSubappalto] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const { hasPermission } = usePermissions();

  useEffect(() => {
    loadData();
  }, []);

  const filterSubappalti = useCallback(() => {
    let filtered = subappalti;

    if (searchTerm) {
      filtered = filtered.filter(sub =>
        sub.ragione_sociale?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.categoria_lavori?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statoFilter !== "tutti") {
      filtered = filtered.filter(sub => sub.stato === statoFilter);
    }

    if (cantiereFilter !== "tutti") {
      filtered = filtered.filter(sub => sub.cantiere_id === cantiereFilter);
    }

    if (tipoRelazioneFilter !== "tutti") {
      filtered = filtered.filter(sub => (sub.tipo_relazione || "subappalto") === tipoRelazioneFilter);
    }

    setFilteredSubappalti(filtered);
  }, [subappalti, searchTerm, statoFilter, cantiereFilter, tipoRelazioneFilter]);

  useEffect(() => {
    filterSubappalti();
  }, [filterSubappalti]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [subappaltiData, cantieriData, impreseData, user] = await Promise.all([
        base44.entities.Subappalto.list("-created_date"),
        base44.entities.Cantiere.list(),
        base44.entities.Impresa.list(),
        base44.auth.me()
      ]);
      setSubappalti(subappaltiData);
      setCantieri(cantieriData);
      setImprese(impreseData);
      setCurrentUser(user);
    } catch (error) {
      console.error("Errore caricamento dati:", error);
    }
    setIsLoading(false);
  };

  const handleSubmit = async (formData) => {
    try {
      if (editingSubappalto) {
        await base44.entities.Subappalto.update(editingSubappalto.id, formData);
      } else {
        await base44.entities.Subappalto.create(formData);
      }
      setShowForm(false);
      setEditingSubappalto(null);
      loadData();
    } catch (error) {
      console.error("Errore salvataggio subappalto:", error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Sei sicuro di voler eliminare questo elemento?")) {
      try {
        await base44.entities.Subappalto.delete(id);
        loadData();
      } catch (error) {
        console.error("Errore eliminazione:", error);
      }
    }
  };

  const handleEdit = (sub) => {
    setEditingSubappalto(sub);
    setNuovoTipoRelazione(sub.tipo_relazione || "subappalto");
    setShowForm(true);
  };

  const handleViewDetail = (sub) => {
    setSelectedSubappalto(sub);
    setShowDetail(true);
  };

  const handleNuovoSubappalto = () => {
    setEditingSubappalto(null);
    setNuovoTipoRelazione("subappalto");
    setShowForm(true);
  };

  const handleNuovoSubaffidamento = () => {
    setEditingSubappalto(null);
    setNuovoTipoRelazione("subaffidamento");
    setShowForm(true);
  };

  const getCantiereName = (id) => {
    const cantiere = cantieri.find(c => c.id === id);
    return cantiere ? cantiere.denominazione : "N/D";
  };

  const stats = {
    totali: subappalti.length,
    subappalti: subappalti.filter(s => (s.tipo_relazione || "subappalto") === "subappalto").length,
    subaffidamenti: subappalti.filter(s => s.tipo_relazione === "subaffidamento").length,
    attivi: subappalti.filter(s => s.stato === 'attivo').length,
    valoreTotale: subappalti.reduce((sum, s) => sum + (s.importo_contratto || 0), 0),
    completati: subappalti.filter(s => s.stato === 'completato').length
  };

  return (
    <PermissionGuard module="subappalti" action="view">
    <div className="min-h-screen bg-slate-50">
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Subappalti e Subaffidamenti</h1>
              <p className="text-slate-600 mt-1">Gestione contratti di subappalto e subaffidamento</p>
            </div>
            {(currentUser?.role === 'admin' || hasPermission('subappalti', 'edit')) && (
              <div className="flex gap-2">
                <Button onClick={handleNuovoSubappalto} className="bg-indigo-600 hover:bg-indigo-700 shadow-sm">
                  <Plus className="w-5 h-5 mr-2" />
                  Nuovo Subappalto
                </Button>
                <Button onClick={handleNuovoSubaffidamento} className="bg-purple-600 hover:bg-purple-700 shadow-sm">
                  <Plus className="w-5 h-5 mr-2" />
                  Nuovo Subaffidamento
                </Button>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Totale</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totali}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <Handshake className="w-6 h-6 text-indigo-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Subappalti</p>
                    <p className="text-2xl font-bold text-indigo-600 mt-1">{stats.subappalti}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-indigo-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Subaffidamenti</p>
                    <p className="text-2xl font-bold text-purple-600 mt-1">{stats.subaffidamenti}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                    <Handshake className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Attivi</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.attivi}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Valore Totale</p>
                    <p className="text-2xl font-bold text-cyan-600 mt-1">
                      € {(stats.valoreTotale / 1000).toFixed(0)}K
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center">
                    <Euro className="w-6 h-6 text-cyan-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtri */}
          <Card className="border-0 shadow-sm mb-6 bg-white">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <Input
                    placeholder="Cerca per ragione sociale o categoria..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-slate-200"
                  />
                </div>
                <Select value={cantiereFilter} onValueChange={setCantiereFilter}>
                  <SelectTrigger className="w-full md:w-48 border-slate-200">
                    <SelectValue placeholder="Filtra per cantiere" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tutti">Tutti i cantieri</SelectItem>
                    {cantieri.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.denominazione}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={tipoRelazioneFilter} onValueChange={setTipoRelazioneFilter}>
                  <SelectTrigger className="w-full md:w-48 border-slate-200">
                    <SelectValue placeholder="Filtra per tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tutti">Tutti i tipi</SelectItem>
                    <SelectItem value="subappalto">Subappalti</SelectItem>
                    <SelectItem value="subaffidamento">Subaffidamenti</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statoFilter} onValueChange={setStatoFilter}>
                  <SelectTrigger className="w-full md:w-48 border-slate-200">
                    <SelectValue placeholder="Filtra per stato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tutti">Tutti gli stati</SelectItem>
                    <SelectItem value="attivo">Attivo</SelectItem>
                    <SelectItem value="scaduto">Scaduto</SelectItem>
                    <SelectItem value="risolto">Risolto</SelectItem>
                    <SelectItem value="completato">Completato</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tabella */}
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 border-b border-slate-200">
                      <TableHead className="font-semibold text-slate-700">Ragione Sociale</TableHead>
                      <TableHead className="font-semibold text-slate-700">Cantiere</TableHead>
                      <TableHead className="font-semibold text-slate-700">Tipo</TableHead>
                      <TableHead className="font-semibold text-slate-700">Categoria</TableHead>
                      <TableHead className="text-right font-semibold text-slate-700">Importo</TableHead>
                      <TableHead className="text-center font-semibold text-slate-700">Stato</TableHead>
                      <TableHead className="text-right font-semibold text-slate-700">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array(5).fill(0).map((_, i) => (
                        <TableRow key={i} className="animate-pulse">
                          <TableCell><div className="h-4 bg-slate-200 rounded"></div></TableCell>
                          <TableCell><div className="h-4 bg-slate-200 rounded"></div></TableCell>
                          <TableCell><div className="h-4 bg-slate-200 rounded"></div></TableCell>
                          <TableCell><div className="h-4 bg-slate-200 rounded"></div></TableCell>
                          <TableCell><div className="h-4 bg-slate-200 rounded"></div></TableCell>
                          <TableCell><div className="h-4 bg-slate-200 rounded"></div></TableCell>
                          <TableCell><div className="h-4 bg-slate-200 rounded"></div></TableCell>
                        </TableRow>
                      ))
                    ) : filteredSubappalti.map(sub => (
                      <TableRow key={sub.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <TableCell className="font-medium text-slate-900">{sub.ragione_sociale}</TableCell>
                        <TableCell className="text-slate-600">{getCantiereName(sub.cantiere_id)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`${tipoRelazioneColors[sub.tipo_relazione || "subappalto"]} border capitalize`}>
                            {sub.tipo_relazione === "subaffidamento" ? "Subaffidamento" : "Subappalto"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-600 capitalize">
                          {sub.categoria_lavori?.replace('_', ' ')}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-slate-900">
                          € {(sub.importo_contratto || 0).toLocaleString('it-IT')}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className={`${statoColors[sub.stato]} border capitalize`}>
                            {sub.stato}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleViewDetail(sub)}
                              className="hover:bg-cyan-50 hover:text-cyan-600"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {(currentUser?.role === 'admin' || hasPermission('subappalti', 'edit')) && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleEdit(sub)}
                                className="hover:bg-indigo-50 hover:text-indigo-600"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                            {(currentUser?.role === 'admin' || hasPermission('subappalti', 'delete')) && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleDelete(sub.id)}
                                className="hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {filteredSubappalti.length === 0 && !isLoading && (
                <div className="text-center p-12 text-slate-500">
                  <Handshake className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p className="font-semibold text-lg mb-2">Nessun elemento trovato</p>
                  <p className="text-sm">Inizia aggiungendo il primo subappalto o subaffidamento</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dialog Form */}
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingSubappalto 
                    ? `Modifica ${editingSubappalto.tipo_relazione === "subaffidamento" ? "Subaffidamento" : "Subappalto"}` 
                    : `Nuovo ${nuovoTipoRelazione === "subaffidamento" ? "Subaffidamento" : "Subappalto"}`
                  }
                </DialogTitle>
              </DialogHeader>
              <SubappaltoForm
                subappalto={editingSubappalto}
                cantieri={cantieri}
                imprese={imprese}
                tipoRelazione={nuovoTipoRelazione}
                onSubmit={handleSubmit}
                onCancel={() => setShowForm(false)}
              />
            </DialogContent>
          </Dialog>

          {/* Dialog Detail */}
          <Dialog open={showDetail} onOpenChange={setShowDetail}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Dettagli</DialogTitle>
              </DialogHeader>
              {selectedSubappalto && (
                <SubappaltoDetail
                  subappalto={selectedSubappalto}
                  cantiere={cantieri.find(c => c.id === selectedSubappalto.cantiere_id)}
                  onClose={() => setShowDetail(false)}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
    </PermissionGuard>
  );
}