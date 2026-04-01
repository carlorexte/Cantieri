import React, { useState, useEffect, useCallback } from "react";
import { backendClient } from "@/api/backendClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, DollarSign, TrendingUp, TrendingDown, Calendar, Edit, Trash2, Filter } from "lucide-react";
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

import CostoForm from "../components/costi/CostoForm";

const categoriaColors = {
  manodopera: "bg-blue-50 text-blue-700 border-blue-200",
  materiali: "bg-purple-50 text-purple-700 border-purple-200",
  noli: "bg-cyan-50 text-cyan-700 border-cyan-200",
  subappalti: "bg-indigo-50 text-indigo-700 border-indigo-200",
  spese_generali: "bg-amber-50 text-amber-700 border-amber-200",
  sicurezza: "bg-red-50 text-red-700 border-red-200"
};

const statoPagamentoColors = {
  da_pagare: "bg-amber-50 text-amber-700 border-amber-200",
  pagato: "bg-emerald-50 text-emerald-700 border-emerald-200",
  in_contenzioso: "bg-red-50 text-red-700 border-red-200"
};

export default function CostiPage() {
  const [costi, setCosti] = useState([]);
  const [cantieri, setCantieri] = useState([]);
  const [filteredCosti, setFilteredCosti] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState("tutti");
  const [cantiereFilter, setCantiereFilter] = useState("tutti");
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCosto, setEditingCosto] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const { hasPermission } = usePermissions();

  useEffect(() => {
    loadData();
  }, []);

  const filterCosti = useCallback(() => {
    let filtered = costi;

    if (searchTerm) {
      filtered = filtered.filter(costo =>
        costo.descrizione?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        costo.fornitore?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoriaFilter !== "tutti") {
      filtered = filtered.filter(costo => costo.categoria === categoriaFilter);
    }

    if (cantiereFilter !== "tutti") {
      filtered = filtered.filter(costo => costo.cantiere_id === cantiereFilter);
    }

    setFilteredCosti(filtered);
  }, [costi, searchTerm, categoriaFilter, cantiereFilter]);

  useEffect(() => {
    filterCosti();
  }, [filterCosti]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [costiData, cantieriData, user] = await Promise.all([
        backendClient.entities.Costo.list("-data_sostenimento"),
        backendClient.entities.Cantiere.list(),
        backendClient.auth.me()
      ]);
      setCosti(costiData);
      setCantieri(cantieriData);
      setCurrentUser(user);
    } catch (error) {
      console.error("Errore caricamento dati:", error);
    }
    setIsLoading(false);
  };

  const handleSubmit = async (formData) => {
    try {
      if (editingCosto) {
        await backendClient.entities.Costo.update(editingCosto.id, formData);
      } else {
        await backendClient.entities.Costo.create(formData);
      }
      setShowForm(false);
      setEditingCosto(null);
      loadData();
    } catch (error) {
      console.error("Errore salvataggio costo:", error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Sei sicuro di voler eliminare questo costo?")) {
      try {
        await backendClient.entities.Costo.delete(id);
        loadData();
      } catch (error) {
        console.error("Errore eliminazione:", error);
      }
    }
  };

  const handleEdit = (costo) => {
    setEditingCosto(costo);
    setShowForm(true);
  };

  const getCantiereName = (id) => {
    const cantiere = cantieri.find(c => c.id === id);
    return cantiere ? cantiere.denominazione : "N/D";
  };

  const stats = {
    totale: costi.reduce((sum, c) => sum + (c.importo || 0), 0),
    daPagare: costi.filter(c => c.stato_pagamento === 'da_pagare').reduce((sum, c) => sum + (c.importo || 0), 0),
    pagati: costi.filter(c => c.stato_pagamento === 'pagato').reduce((sum, c) => sum + (c.importo || 0), 0),
    numeroVoci: costi.length
  };

  return (
    <PermissionGuard module="costi" action="view">
      <div className="min-h-screen bg-slate-50">
        <div className="p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Costi</h1>
                <p className="text-slate-600 mt-1">Monitoraggio e gestione costi di cantiere</p>
              </div>
              {(currentUser?.role === 'admin' || hasPermission('costi', 'edit')) && (
                <Button onClick={() => { setEditingCosto(null); setShowForm(true); }} className="shadow-sm">
                  <Plus className="w-5 h-5 mr-2" />
                  Nuovo Costo
                </Button>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className="border-0 shadow-sm bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Totale Costi</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">
                        € {(stats.totale / 1000).toFixed(0)}K
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-slate-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Da Pagare</p>
                      <p className="text-2xl font-bold text-amber-600 mt-1">
                        € {(stats.daPagare / 1000).toFixed(0)}K
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                      <TrendingDown className="w-6 h-6 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Pagati</p>
                      <p className="text-2xl font-bold text-emerald-600 mt-1">
                        € {(stats.pagati / 1000).toFixed(0)}K
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-emerald-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Voci di Costo</p>
                      <p className="text-2xl font-bold text-cyan-600 mt-1">{stats.numeroVoci}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-cyan-600" />
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
                      placeholder="Cerca per descrizione o fornitore..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 border-slate-200"
                    />
                  </div>
                  <Select value={cantiereFilter} onValueChange={setCantiereFilter}>
                    <SelectTrigger className="w-full md:w-64 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tutti">Tutti i cantieri</SelectItem>
                      {cantieri.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.denominazione}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
                    <SelectTrigger className="w-full md:w-48 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tutti">Tutte le categorie</SelectItem>
                      <SelectItem value="manodopera">Manodopera</SelectItem>
                      <SelectItem value="materiali">Materiali</SelectItem>
                      <SelectItem value="noli">Noli</SelectItem>
                      <SelectItem value="subappalti">Subappalti</SelectItem>
                      <SelectItem value="spese_generali">Spese Generali</SelectItem>
                      <SelectItem value="sicurezza">Sicurezza</SelectItem>
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
                        <TableHead className="font-semibold text-slate-700">Descrizione</TableHead>
                        <TableHead className="font-semibold text-slate-700">Cantiere</TableHead>
                        <TableHead className="font-semibold text-slate-700">Categoria</TableHead>
                        <TableHead className="font-semibold text-slate-700">Fornitore</TableHead>
                        <TableHead className="text-right font-semibold text-slate-700">Importo</TableHead>
                        <TableHead className="font-semibold text-slate-700">Data</TableHead>
                        <TableHead className="text-center font-semibold text-slate-700">Stato</TableHead>
                        <TableHead className="text-right font-semibold text-slate-700">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        Array(5).fill(0).map((_, i) => (
                          <TableRow key={i} className="animate-pulse">
                            {Array(8).fill(0).map((_, j) => (
                              <TableCell key={j}><div className="h-4 bg-slate-200 rounded"></div></TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : filteredCosti.map(costo => (
                        <TableRow key={costo.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <TableCell className="font-medium text-slate-900">{costo.descrizione}</TableCell>
                          <TableCell className="text-slate-600">{getCantiereName(costo.cantiere_id)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`${categoriaColors[costo.categoria]} border capitalize`}>
                              {costo.categoria?.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-600">{costo.fornitore || '-'}</TableCell>
                          <TableCell className="text-right font-semibold text-slate-900">
                            € {(costo.importo || 0).toLocaleString('it-IT')}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {costo.data_sostenimento ? new Date(costo.data_sostenimento).toLocaleDateString('it-IT') : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className={`${statoPagamentoColors[costo.stato_pagamento]} border capitalize`}>
                              {costo.stato_pagamento?.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {(currentUser?.role === 'admin' || hasPermission('costi', 'edit')) && (
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(costo)}
                                  className="hover:bg-indigo-50 hover:text-indigo-600"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                {(currentUser?.role === 'admin' || hasPermission('costi', 'delete')) && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(costo.id)}
                                    className="hover:bg-red-50 hover:text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {filteredCosti.length === 0 && !isLoading && (
                  <div className="text-center p-12 text-slate-500">
                    <DollarSign className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <p className="font-semibold text-lg mb-2">Nessun costo registrato</p>
                    <p className="text-sm">Inizia aggiungendo il primo costo</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dialog Form */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingCosto ? "Modifica Costo" : "Nuovo Costo"}</DialogTitle>
                </DialogHeader>
                <CostoForm
                  costo={editingCosto}
                  cantieri={cantieri}
                  onSubmit={handleSubmit}
                  onCancel={() => setShowForm(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}