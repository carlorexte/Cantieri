import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Impresa } from "@/entities/Impresa";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Briefcase, Building2, Mail, Phone, Edit, Trash2 } from "lucide-react";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Add ImpresaForm import
import ImpresaForm from "../components/imprese/ImpresaForm";

export default function ImpresePage() {
  const [imprese, setImprese] = useState([]);
  const [filteredImprese, setFilteredImprese] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingImpresa, setEditingImpresa] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [impreseData, user, subappaltiData, sociData] = await Promise.all([
        Impresa.list("-created_date"),
        User.me(),
        base44.entities.Subappalto.filter({ stato: 'attivo' }),
        base44.entities.SocioConsorzio.filter({ stato: 'attivo' })
      ]);
      
      const impreseWithCounts = impreseData.map(impresa => {
        const subCount = subappaltiData.filter(s => s.impresa_id === impresa.id).length;
        const socioCount = sociData.filter(s => s.partita_iva === impresa.partita_iva).length;
        return {
            ...impresa,
            cantieri_count: subCount + socioCount
        };
      });
      
      setImprese(impreseWithCounts);
      setCurrentUser(user);
    } catch (error) {
      console.error("Errore caricamento imprese:", error);
    }
    setIsLoading(false);
  };

  const filterImprese = useCallback(() => {
    if (!searchTerm) {
      setFilteredImprese(imprese);
      return;
    }
    
    const filtered = imprese.filter(impresa =>
      impresa.ragione_sociale?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      impresa.partita_iva?.includes(searchTerm) ||
      impresa.citta_legale?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredImprese(filtered);
  }, [imprese, searchTerm]);

  useEffect(() => {
    filterImprese();
  }, [filterImprese]);

  const handleSubmit = async (impresaData) => {
    try {
      if (editingImpresa) {
        await Impresa.update(editingImpresa.id, impresaData);
      } else {
        await Impresa.create(impresaData);
      }
      setShowForm(false);
      setEditingImpresa(null);
      loadData();
    } catch (error) {
      console.error("Errore salvataggio impresa:", error);
    }
  };

  const handleEdit = (impresa) => {
    setEditingImpresa(impresa);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Sei sicuro di voler eliminare questa impresa? L'azione è irreversibile.")) {
      try {
        await Impresa.delete(id);
        loadData();
      } catch (error) {
        console.error("Errore eliminazione impresa:", error);
      }
    }
  };

  const stats = {
    totali: imprese.length,
    conCantieri: imprese.filter(i => i.cantieri_count > 0).length,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Anagrafica Imprese</h1>
              <p className="text-slate-600 mt-1">Gestione soci consorziati e imprese partner</p>
            </div>
            {currentUser?.role === 'admin' && (
              <Button 
                onClick={() => {
                  setEditingImpresa(null);
                  setShowForm(true);
                }} 
                className="bg-indigo-600 hover:bg-indigo-700 shadow-sm"
              >
                <Plus className="w-5 h-5 mr-2" />
                Nuova Impresa
              </Button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Totale Imprese</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totali}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <Briefcase className="w-6 h-6 text-indigo-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Con Cantieri Attivi</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.conCantieri}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <Card className="border-0 shadow-sm mb-6 bg-white">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  placeholder="Cerca per ragione sociale, P.IVA o città..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-slate-200"
                />
              </div>
            </CardContent>
          </Card>

          {/* Grid Imprese */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array(6).fill(0).map((_, i) => (
                <Card key={i} className="border-0 shadow-sm bg-white animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-6 bg-slate-200 rounded mb-4"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-slate-200 rounded"></div>
                      <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredImprese.length === 0 ? (
            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-12 text-center text-slate-500">
                <Briefcase className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p className="font-semibold text-lg mb-2">Nessuna impresa trovata</p>
                <p className="text-sm">Nessuna impresa corrisponde ai criteri di ricerca</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredImprese.map(impresa => (
                <Card key={impresa.id} className="border-0 shadow-sm bg-white hover:shadow-md transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <Link to={createPageUrl(`ImpresaDashboard?id=${impresa.id}`)}>
                          <h3 className="font-bold text-slate-900 text-lg mb-2 hover:text-indigo-600 transition-colors cursor-pointer">
                            {impresa.ragione_sociale}
                          </h3>
                        </Link>
                        <p className="text-sm text-slate-500">P.IVA: {impresa.partita_iva}</p>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-indigo-600" />
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      {impresa.email && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Mail className="w-4 h-4 text-slate-400" />
                          <span className="truncate">{impresa.email}</span>
                        </div>
                      )}
                      {impresa.telefono && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Phone className="w-4 h-4 text-slate-400" />
                          <span>{impresa.telefono}</span>
                        </div>
                      )}
                      {impresa.citta_legale && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          <span>{impresa.citta_legale}</span>
                        </div>
                      )}
                    </div>

                    {currentUser?.role === 'admin' && (
                      <div className="flex gap-2 mt-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEdit(impresa)}
                          className="flex-1 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Modifica
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => handleDelete(impresa.id)}
                          className="hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dialog per Form Impresa */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingImpresa ? "Modifica Impresa" : "Nuova Impresa"}</DialogTitle>
          </DialogHeader>
          <ImpresaForm
            impresa={editingImpresa}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingImpresa(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}