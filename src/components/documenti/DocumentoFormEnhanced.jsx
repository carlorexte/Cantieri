import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, X, FileText, Folder, UploadCloud, Loader2, Search, Plus, Tag, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

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

const tipoDocumentoOptions = [
  { value: "durc", label: "DURC", categoria: "certificazioni" },
  { value: "visure", label: "Visure", categoria: "certificazioni" },
  { value: "visure_cciaa", label: "Certificato CCIAA", categoria: "certificazioni" },
  { value: "certificazioni_soa", label: "Certificazioni SOA", categoria: "certificazioni" },
  { value: "denuncia_inail", label: "Denuncia INAIL", categoria: "certificazioni" },
  { value: "contratto_appalto", label: "Contratto Appalto", categoria: "contratti" },
  { value: "contratto_esecutrice", label: "Contratto Esecutrice", categoria: "contratti" },
  { value: "contratto_subappaltatori", label: "Contratto Subappaltatori", categoria: "contratti" },
  { value: "consortile", label: "Consortile", categoria: "contratti" },
  { value: "amministrativa_documentazione_gara", label: "Documentazione di Gara", categoria: "altro" },
  { value: "amministrativa_inviti_bandi", label: "Inviti - Bandi", categoria: "altro" },
  { value: "amministrativa_offerta", label: "Offerta", categoria: "altro" },
  { value: "amministrativa_delibere_aggiudicazione", label: "Delibere Aggiudicazione", categoria: "altro" },
  { value: "polizze_car", label: "Polizza CAR", categoria: "polizze" },
  { value: "polizze_decennale", label: "Polizza Decennale Postuma", categoria: "polizze" },
  { value: "polizze_rct", label: "Polizza RCT", categoria: "polizze" },
  { value: "tecnica_capitolati", label: "Capitolati", categoria: "tecnici" },
  { value: "tecnica_computo_metrico", label: "Computo Metrico", categoria: "tecnici" },
  { value: "tecnica_elaborati_grafici", label: "Elaborati Grafici", categoria: "tecnici" },
  { value: "cantiere_verbale_consegna", label: "Verbale di Consegna", categoria: "altro" },
  { value: "cantiere_ultimazione_collaudi", label: "Ultimazione e Collaudi", categoria: "altro" },
  { value: "sicurezza_pos_esecutrice", label: "POS Esecutrice", categoria: "sicurezza" },
  { value: "sicurezza_pos_subappaltatrice", label: "POS Subappaltatrice", categoria: "sicurezza" },
  { value: "economica_sal", label: "SAL", categoria: "sal" },
  { value: "economica_fatture", label: "Fatture", categoria: "fatture" },
  { value: "altro", label: "Altro", categoria: "altro" }
];

export default function DocumentoFormEnhanced({ documento, onSubmit, onCancel, initialEntity }) {
  const [formData, setFormData] = useState({
    nome_documento: "",
    categoria_principale: "",
    tipo_documento: "",
    descrizione: "",
    percorso_nas: "",
    file_uri: "",
    data_emissione: "",
    data_scadenza: "",
    entita_collegate: [],
    numero_documento: "",
    emittente: "",
    tags: [],
    note: "",
    ...(documento || {})
  });

  const [fileToUpload, setFileToUpload] = useState(null);
  const [newVersionFile, setNewVersionFile] = useState(null); // State for new version file
  const [isUploading, setIsUploading] = useState(false);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [showVersionUpload, setShowVersionUpload] = useState(false);
  const [cantieri, setCantieri] = useState([]);
  const [imprese, setImprese] = useState([]);
  const [selectedEntities, setSelectedEntities] = useState(new Set());

  useEffect(() => {
    loadEntities();
    
    // Inizializza entità selezionate
    if (documento?.entita_collegate?.length > 0) {
      const initialSelected = new Set(
        documento.entita_collegate.map(e => `${e.entita_tipo}:${e.entita_id}`)
      );
      setSelectedEntities(initialSelected);
    } else if (initialEntity?.id && initialEntity?.type) {
      setSelectedEntities(new Set([`${initialEntity.type}:${initialEntity.id}`]));
    }
  }, [documento, initialEntity]);

  const loadEntities = async () => {
    try {
      const [cantieriData, impreseData] = await Promise.all([
        base44.entities.Cantiere.list("-created_date", 100),
        base44.entities.Impresa.list("-created_date", 100)
      ]);
      setCantieri(cantieriData);
      setImprese(impreseData);
    } catch (error) {
      console.error("Errore caricamento entità:", error);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-imposta categoria_principale basata su tipo_documento
    if (field === "tipo_documento") {
      const tipoOption = tipoDocumentoOptions.find(opt => opt.value === value);
      if (tipoOption && !formData.categoria_principale) {
        setFormData(prev => ({
          ...prev,
          categoria_principale: tipoOption.categoria
        }));
      }
    }
  };

  const toggleEntity = (tipo, id) => {
    const key = `${tipo}:${id}`;
    setSelectedEntities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tagToRemove)
    }));
  };

  const handleExtractText = async (fileUri) => {
    setIsExtractingText(true);
    try {
      const { extractTextFromDocument } = await import("@/functions/extractTextFromDocument");
      const result = await extractTextFromDocument({ 
        file_uri: fileUri,
        documento_id: documento?.id
      });
      
      if (result.data.success) {
        toast.success("Testo estratto con successo!");
        setFormData(prev => ({
          ...prev,
          testo_estratto: result.data.testo_estratto,
          ocr_completato: true
        }));
      } else {
        toast.error("Impossibile estrarre il testo dal documento");
      }
    } catch (error) {
      console.error("Errore estrazione testo:", error);
      toast.error("Errore durante l'estrazione del testo");
    } finally {
      setIsExtractingText(false);
    }
  };

  const handleAutoCategorize = async (fileUri) => {
    setIsCategorizing(true);
    try {
      const { categorizzaDocumento } = await import("@/functions/categorizzaDocumento");
      toast.info("Analisi del documento in corso...", { duration: 3000 });
      
      const result = await categorizzaDocumento({
        file_uri: fileUri,
        nome_documento: formData.nome_documento,
        descrizione: formData.descrizione,
        testo_estratto: formData.testo_estratto // Pass extracted text for better categorization
      });

      if (result.data.categoria_principale && result.data.tipo_documento) {
        setFormData(prev => ({
          ...prev,
          categoria_principale: result.data.categoria_principale,
          tipo_documento: result.data.tipo_documento
        }));
        toast.success(`Categorizzazione completata! ${result.data.spiegazione || ''}`);
      } else {
        toast.error("Impossibile categorizzare il documento");
      }
    } catch (error) {
      console.error("Errore categorizzazione:", error);
      toast.error("Errore durante la categorizzazione automatica");
    } finally {
      setIsCategorizing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);

    let finalDocumentData = { ...formData };

    try {
      // Handling New Version Upload
      if (newVersionFile) {
        toast.info("Caricamento nuova versione...", { duration: 3000 });
        const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: newVersionFile });
        
        // Push old version to history
        const oldVersion = {
          numero: (formData.versioni?.length || 0) + 1,
          file_uri: formData.file_uri,
          data_caricamento: new Date().toISOString(),
          nome_file: "Versione Precedente", // You might want to store original filenames if available
          note: "Archiviato automaticamente al caricamento nuova versione",
          // utente_id: currentUser?.id // Idealmente
        };
        
        finalDocumentData.versioni = [...(formData.versioni || []), oldVersion];
        finalDocumentData.file_uri = file_uri;
        finalDocumentData.ocr_completato = false; // Reset OCR status for new file
        
        // Auto-extract text for new version
        try {
          const { extractTextFromDocument } = await import("@/functions/extractTextFromDocument");
          const result = await extractTextFromDocument({ file_uri: file_uri });
          if (result.data.success) {
            finalDocumentData.testo_estratto = result.data.testo_estratto;
            finalDocumentData.ocr_completato = true;
          }
        } catch (e) { console.error("OCR Error new version", e); }

      } else if (fileToUpload) {
        // Standard initial upload or replacement without versioning (if needed, but prefer versioning for updates)
        toast.info("Caricamento del file...", { duration: 3000 });
        const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: fileToUpload });
        finalDocumentData.file_uri = file_uri;
        
        // Estrai testo automaticamente dopo upload
        toast.info("Estrazione testo dal documento...", { duration: 5000 });
        try {
          const { extractTextFromDocument } = await import("@/functions/extractTextFromDocument");
          const result = await extractTextFromDocument({ 
            file_uri: file_uri
          });
          
          if (result.data.success) {
            finalDocumentData.testo_estratto = result.data.testo_estratto;
            finalDocumentData.ocr_completato = true;
          }
        } catch (ocrError) {
          console.error("Errore OCR:", ocrError);
        }
      }

      // Converte selectedEntities in entita_collegate array
      const entitaCollegate = Array.from(selectedEntities).map(key => {
        const [tipo, id] = key.split(':');
        return { entita_tipo: tipo, entita_id: id };
      });
      
      finalDocumentData.entita_collegate = entitaCollegate;
      
      // Mantieni compatibilità con vecchio sistema
      if (entitaCollegate.length > 0) {
        finalDocumentData.entita_collegata_tipo = entitaCollegate[0].entita_tipo;
        finalDocumentData.entita_collegata_id = entitaCollegate[0].entita_id;
      }

      await onSubmit(finalDocumentData);

    } catch (error) {
      console.error("Errore nel processo di salvataggio:", error);
      toast.error("Errore durante il salvataggio: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Info Base */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Informazioni Documento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nome Documento *</Label>
              <Input
                value={formData.nome_documento}
                onChange={(e) => handleChange("nome_documento", e.target.value)}
                placeholder="es. Permesso di Costruire 2024"
                required
              />
            </div>
            <div>
              <Label>Categoria Principale *</Label>
              <Select 
                value={formData.categoria_principale} 
                onValueChange={(value) => handleChange("categoria_principale", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona categoria..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categorieDocumenti).map(([key, val]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={val.color}>
                          {val.label}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Tipo Documento *</Label>
            <Select value={formData.tipo_documento} onValueChange={(value) => handleChange("tipo_documento", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona tipo..." />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {tipoDocumentoOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <span>{option.label}</span>
                      <Badge variant="outline" className="text-xs">
                        {categorieDocumenti[option.categoria]?.label}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Upload File</Label>
            <div className="flex items-center gap-2 p-2 border rounded-md">
              <UploadCloud className="w-5 h-5 text-slate-500" />
              <Input 
                type="file" 
                onChange={(e) => setFileToUpload(e.target.files[0])} 
                className="border-0 flex-1 shadow-none p-0 h-auto" 
              />
            </div>
            {formData.file_uri && !fileToUpload && !newVersionFile && (
              <div className="flex flex-col gap-2 mt-2 w-full">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="bg-green-50 text-green-700">
                    File corrente presente
                  </Badge>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowVersionUpload(!showVersionUpload)}
                    className="ml-auto"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Carica Nuova Versione
                  </Button>
                </div>
                
                {showVersionUpload && (
                  <div className="p-3 border border-indigo-100 bg-indigo-50 rounded-md">
                    <Label className="text-indigo-900 mb-1">Seleziona file per la nuova versione</Label>
                    <Input 
                      type="file" 
                      onChange={(e) => setNewVersionFile(e.target.files[0])} 
                      className="bg-white"
                    />
                    <p className="text-xs text-indigo-700 mt-1">
                      Il file corrente verrà salvato nello storico versioni.
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  {!formData.ocr_completato && (
                    <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleExtractText(formData.file_uri)}
                    disabled={isExtractingText}
                  >
                    {isExtractingText ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Estrazione...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Estrai Testo (OCR)
                      </>
                    )}
                  </Button>
                )}
                {(!formData.categoria_principale || !formData.tipo_documento) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAutoCategorize(formData.file_uri)}
                    disabled={isCategorizing}
                    className="gap-2"
                  >
                    {isCategorizing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analisi...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4" />
                        Auto-Categorizza
                      </>
                    )}
                  </Button>
                )}
                </div>
              </div>
            )}
          </div>

          <div>
            <Label>Descrizione</Label>
            <Textarea
              value={formData.descrizione}
              onChange={(e) => handleChange("descrizione", e.target.value)}
              placeholder="Descrizione dettagliata del documento"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Data Emissione</Label>
              <Input
                type="date"
                value={formData.data_emissione || ''}
                onChange={(e) => handleChange("data_emissione", e.target.value)}
              />
            </div>
            <div>
              <Label>Data Scadenza</Label>
              <Input
                type="date"
                value={formData.data_scadenza || ''}
                onChange={(e) => handleChange("data_scadenza", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Associazioni Multiple */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Folder className="w-5 h-5" />
            Associa a Cantieri/Entità (selezione multipla)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-3 block">Cantieri</Label>
            <div className="max-h-48 overflow-y-auto border rounded-lg p-3 space-y-2">
              {cantieri.map(cantiere => {
                const key = `cantiere:${cantiere.id}`;
                return (
                  <div key={cantiere.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedEntities.has(key)}
                      onCheckedChange={() => toggleEntity('cantiere', cantiere.id)}
                    />
                    <label className="text-sm cursor-pointer flex-1">
                      {cantiere.denominazione}
                      {cantiere.codice_cig && (
                        <span className="text-slate-500 ml-2">({cantiere.codice_cig})</span>
                      )}
                    </label>
                  </div>
                );
              })}
              {cantieri.length === 0 && (
                <p className="text-sm text-slate-500">Nessun cantiere disponibile</p>
              )}
            </div>
          </div>

          <div>
            <Label className="mb-3 block">Imprese</Label>
            <div className="max-h-48 overflow-y-auto border rounded-lg p-3 space-y-2">
              {imprese.map(impresa => {
                const key = `azienda:${impresa.id}`;
                return (
                  <div key={impresa.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedEntities.has(key)}
                      onCheckedChange={() => toggleEntity('azienda', impresa.id)}
                    />
                    <label className="text-sm cursor-pointer flex-1">
                      {impresa.ragione_sociale}
                      {impresa.partita_iva && (
                        <span className="text-slate-500 ml-2">({impresa.partita_iva})</span>
                      )}
                    </label>
                  </div>
                );
              })}
              {imprese.length === 0 && (
                <p className="text-sm text-slate-500">Nessuna impresa disponibile</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {Array.from(selectedEntities).map(key => {
              const [tipo, id] = key.split(':');
              let nome = '';
              if (tipo === 'cantiere') {
                nome = cantieri.find(c => c.id === id)?.denominazione || 'Cantiere';
              } else if (tipo === 'azienda') {
                nome = imprese.find(i => i.id === id)?.ragione_sociale || 'Impresa';
              }
              return (
                <Badge key={key} variant="secondary" className="bg-indigo-50 text-indigo-700">
                  {nome}
                  <button
                    type="button"
                    onClick={() => {
                      const [t, i] = key.split(':');
                      toggleEntity(t, i);
                    }}
                    className="ml-2 hover:text-indigo-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tags */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Tag e Classificazione
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Tags Personalizzati</Label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="es. urgente, revisione-2024..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" onClick={addTag} variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {formData.tags?.map(tag => (
                <Badge key={tag} variant="secondary" className="bg-slate-100 text-slate-700">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-2 hover:text-slate-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Numero Documento</Label>
              <Input
                value={formData.numero_documento}
                onChange={(e) => handleChange("numero_documento", e.target.value)}
                placeholder="es. PERM-2024-001"
              />
            </div>
            <div>
              <Label>Emittente</Label>
              <Input
                value={formData.emittente}
                onChange={(e) => handleChange("emittente", e.target.value)}
                placeholder="es. Comune di Milano"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Aggiuntive */}
      <Card>
        <CardHeader>
          <CardTitle>Informazioni Aggiuntive</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Percorso NAS *</Label>
            <Input
              value={formData.percorso_nas}
              onChange={(e) => handleChange("percorso_nas", e.target.value)}
              placeholder="\\\\NAS\\Cantieri\\..."
              required
              className="font-mono text-sm"
            />
          </div>

          <div>
            <Label>Note</Label>
            <Textarea
              value={formData.note}
              onChange={(e) => handleChange("note", e.target.value)}
              placeholder="Note aggiuntive..."
              rows={2}
            />
          </div>

          {formData.ocr_completato && formData.testo_estratto && (
            <div>
              <Label>Testo Estratto (OCR)</Label>
              <Textarea
                value={formData.testo_estratto}
                onChange={(e) => handleChange("testo_estratto", e.target.value)}
                rows={6}
                className="font-mono text-xs"
              />
              <p className="text-xs text-slate-500 mt-1">
                Testo estratto automaticamente - modificabile per correzioni
              </p>
            </div>
          )}

          {formData.versioni && formData.versioni.length > 0 && (
            <div>
              <Label className="mb-2 block">Storico Versioni</Label>
              <div className="border rounded-md divide-y">
                {formData.versioni.map((ver, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 flex justify-between items-center text-sm">
                    <div>
                      <span className="font-semibold text-slate-700">Versione {ver.numero}</span>
                      <span className="text-slate-500 mx-2">•</span>
                      <span className="text-slate-500">{new Date(ver.data_caricamento).toLocaleDateString()}</span>
                    </div>
                    {ver.file_uri && (
                      <Badge variant="outline" className="cursor-pointer hover:bg-slate-200" onClick={async () => {
                         const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: ver.file_uri, expires_in: 300 });
                         window.open(signed_url, '_blank');
                      }}>
                        Vedi File
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Azioni */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isUploading}>
          <X className="w-4 h-4 mr-2" />
          Annulla
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isUploading || isExtractingText || isCategorizing}>
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvataggio...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {documento ? "Aggiorna" : "Salva"} Documento
            </>
          )}
        </Button>
      </div>
    </form>
  );
}