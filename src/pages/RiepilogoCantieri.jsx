
import React, { useState, useEffect } from "react";
import { backendClient } from "@/api/backendClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Building2, Euro, Calendar, MapPin, Search, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusColors = {
  attivo: "bg-emerald-50 text-emerald-700 border-emerald-200",
  sospeso: "bg-amber-50 text-amber-700 border-amber-200",
  completato: "bg-blue-50 text-blue-700 border-blue-200",
  in_gara: "bg-purple-50 text-purple-700 border-purple-200"
};

export default function RiepilogoCantieri() {
  const [cantieri, setCantieri] = useState([]);
  const [filteredCantieri, setFilteredCantieri] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCantieri();
  }, []);

  const loadCantieri = async () => {
    setIsLoading(true);
    try {
      const data = await backendClient.entities.Cantiere.list("-created_date");
      setCantieri(data);
      setFilteredCantieri(data);
    } catch (error) {
      console.error("Errore caricamento cantieri:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const filtered = cantieri.filter(cantiere => 
        cantiere.denominazione?.toLowerCase().includes(term) ||
        cantiere.codice_cig?.toLowerCase().includes(term) ||
        cantiere.committente_ragione_sociale?.toLowerCase().includes(term)
      );
      setFilteredCantieri(filtered);
    } else {
      setFilteredCantieri(cantieri);
    }
  }, [searchTerm, cantieri]);

  const totaleImporti = filteredCantieri.reduce((sum, c) => sum + (c.importo_contratto || 0), 0);

  const exportToCSV = () => {
    const headers = ["N°", "Denominazione", "CIG", "Committente", "Importo", "Data Inizio", "Stato", "Città"];
    const rows = filteredCantieri.map(c => [
      c.numero_cantiere || '',
      c.denominazione || '',
      c.codice_cig || '',
      c.committente_ragione_sociale || '',
      c.importo_contratto || 0,
      c.data_inizio ? new Date(c.data_inizio).toLocaleDateString('it-IT') : '',
      c.stato || '',
      c.indirizzo_citta || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `riepilogo_cantieri_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Cantieri')}>
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Indietro
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Riepilogo Cantieri</h1>
              <p className="text-slate-600 mt-1">Vista sintetica di tutti i cantieri</p>
            </div>
          </div>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Esporta CSV
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500">Totale Cantieri</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{filteredCantieri.length}</p>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500">Cantieri Attivi</p>
              <p className="text-3xl font-bold text-emerald-600 mt-1">
                {filteredCantieri.filter(c => c.stato === 'attivo').length}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500">Valore Totale</p>
              <p className="text-3xl font-bold text-indigo-600 mt-1">
                € {(totaleImporti / 1000000).toFixed(2)}M
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="border-0 shadow-sm mb-6 bg-white">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Cerca per nome, CIG o committente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 border-slate-200"
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-0 shadow-sm bg-white">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold w-20">N°</TableHead>
                  <TableHead className="font-semibold">Cantiere</TableHead>
                  <TableHead className="font-semibold">CIG</TableHead>
                  <TableHead className="font-semibold">Committente</TableHead>
                  <TableHead className="font-semibold text-right">Importo</TableHead>
                  <TableHead className="font-semibold">Data Inizio</TableHead>
                  <TableHead className="font-semibold">Città</TableHead>
                  <TableHead className="font-semibold">Stato</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Caricamento...
                    </TableCell>
                  </TableRow>
                ) : filteredCantieri.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                      Nessun cantiere trovato
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCantieri.map((cantiere) => (
                    <TableRow key={cantiere.id} className="hover:bg-slate-50">
                      <TableCell className="font-mono text-slate-600">
                        {cantiere.numero_cantiere ? `#${cantiere.numero_cantiere}` : '-'}
                      </TableCell>
                      <TableCell>
                        <Link 
                          to={createPageUrl(`CantiereDashboard?id=${cantiere.id}`)}
                          className="font-medium text-slate-900 hover:text-indigo-600 transition-colors"
                        >
                          {cantiere.denominazione}
                        </Link>
                      </TableCell>
                      <TableCell className="text-slate-600">{cantiere.codice_cig || '-'}</TableCell>
                      <TableCell className="text-slate-600">{cantiere.committente_ragione_sociale || '-'}</TableCell>
                      <TableCell className="text-right font-medium">
                        € {cantiere.importo_contratto?.toLocaleString('it-IT') || '0'}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {cantiere.data_inizio ? new Date(cantiere.data_inizio).toLocaleDateString('it-IT') : '-'}
                      </TableCell>
                      <TableCell className="text-slate-600">{cantiere.indirizzo_citta || '-'}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary"
                          className={`${statusColors[cantiere.stato] || statusColors.attivo} border`}
                        >
                          {cantiere.stato || 'attivo'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
