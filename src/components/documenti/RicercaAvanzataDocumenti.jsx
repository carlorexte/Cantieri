import React, { useState, useCallback, useEffect } from "react";
import { backendClient } from "@/api/backendClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, Calendar, Tag, Building2, X, Download, Eye, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";

const categorieDocumenti = {
  permessi: { label: "Permessi", color: "bg-purple-100 text-purple-800" },
  contratti: { label: "Contratti", color: "bg-blue-100 text-blue-800" },
  polizze: { label: "Polizze", color: "bg-green-100 text-green-800" },
  certificazioni: { label: "Certificazioni", color: "bg-cyan-100 text-cyan-800" },
  fatture: { label: "Fatture", color: "bg-orange-100 text-orange-800" },
  sal: { label: "SAL", color: "bg-indigo-100 text-indigo-800" },
  sicurezza: { label: "Sicurezza", color: "bg-red-100 text-red-800" },
  tecnici: { label: "Documenti Tecnici", color: "bg-teal-100 text-teal-800" },
  foto: { label: "Foto", color: "bg-pink-100 text-pink-800" },
  corrispondenza: { label: "Corrispondenza", color: "bg-amber-100 text-amber-800" },
  legale: { label: "Legale", color: "bg-rose-100 text-rose-800" },
  altro: { label: "Altro", color: "bg-slate-100 text-slate-800" }
};

export default function RicercaAvanzataDocumenti({ onDocumentoSelect }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState("");
  const [dataInizioFilter, setDataInizioFilter] = useState("");
  const [dataFineFilter, setDataFineFilter] = useState("");
  const [cantiereFilter, setCantiereFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [searchInContent, setSearchInContent] = useState(false);
  
  const [risultati, setRisultati] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [cantieri, setCantieri] = useState([]);

  useEffect(() => {
    loadCantieri();
  }, []);

  const loadCantieri = async () => {
    try {
      const data = await backendClient.entities.Cantiere.list("-created_date", 100);
      setCantieri(data);
    } catch (error) {
      console.error("Errore caricamento cantieri:", error);
    }
  };

  const getCantiereNomi = useCallback((documento) => {
    const nomi = [];
    
    let ec = documento.entita_collegate;
    if (typeof ec === 'string') { try { ec = JSON.parse(ec); } catch { ec = []; } }
    if (Array.isArray(ec) && ec.length > 0) {
      ec.forEach(e => {
        if (e.entita_tipo === 'cantiere') {
          const cantiere = cantieri.find(c => c.id === e.entita_id);
          if (cantiere) nomi.push(cantiere.denominazione);
        }
      });
    }
    
    if (nomi.length === 0 && documento.entita_collegata_tipo === 'cantiere') {
      const cantiere = cantieri.find(c => c.id === documento.entita_collegata_id);
      if (cantiere) nomi.push(cantiere.denominazione);
    }
    
    return nomi;
  }, [cantieri]);

  const handleViewDocument = useCallback(async (doc) => {
    try {
      let url = doc.cloud_file_url;
      if (doc.file_uri) {
        const result = await backendClient.integrations.Core.CreateFileSignedUrl({
          file_uri: doc.file_uri,
          expires_in: 3600
        });
        url = result.signed_url;
      }
      window.open(url, '_blank');
    } catch (error) {
      console.error("Errore apertura documento:", error);
      toast.error("Impossibile aprire il documento");
    }
  }, []);

  const handleDownloadDocument = useCallback(async (doc) => {
    try {
      let url = doc.cloud_file_url;
      if (doc.file_uri) {
        const result = await backendClient.integrations.Core.CreateFileSignedUrl({
          file_uri: doc.file_uri,
          expires_in: 300
        });
        url = result.signed_url;
      }
      
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.nome_documento;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("Download avviato");
    } catch (error) {
      console.error("Errore download:", error);
      toast.error("Impossibile scaricare il documento");
    }
  }, []);

  const handleSearch = useCallback(async () => {
    setIsSearching(true);
    try {
      let documenti = await backendClient.entities.Documento.list("-created_date", 200);
      
      if (categoriaFilter) {
        documenti = documenti.filter(doc => doc.categoria_principale === categoriaFilter);
      }
      
      if (cantiereFilter) {
        documenti = documenti.filter(doc => {
          if (doc.entita_collegata_id === cantiereFilter) return true;
          let docEc = doc.entita_collegate;
          if (typeof docEc === 'string') { try { docEc = JSON.parse(docEc); } catch { docEc = []; } }
          if (Array.isArray(docEc) && docEc.some(e => e.entita_id === cantiereFilter)) return true;
          return false;
        });
      }
      
      if (dataInizioFilter) {
        documenti = documenti.filter(doc => 
          doc.data_emissione && doc.data_emissione >= dataInizioFilter
        );
      }
      if (dataFineFilter) {
        documenti = documenti.filter(doc => 
          doc.data_emissione && doc.data_emissione <= dataFineFilter
        );
      }
      
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        documenti = documenti.filter(doc => 
          doc.nome_documento?.toLowerCase().includes(term) ||
          doc.descrizione?.toLowerCase().includes(term) ||
          doc.numero_documento?.toLowerCase().includes(term) ||
          doc.emittente?.toLowerCase().includes(term) ||
          (searchInContent && doc.testo_estratto?.toLowerCase().includes(term))
        );
      }
      
      if (tagFilter) {
        documenti = documenti.filter(doc => 
          doc.tags?.some(tag => tag.toLowerCase().includes(tagFilter.toLowerCase()))
        );
      }
      
      setRisultati(documenti);
      toast.success(`Trovati ${documenti.length} documenti`);
    } catch (error) {
      console.error("Errore ricerca:", error);
      toast.error("Errore durante la ricerca");
    } finally {
      setIsSearching(false);
    }
  }, [searchTerm, categoriaFilter, dataInizioFilter, dataFineFilter, cantiereFilter, tagFilter, searchInContent]);

  const handleReset = useCallback(() => {
    setSearchTerm("");
    setCategoriaFilter("");
    setDataInizioFilter("");
    setDataFineFilter("");
    setCantiereFilter("");
    setTagFilter("");
    setSearchInContent(false);
    setRisultati([]);
  }, []);

  return (
    <div className="space-y-6">
      {/* Filtri Ricerca */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Ricerca Avanzata Documenti
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Cerca nel nome/descrizione/contenuto</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="es. permesso, fattura, contratto..."
                  className="pl-10"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="searchContent"
                  checked={searchInContent}
                  onChange={(e) => setSearchInContent(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="searchContent" className="text-sm font-normal cursor-pointer">
                  Cerca anche nel contenuto estratto (OCR)
                </Label>
              </div>
            </div>

            <div>
              <Label>Categoria</Label>
              <Select value={categoriaFilter || "all"} onValueChange={(v) => setCategoriaFilter(v === "all" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tutte le categorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le categorie</SelectItem>
                  {Object.entries(categorieDocumenti).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Cantiere</Label>
              <Select value={cantiereFilter || "all"} onValueChange={(v) => setCantiereFilter(v === "all" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tutti i cantieri" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i cantieri</SelectItem>
                  {cantieri.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.denominazione}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Data Emissione Da</Label>
              <Input
                type="date"
                value={dataInizioFilter}
                onChange={(e) => setDataInizioFilter(e.target.value)}
              />
            </div>

            <div>
              <Label>Data Emissione A</Label>
              <Input
                type="date"
                value={dataFineFilter}
                onChange={(e) => setDataFineFilter(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Cerca per Tag</Label>
            <Input
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              placeholder="es. urgente"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button 
              onClick={handleSearch} 
              className=""
              disabled={isSearching}
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Ricerca...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Cerca
                </>
              )}
            </Button>
            <Button 
              type="button"
              variant="outline" 
              onClick={handleReset}
            >
              <X className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Risultati */}
      {risultati.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Risultati ({risultati.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {risultati.map(doc => {
                const cantiereNomi = getCantiereNomi(doc);
                
                return (
                  <div 
                    key={doc.id} 
                    className="p-4 border rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => onDocumentoSelect?.(doc)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-5 h-5 text-slate-500 flex-shrink-0" />
                          <h4 className="font-semibold text-slate-900 truncate">{doc.nome_documento}</h4>
                          {doc.categoria_principale && (
                            <Badge variant="secondary" className={categorieDocumenti[doc.categoria_principale]?.color}>
                              {categorieDocumenti[doc.categoria_principale]?.label}
                            </Badge>
                          )}
                        </div>
                        
                        {doc.descrizione && (
                          <p className="text-sm text-slate-600 mb-2 line-clamp-2">{doc.descrizione}</p>
                        )}
                        
                        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                          {doc.data_emissione && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(doc.data_emissione), 'dd/MM/yyyy')}
                            </span>
                          )}
                          {doc.emittente && (
                            <span>• Emittente: {doc.emittente}</span>
                          )}
                          {doc.numero_documento && (
                            <span>• N. {doc.numero_documento}</span>
                          )}
                        </div>

                        {cantiereNomi.length > 0 && (
                          <div className="flex items-center gap-2 mt-2">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            <div className="flex flex-wrap gap-1">
                              {cantiereNomi.map((nome, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {nome}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {doc.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {doc.tags.map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs bg-slate-100 text-slate-700">
                                <Tag className="w-3 h-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {doc.ocr_completato && searchInContent && searchTerm && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                            <p className="font-medium text-yellow-900 mb-1">Trovato nel contenuto:</p>
                            <p className="text-yellow-800 line-clamp-2">
                              {doc.testo_estratto?.substring(0, 200)}...
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 flex-shrink-0">
                        {(doc.file_uri || doc.cloud_file_url) && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDocument(doc);
                              }}
                              title="Visualizza"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadDocument(doc);
                              }}
                              title="Scarica"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {risultati.length === 0 && searchTerm && !isSearching && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Nessun documento trovato</h3>
            <p className="text-slate-600">Prova a modificare i criteri di ricerca</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}