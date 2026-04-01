
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, X, Upload, FileText, Loader2 } from "lucide-react";
import { backendClient } from "@/api/backendClient";
import { toast } from "sonner";

export default function SalForm({ sal, cantiereId, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(sal || {
    cantiere_id: cantiereId,
    tipo_prestazione: "lavori",
    tipo_sal_dettaglio: "sal_progressivo",
    numero_sal: "",
    data_sal: new Date().toISOString().slice(0, 10),
    descrizione: "", // Added description field
    numero_fattura: "",
    data_fattura: "",
    imponibile: "",
    iva_percentuale: 10,
    iva_importo: "",
    totale_fattura: "",
    data_pagamento: "",
    importo_pagato: "",
    importo_anticipo_erogato: "",
    data_anticipo_erogato: "",
    file_uri: "",
    stato_pagamento: "da_fatturare",
    note: ""
  });

  const [fileToUpload, setFileToUpload] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const isAnticipazione = formData.tipo_sal_dettaglio === "anticipazione";

  const handleChange = (field, value) => {
    const newData = { ...formData, [field]: value };

    // Calcoli automatici per SAL progressivi/finali
    if (!isAnticipazione) {
      // Calcola IVA e totale basandosi sull'imponibile
      if (field === "imponibile" || field === "iva_percentuale") {
        const imp = parseFloat(newData.imponibile) || 0;
        const ivaPerc = parseFloat(newData.iva_percentuale) || 0;
        newData.iva_importo = (imp * ivaPerc / 100).toFixed(2);
        newData.totale_fattura = (imp + parseFloat(newData.iva_importo)).toFixed(2);
      }
    }

    setFormData(newData);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileToUpload(file);
      toast.info(`File selezionato: ${file.name}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      let finalData = { ...formData };

      // Upload file se presente
      if (fileToUpload) {
        toast.info("Caricamento documento in corso...");
        const { file_uri } = await backendClient.integrations.Core.UploadPrivateFile({ file: fileToUpload });
        finalData.file_uri = file_uri;
        toast.success("Documento caricato con successo!");
      }

      // Conversioni numeriche per SAL progressivi/finali
      if (!isAnticipazione) {
        // Converte e rimuove campi vuoti
        finalData.imponibile = finalData.imponibile !== "" ? parseFloat(finalData.imponibile) : null;
        finalData.iva_percentuale = finalData.iva_percentuale !== "" ? parseFloat(finalData.iva_percentuale) : null;
        finalData.iva_importo = finalData.iva_importo !== "" ? parseFloat(finalData.iva_importo) : null;
        finalData.totale_fattura = finalData.totale_fattura !== "" ? parseFloat(finalData.totale_fattura) : null;
        finalData.importo_pagato = finalData.importo_pagato !== "" ? parseFloat(finalData.importo_pagato) : null;
        
        if (finalData.numero_sal !== "") {
          finalData.numero_sal = parseInt(finalData.numero_sal);
        } else {
          finalData.numero_sal = null;
        }
        
        // Rimuovi campi anticipo per SAL progressivi/finali
        delete finalData.importo_anticipo_erogato;
        delete finalData.data_anticipo_erogato;
      } else {
        // Per le anticipazioni
        finalData.importo_anticipo_erogato = finalData.importo_anticipo_erogato !== "" ? parseFloat(finalData.importo_anticipo_erogato) : null;
        
        // Rimuovi campi SAL per anticipazioni
        delete finalData.imponibile;
        delete finalData.iva_percentuale;
        delete finalData.iva_importo;
        delete finalData.totale_fattura;
        delete finalData.importo_pagato;
        delete finalData.numero_sal;
        delete finalData.numero_fattura;
        delete finalData.data_fattura;
        delete finalData.data_pagamento;
        delete finalData.stato_pagamento;
      }

      // Rimuovi campi deprecati
      delete finalData.percentuale_avanzamento;
      delete finalData.importo_sal;
      delete finalData.importo_lordo;
      delete finalData.ritenuta_percentuale;
      delete finalData.ritenuta_importo;
      delete finalData.certificato_url;

      // Pulisci campi vuoti/null
      Object.keys(finalData).forEach(key => {
        if (finalData[key] === '' || finalData[key] === null || finalData[key] === undefined) {
          delete finalData[key];
        }
      });

      await onSubmit(finalData);
    } catch (error) {
      console.error("Errore salvataggio SAL:", error);
      toast.error("Errore durante il salvataggio del SAL");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-4">
      {/* Fase 1: Tipo Prestazione */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fase 1: Tipo Prestazione</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tipo_prestazione">Tipo Prestazione *</Label>
              <Select 
                value={formData.tipo_prestazione} 
                onValueChange={(v) => handleChange("tipo_prestazione", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lavori">Lavori</SelectItem>
                  <SelectItem value="progettazione">Progettazione</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="data_sal">Data SAL *</Label>
              <Input 
                id="data_sal" 
                type="date" 
                value={formData.data_sal} 
                onChange={(e) => handleChange("data_sal", e.target.value)} 
                required 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fase 2: Tipologia SAL */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fase 2: Tipologia SAL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="tipo_sal_dettaglio">Tipologia *</Label>
            <Select 
              value={formData.tipo_sal_dettaglio} 
              onValueChange={(v) => handleChange("tipo_sal_dettaglio", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anticipazione">Anticipazione</SelectItem>
                <SelectItem value="sal_progressivo">SAL Progressivo</SelectItem>
                <SelectItem value="sal_finale">SAL Finale</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.tipo_sal_dettaglio === "sal_progressivo" && (
            <div>
              <Label htmlFor="numero_sal">Numero SAL *</Label>
              <Input 
                id="numero_sal" 
                type="number" 
                value={formData.numero_sal} 
                onChange={(e) => handleChange("numero_sal", e.target.value)} 
                required 
                placeholder="es. 1, 2, 3..." 
              />
            </div>
          )}

          <div>
            <Label htmlFor="descrizione">Descrizione SAL</Label>
            <Textarea
              id="descrizione"
              value={formData.descrizione}
              onChange={(e) => handleChange("descrizione", e.target.value)}
              placeholder="es. Opere strutturali completate, Lavori di finitura..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Dati Economici - Anticipo */}
      {isAnticipazione && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dati Anticipo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="importo_anticipo_erogato">Importo Anticipo Erogato (€)</Label>
                <Input 
                  id="importo_anticipo_erogato" 
                  type="number" 
                  step="0.01" 
                  value={formData.importo_anticipo_erogato} 
                  onChange={(e) => handleChange("importo_anticipo_erogato", e.target.value)} 
                />
              </div>
              <div>
                <Label htmlFor="data_anticipo_erogato">Data Erogazione Anticipo</Label>
                <Input 
                  id="data_anticipo_erogato" 
                  type="date" 
                  value={formData.data_anticipo_erogato} 
                  onChange={(e) => handleChange("data_anticipo_erogato", e.target.value)} 
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dati Economici - SAL Progressivi/Finali */}
      {!isAnticipazione && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dati Economici</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="imponibile">Imponibile (€) *</Label>
                <Input 
                  id="imponibile" 
                  type="number" 
                  step="0.01" 
                  value={formData.imponibile} 
                  onChange={(e) => handleChange("imponibile", e.target.value)} 
                  required 
                />
              </div>
              <div>
                <Label htmlFor="iva_percentuale">IVA (%)</Label>
                <Input 
                  id="iva_percentuale" 
                  type="number" 
                  step="0.01" 
                  value={formData.iva_percentuale} 
                  onChange={(e) => handleChange("iva_percentuale", e.target.value)} 
                />
              </div>
              <div>
                <Label htmlFor="iva_importo">Importo IVA (€)</Label>
                <Input 
                  id="iva_importo" 
                  type="number" 
                  step="0.01" 
                  value={formData.iva_importo} 
                  readOnly 
                  className="bg-slate-50" 
                />
              </div>
            </div>

            <div>
              <Label htmlFor="totale_fattura">Totale Fattura (€)</Label>
              <Input 
                id="totale_fattura" 
                type="number" 
                step="0.01" 
                value={formData.totale_fattura} 
                readOnly 
                className="bg-slate-50 font-bold" 
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dati Fatturazione e Pagamento */}
      {!isAnticipazione && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fatturazione e Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="numero_fattura">Numero Fattura</Label>
                <Input 
                  id="numero_fattura" 
                  value={formData.numero_fattura} 
                  onChange={(e) => handleChange("numero_fattura", e.target.value)} 
                  placeholder="es. 228/24" 
                />
              </div>
              <div>
                <Label htmlFor="data_fattura">Data Fattura</Label>
                <Input 
                  id="data_fattura" 
                  type="date" 
                  value={formData.data_fattura} 
                  onChange={(e) => handleChange("data_fattura", e.target.value)} 
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="stato_pagamento">Stato Pagamento</Label>
                <Select 
                  value={formData.stato_pagamento} 
                  onValueChange={(v) => handleChange("stato_pagamento", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="da_fatturare">Da Fatturare</SelectItem>
                    <SelectItem value="fatturato">Fatturato</SelectItem>
                    <SelectItem value="incassato">Incassato</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="data_pagamento">Data Pagamento</Label>
                <Input 
                  id="data_pagamento" 
                  type="date" 
                  value={formData.data_pagamento} 
                  onChange={(e) => handleChange("data_pagamento", e.target.value)} 
                />
              </div>
              <div>
                <Label htmlFor="importo_pagato">Importo Pagato (€)</Label>
                <Input 
                  id="importo_pagato" 
                  type="number" 
                  step="0.01" 
                  value={formData.importo_pagato} 
                  onChange={(e) => handleChange("importo_pagato", e.target.value)} 
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Documento */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documento Certificato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="file_upload">Carica Documento (salvato nel cloud)</Label>
            <div className="flex items-center gap-2 p-2 border rounded-md">
              <Upload className="w-5 h-5 text-slate-500" />
              <Input 
                id="file_upload" 
                type="file" 
                onChange={handleFileSelect} 
                className="border-0 flex-1 shadow-none p-0 h-auto" 
              />
            </div>
            {formData.file_uri && (
              <div className="flex items-center gap-2 text-sm text-emerald-600 mt-2">
                <FileText className="w-4 h-4" />
                <span>Documento già caricato</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Note */}
      <div>
        <Label htmlFor="note">Note</Label>
        <Textarea 
          id="note" 
          value={formData.note} 
          onChange={(e) => handleChange("note", e.target.value)} 
          rows={3} 
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isUploading}>
          <X className="w-4 h-4 mr-2" />
          Annulla
        </Button>
        <Button type="submit" className="" disabled={isUploading}>
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvataggio...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {sal ? "Aggiorna" : "Salva"} SAL
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
