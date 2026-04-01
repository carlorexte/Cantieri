import React, { useState, useEffect } from "react";
import { backendClient } from "@/api/backendClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Plus, Search, User as UserIcon, MoreHorizontal, Edit, Trash2, Mail, Phone } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PermissionGuard, usePermissions } from "@/components/shared/PermissionGuard";

import PersonaEsternaForm from "../components/persone-esterne/PersonaEsternaForm";

export default function PersoneEsterne() {
  const [persone, setPersone] = useState([]);
  const [filteredPersone, setFilteredPersone] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPersona, setEditingPersona] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState(null);

  const { hasPermission } = usePermissions();

  useEffect(() => {
    loadPersone();
    loadUser();
  }, []);

  useEffect(() => {
    filterPersone();
  }, [searchTerm, persone]);

  const loadUser = async () => {
    try {
      const user = await backendClient.auth.me();
      setCurrentUser(user);
    } catch (error) {
      console.error("Errore caricamento utente:", error);
    }
  };

  const loadPersone = async () => {
    setIsLoading(true);
    try {
      const data = await backendClient.entities.PersonaEsterna.list("-created_date");
      // Ordina alfabeticamente per cognome e poi per nome
      const sortedData = data.sort((a, b) => {
        const cognomeCompare = (a.cognome || '').localeCompare(b.cognome || '');
        if (cognomeCompare !== 0) return cognomeCompare;
        return (a.nome || '').localeCompare(b.nome || '');
      });
      setPersone(sortedData);
    } catch (error) {
      console.error("Errore caricamento persone:", error);
    }
    setIsLoading(false);
  };

  const filterPersone = () => {
    let filtered = persone;

    if (searchTerm) {
      filtered = filtered.filter(persona =>
        `${persona.nome} ${persona.cognome}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        persona.qualifica?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        persona.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredPersone(filtered);
  };

  const handleSubmit = async (personaData) => {
    try {
      if (editingPersona) {
        await backendClient.entities.PersonaEsterna.update(editingPersona.id, personaData);
      } else {
        await backendClient.entities.PersonaEsterna.create(personaData);
      }
      setShowForm(false);
      setEditingPersona(null);
      loadPersone();
    } catch (error) {
      console.error("Errore salvataggio persona:", error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Sei sicuro di voler eliminare questa persona? L'azione è irreversibile.")) {
      try {
        await backendClient.entities.PersonaEsterna.delete(id);
        loadPersone();
      } catch (error) {
        console.error("Errore eliminazione persona:", error);
      }
    }
  };

  const handleEdit = (persona) => {
    setEditingPersona(persona);
    setShowForm(true);
  };

  return (
    <PermissionGuard module="persone" action="view">
      <div className="min-h-screen bg-slate-50">
        <div className="p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Persone Esterne</h1>
                <p className="text-slate-600 mt-1">Anagrafica collaboratori esterni e figure di riferimento</p>
              </div>
              {(currentUser?.role === 'admin' || hasPermission('persone', 'edit')) && (
                <Button
                  onClick={() => {
                    setEditingPersona(null);
                    setShowForm(true);
                  }}
                  className="shadow-sm"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Nuova Persona
                </Button>
              )}
            </div>

            {/* Search */}
            <Card className="border-0 shadow-sm mb-6 bg-white">
              <CardContent className="p-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    placeholder="Cerca per nome, qualifica o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-11 border-slate-200 focus:border-indigo-300 focus:ring-indigo-200"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card className="border-0 shadow-sm bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Totale Persone</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{persone.length}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center">
                      <UserIcon className="w-6 h-6 text-slate-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Lista Persone */}
            <div className="grid gap-4">
              {isLoading ? (
                <div className="space-y-4">
                  {Array(3).fill(0).map((_, i) => (
                    <Card key={i} className="animate-pulse border-0 shadow-sm bg-white">
                      <CardContent className="p-6">
                        <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
                        <div className="space-y-2">
                          <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                filteredPersone.map((persona) => (
                  <Card key={persona.id} className="border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-white group">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                              <UserIcon className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div className="flex-1">
                              <button
                                onClick={() => {
                                  setSelectedPersona(persona);
                                  setShowDetailDialog(true);
                                }}
                                className="text-left w-full"
                              >
                                <h3 className="text-xl font-bold text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer">
                                  {persona.nome} {persona.cognome}
                                </h3>
                                {persona.qualifica && (
                                  <p className="text-sm text-slate-500">{persona.qualifica}</p>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        {(currentUser?.role === 'admin' || hasPermission('persone', 'edit')) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600">
                                <MoreHorizontal className="w-5 h-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => handleEdit(persona)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Modifica
                              </DropdownMenuItem>
                              {/* Check delete permission */}
                              {(currentUser?.role === 'admin' || hasPermission('persone', 'delete')) && (
                                <DropdownMenuItem
                                  onClick={() => handleDelete(persona.id)}
                                  className="text-red-600 focus:bg-red-50 focus:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Elimina
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {filteredPersone.length === 0 && !isLoading && (
              <Card className="border-0 shadow-sm bg-white">
                <CardContent className="p-12 text-center">
                  <UserIcon className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Nessuna persona trovata</h3>
                  <p className="text-slate-600">Inizia aggiungendo la prima persona esterna</p>
                </CardContent>
              </Card>
            )}

            {/* Dialog Form */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingPersona ? "Modifica Persona Esterna" : "Nuova Persona Esterna"}
                  </DialogTitle>
                </DialogHeader>
                <PersonaEsternaForm
                  persona={editingPersona}
                  onSubmit={handleSubmit}
                  onCancel={() => {
                    setShowForm(false);
                    setEditingPersona(null);
                  }}
                />
              </DialogContent>
            </Dialog>

            {/* Dialog Dettagli */}
            <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Dettagli Persona Esterna</DialogTitle>
                </DialogHeader>
                {selectedPersona && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 pb-4 border-b">
                      <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
                        <UserIcon className="w-8 h-8 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900">
                          {selectedPersona.nome} {selectedPersona.cognome}
                        </h3>
                        {selectedPersona.qualifica && (
                          <p className="text-slate-600 text-lg">{selectedPersona.qualifica}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {selectedPersona.codice_fiscale && (
                        <div>
                          <p className="text-sm font-medium text-slate-500 mb-1">Codice Fiscale</p>
                          <p className="text-slate-900">{selectedPersona.codice_fiscale}</p>
                        </div>
                      )}
                      {selectedPersona.partita_iva && (
                        <div>
                          <p className="text-sm font-medium text-slate-500 mb-1">Partita IVA</p>
                          <p className="text-slate-900">{selectedPersona.partita_iva}</p>
                        </div>
                      )}
                      {selectedPersona.data_nascita && (
                        <div>
                          <p className="text-sm font-medium text-slate-500 mb-1">Data di Nascita</p>
                          <p className="text-slate-900">{new Date(selectedPersona.data_nascita).toLocaleDateString('it-IT')}</p>
                        </div>
                      )}
                      {selectedPersona.email && (
                        <div>
                          <p className="text-sm font-medium text-slate-500 mb-1">Email</p>
                          <p className="text-slate-900">{selectedPersona.email}</p>
                        </div>
                      )}
                      {selectedPersona.pec && (
                        <div>
                          <p className="text-sm font-medium text-slate-500 mb-1">PEC</p>
                          <p className="text-slate-900">{selectedPersona.pec}</p>
                        </div>
                      )}
                      {selectedPersona.telefono && (
                        <div>
                          <p className="text-sm font-medium text-slate-500 mb-1">Telefono</p>
                          <p className="text-slate-900">{selectedPersona.telefono}</p>
                        </div>
                      )}
                    </div>

                    {(selectedPersona.indirizzo || selectedPersona.cap || selectedPersona.citta || selectedPersona.provincia) && (
                      <div className="pt-4 border-t">
                        <p className="text-sm font-medium text-slate-500 mb-3">Indirizzo</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedPersona.indirizzo && (
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Via</p>
                              <p className="text-slate-900">{selectedPersona.indirizzo}</p>
                            </div>
                          )}
                          {selectedPersona.cap && (
                            <div>
                              <p className="text-xs text-slate-500 mb-1">CAP</p>
                              <p className="text-slate-900">{selectedPersona.cap}</p>
                            </div>
                          )}
                          {selectedPersona.citta && (
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Città</p>
                              <p className="text-slate-900">{selectedPersona.citta}</p>
                            </div>
                          )}
                          {selectedPersona.provincia && (
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Provincia</p>
                              <p className="text-slate-900">{selectedPersona.provincia}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedPersona.note && (
                      <div className="pt-4 border-t">
                        <p className="text-sm font-medium text-slate-500 mb-2">Note</p>
                        <p className="text-slate-900 whitespace-pre-wrap">{selectedPersona.note}</p>
                      </div>
                    )}
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}