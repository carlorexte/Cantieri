import React, { useState } from "react";
import { UploadPrivateFile } from '@/api/integrations';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, X, FileText, Folder, UploadCloud, Loader2 } from "lucide-react";
import { toast } from "sonner";

const tipoDocumentoOptions = [
  { value: "durc", label: "DURC", categoria: "Contratto e Atti" },
  { value: "visure", label: "Visure", categoria: "Contratto e Atti" },
  { value: "visure_cciaa", label: "Certificato CCIAA", categoria: "Contratto e Atti" },
  { value: "certificazioni_soa", label: "Certificazioni SOA", categoria: "Contratto e Atti" },
  { value: "denuncia_inail", label: "Denuncia INAIL", categoria: "Contratto e Atti" },
  { value: "contratto_appalto", label: "Contratto Appalto", categoria: "Contratto e Atti" },
  { value: "contratto_esecutrice", label: "Contratto Esecutrice", categoria: "Contratto e Atti" },
  { value: "contratto_subappaltatori", label: "Contratto Subappaltatori", categoria: "Contratto e Atti" },
  { value: "consortile", label: "Consortile", categoria: "Contratto e Atti" },
  { value: "amministrativa_documentazione_gara", label: "Documentazione di Gara", categoria: "Amministrativa" },
  { value: "amministrativa_inviti_bandi", label: "Inviti - Bandi", categoria: "Amministrativa" },
  { value: "amministrativa_offerta", label: "Offerta", categoria: "Amministrativa" },
  { value: "amministrativa_delibere_aggiudicazione", label: "Delibere Aggiudicazione", categoria: "Amministrativa" },
  { value: "polizze_car", label: "Polizza CAR", categoria: "Polizze" },
  { value: "polizze_decennale", label: "Polizza Decennale Postuma", categoria: "Polizze" },
  { value: "polizze_rct", label: "Polizza RCT", categoria: "Polizze" },
  { value: "tecnica_capitolati", label: "Capitolati", categoria: "Tecnica" },
  { value: "tecnica_computo_metrico", label: "Computo Metrico", categoria: "Tecnica" },
  { value: "tecnica_elaborati_grafici", label: "Elaborati Grafici", categoria: "Tecnica" },
  { value: "cantiere_verbale_consegna", label: "Verbale di Consegna", categoria: "Cantiere" },
  { value: "cantiere_ultimazione_collaudi", label: "Ultimazione e Collaudi", categoria: "Cantiere" },
  { value: "sicurezza_pos_esecutrice", label: "POS Esecutrice", categoria: "Sicurezza" },
  { value: "sicurezza_pos_subappaltatrice", label: "POS Subappaltatrice", categoria: "Sicurezza" },
  { value: "economica_sal", label: "SAL", categoria: "Economica" },
  { value: "economica_fatture", label: "Fatture", categoria: "Economica" },
  { value: "altro", label: "Altro", categoria: "Generale" }
];

const strutturaNAS = {
  "01_amministrativa": {
    label: "01. Amministrativa",
    sottocartelle: {
      "documentazione_gara": "Documentazione di Gara",
      "inviti_bandi": "Inviti - Bandi",
      "offerta": "Offerta",
      "verbali_gara": "Verbali di Gara",
      "delibere_aggiudicazione": "Delibere aggiudicazione"
    }
  },
  "02_contratto_atti": {
    label: "02. Contratto e Atti",
    sottocartelle: {
      "01_contratto_appalto": "01 Contratto Appalto",
      "02_contratto_esecutrice": "02 Contratto Esecutrice",
      "03_contratto_subappaltatori": "03 Contratto Subappaltatori",
      "consortile": "Consortile",
      "delibera_cdm": "Delibera CDM Assegnazione",
      "atti_aggiuntivi": "Atti aggiuntivi - Varianti"
    }
  },
  "03_contratti_secondari": {
    label: "03. Contratti Secondari",
    sottocartelle: {
      "fornitori": "Fornitori",
      "noleggi": "Noleggi"
    }
  },
  "04_polizze": {
    label: "04. Polizze",
    sottocartelle: {
      "car": "CAR",
      "decennale": "Decennale Postuma",
      "rct": "RCT"
    }
  },
  "05_anticipazione": {
    label: "05. Anticipazione",
    sottocartelle: {
      "richiesta": "Richiesta"
    }
  },
  "06_tecnica": {
    label: "06. Tecnica",
    sottocartelle: {
      "capitolati": "Capitolati",
      "computo_metrico": "Computo Metrico",
      "elaborati_grafici": "Elaborati Grafici",
      "permessi_autorizzazioni": "Permessi e Autorizzazioni",
      "relazioni_tecniche": "Relazioni Tecniche",
      "varianti": "Varianti"
    }
  },
  "07_cantiere": {
    label: "07. Cantiere",
    sottocartelle: {
      "verbale_consegna": "01 - Verbale di Consegna",
      "verbali_sospensione": "02 - Verbali Sospensione - Ripresa",
      "ultimazione_collaudi": "03 - Ultimazione e Collaudi",
      "cronoprogramma": "Cronoprogramma",
      "relazioni_avanzamento": "Relazioni esecutrice su avanzamento lavori",
      "forniture": "Forniture",
      "giornale_lavori": "Giornale dei Lavori",
      "ordini_servizio": "Ordini di Servizio",
      "report_fotografici": "Report Fotografici"
    }
  },
  "08_sicurezza": {
    label: "08. Sicurezza",
    sottocartelle: {
      "pos_esecutrice": "01 - Impresa Esecutrice",
      "pos_subappaltatrice": "02 - Subappaltatrice",
      "notifiche_preliminari": "Notifiche Preliminari",
      "psc": "PSC - Piano Sicurezza Coordinamento",
      "sopralluoghi_verbali": "Sopralluoghi e Verbali"
    }
  },
  "09_corrispondenza_privati": {
    label: "09. Corrispondenza tra Privati",
    sottocartelle: {
      "collaboratori": "Collaboratori",
      "fornitori": "Fornitori",
      "subappaltatori": "Subappaltatori"
    }
  },
  "10_corrispondenza_stazione": {
    label: "10. Corrispondenza con Stazione Appaltante",
    sottocartelle: {
      "direzione_lavori": "Direzione Lavori",
      "rup": "RUP",
      "ufficio_amministrativo": "Ufficio Amministrativo",
      "ufficio_tecnico": "Ufficio Tecnico"
    }
  },
  "11_legale": {
    label: "11. Legale",
    sottocartelle: {
      "contenziosi": "contenziosi"
    }
  },
  "12_economica": {
    label: "12. Economica",
    sottocartelle: {
      "fornitori": "Fornitori",
      "esecutrice": "Impresa Esecutrice",
      "subappaltatrice": "Impresa Subappaltatrice",
      "stazione_appaltante": "Stazione Appaltante"
    }
  },
  "13_collegio": {
    label: "13. Collegio Consultivo Tecnico",
    sottocartelle: {}
  },
  "14_archivio": {
    label: "14. Archivio Documenti Superati",
    sottocartelle: {}
  }
};

export default function DocumentoForm({ documento, cantieri, soci, subappalti, sals, onSubmit, onCancel, initialEntity }) {
  const [formData, setFormData] = useState(documento || {
    nome_documento: "",
    tipo_documento: "",
    descrizione: "",
    percorso_nas: "",
    file_uri: "",
    data_emissione: "",
    data_scadenza: "",
    entita_collegata_id: initialEntity?.id || "",
    entita_collegata_tipo: initialEntity?.type || "generale",
    numero_documento: "",
    emittente: "",
    note: ""
  });

  const [categoriaSelezionata, setCategoriaSelezionata] = useState("");
  const [sottocartella, setSottocartella] = useState("");
  const [fileToUpload, setFileToUpload] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCategoriaChange = (categoria) => {
    setCategoriaSelezionata(categoria);
    setSottocartella("");
    generaPercorsoNAS(categoria, "", formData.entita_collegata_id, formData.nome_documento);
  };

  const handleSottocartellaChange = (sottocart) => {
    setSottocartella(sottocart);
    generaPercorsoNAS(categoriaSelezionata, sottocart, formData.entita_collegata_id, formData.nome_documento);
  };

  const generaPercorsoNAS = (categoria, sottocart, entitaId, nomeFile) => {
    let basePath = "\\\\NAS_SERVER\\";

    // Determina il nome dell'entità e la root path
    let nomeEntita = "Generale";
    if (formData.entita_collegata_tipo === "azienda") {
      basePath += "Azienda\\";
    } else if (formData.entita_collegata_tipo === "cantiere") {
      const cantiere = cantieri?.find(c => c.id === entitaId);
      nomeEntita = cantiere ? (cantiere.oggetto_lavori || cantiere.denominazione) : "Cantiere";
      basePath += `Cantieri\\${nomeEntita}\\`;
    } else if (formData.entita_collegata_tipo === "socio_consorzio") {
      const socio = soci?.find(s => s.id === entitaId);
      nomeEntita = socio ? socio.ragione_sociale : "Socio";
      basePath += `Cantieri\\${nomeEntita}\\`;
    } else if (formData.entita_collegata_tipo === "subappalto") {
      const subappalto = subappalti?.find(s => s.id === entitaId);
      nomeEntita = subappalto ? subappalto.ragione_sociale : "Subappalto";
      basePath += `Cantieri\\${nomeEntita}\\`;
    } else if (formData.entita_collegata_tipo === "sal") {
      const sal = sals?.find(s => s.id === entitaId);
      nomeEntita = sal ? `SAL_${sal.numero_progressivo || entitaId}` : "SAL";
      // Assuming SALs are nested under a Cantiere's documents or a specific SAL folder
      // For now, let's put it under a generic SAL folder. Adjust as per actual NAS structure
      basePath += `SAL_Documents\\${nomeEntita}\\`;
    } else { // "generale"
      basePath += "Generale\\";
    }

    if (strutturaNAS[categoria]) {
      basePath += `${strutturaNAS[categoria].label}\\`;

      if (sottocart && strutturaNAS[categoria].sottocartelle[sottocart]) {
        basePath += `${strutturaNAS[categoria].sottocartelle[sottocart]}\\`;
      }
    }

    basePath += nomeFile;
    if (nomeFile && !nomeFile.includes('.')) {
      basePath += ".pdf"; // Estensione di default
    }

    handleChange("percorso_nas", basePath);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);

    let finalDocumentData = { ...formData };

    try {
      if (fileToUpload) {
        toast.info("Caricamento del file su cloud...", { duration: 5000 });
        const { file_uri } = await UploadPrivateFile({ file: fileToUpload });
        finalDocumentData.file_uri = file_uri;
        toast.success("File caricato su cloud con successo!");
      } else if (documento?.file_uri) {
        // Keep existing URI if not changing the file
        finalDocumentData.file_uri = documento.file_uri;
      }

      await onSubmit(finalDocumentData);

    } catch (error) {
      console.error("Errore nel processo di salvataggio:", error);
      toast.error("Si è verificato un errore durante il salvataggio: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const getEntitaOptions = () => {
    switch (formData.entita_collegata_tipo) {
      case "cantiere":
        return cantieri?.map(c => ({ id: c.id, nome: c.oggetto_lavori || c.denominazione })) || [];
      case "socio_consorzio":
        return soci?.map(s => ({ id: s.id, nome: s.ragione_sociale })) || [];
      case "subappalto":
        return subappalti?.map(s => ({ id: s.id, nome: s.ragione_sociale })) || [];
      case "sal":
        return sals?.map(s => ({ id: s.id, nome: `SAL ${s.numero_progressivo} - ${s.data_emissione || ''}` })) || [];
      default:
        return [];
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
              <Label htmlFor="nome_documento">Nome Documento *</Label>
              <Input
                id="nome_documento"
                value={formData.nome_documento}
                onChange={(e) => {
                  handleChange("nome_documento", e.target.value);
                  generaPercorsoNAS(categoriaSelezionata, sottocartella, formData.entita_collegata_id, e.target.value);
                }}
                placeholder="es. DURC Ditta ABC"
                required
              />
            </div>
            <div>
              <Label htmlFor="tipo_documento">Tipo Documento *</Label>
              <Select value={formData.tipo_documento} onValueChange={(value) => handleChange("tipo_documento", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona tipo..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {tipoDocumentoOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-slate-500">{option.categoria}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="file_upload">Backup su Cloud</Label>
            <div className="flex items-center gap-2 p-2 border rounded-md">
              <UploadCloud className="w-5 h-5 text-slate-500" />
              <Input id="file_upload" type="file" onChange={(e) => setFileToUpload(e.target.files[0])} className="border-0 flex-1 shadow-none p-0 h-auto" />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {formData.file_uri ? `File attuale caricato. Selezionane un altro per sostituirlo.` : "Seleziona un file per creare un backup su cloud."}
            </p>
          </div>
          <div>
            <Label htmlFor="descrizione">Descrizione</Label>
            <Textarea
              id="descrizione"
              value={formData.descrizione}
              onChange={(e) => handleChange("descrizione", e.target.value)}
              placeholder="Descrizione dettagliata del documento"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Folder className="w-5 h-5" />
            Posizionamento su NAS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="entita_collegata_tipo">Collega a</Label>
              <Select disabled={false} value={formData.entita_collegata_tipo} onValueChange={(value) => {
                handleChange("entita_collegata_tipo", value);
                handleChange("entita_collegata_id", "");
                generaPercorsoNAS(categoriaSelezionata, sottocartella, "", formData.nome_documento);
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="generale">Generale (non collegato)</SelectItem>
                  <SelectItem value="cantiere">Cantiere</SelectItem>
                  <SelectItem value="socio_consorzio">Socio Consorzio</SelectItem>
                  <SelectItem value="subappalto">Subappalto</SelectItem>
                  <SelectItem value="azienda">Profilo Azienda</SelectItem>
                  <SelectItem value="sal">SAL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.entita_collegata_tipo !== "generale" && formData.entita_collegata_tipo !== "azienda" && !initialEntity?.id && (
              <div>
                <Label htmlFor="entita_collegata_id">Seleziona {formData.entita_collegata_tipo.replace('_', ' ')}</Label>
                <Select value={formData.entita_collegata_id} onValueChange={(value) => {
                  handleChange("entita_collegata_id", value);
                  generaPercorsoNAS(categoriaSelezionata, sottocartella, value, formData.nome_documento);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona..." />
                  </SelectTrigger>
                  <SelectContent>
                    {getEntitaOptions().map(option => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {initialEntity?.id && (
              <div className="pt-7 font-medium text-slate-800">{initialEntity.name || 'Cantiere Selezionato'}</div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="categoria">Categoria Principale</Label>
              <Select value={categoriaSelezionata} onValueChange={handleCategoriaChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona categoria..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(strutturaNAS).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {categoriaSelezionata && Object.keys(strutturaNAS[categoriaSelezionata]?.sottocartelle || {}).length > 0 && (
              <div>
                <Label htmlFor="sottocartella">Sottocartella</Label>
                <Select value={sottocartella} onValueChange={handleSottocartellaChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona sottocartella..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(strutturaNAS[categoriaSelezionata].sottocartelle).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="percorso_nas">Percorso NAS Generato *</Label>
            <Input
              id="percorso_nas"
              value={formData.percorso_nas}
              onChange={(e) => handleChange("percorso_nas", e.target.value)}
              placeholder="Il percorso sarà generato automaticamente..."
              required
              className="font-mono text-sm"
            />
            <p className="text-xs text-slate-500 mt-1">
              L'utente è responsabile di salvare manualmente il documento in questo percorso sul NAS.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="data_emissione">Data Emissione</Label>
              <Input
                id="data_emissione"
                type="date"
                value={formData.data_emissione || ''}
                onChange={(e) => handleChange("data_emissione", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="data_scadenza">Data Scadenza</Label>
              <Input
                id="data_scadenza"
                type="date"
                value={formData.data_scadenza || ''}
                onChange={(e) => handleChange("data_scadenza", e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-1">
                Importante per il monitoraggio scadenze.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informazioni Aggiuntive</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="numero_documento">Numero Documento</Label>
              <Input
                id="numero_documento"
                value={formData.numero_documento}
                onChange={(e) => handleChange("numero_documento", e.target.value)}
                placeholder="es. DURC-2024-001"
              />
            </div>
            <div>
              <Label htmlFor="emittente">Emittente</Label>
              <Input
                id="emittente"
                value={formData.emittente}
                onChange={(e) => handleChange("emittente", e.target.value)}
                placeholder="es. INPS, Camera di Commercio"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              value={formData.note}
              onChange={(e) => handleChange("note", e.target.value)}
              placeholder="Note aggiuntive..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isUploading}>
          <X className="w-4 h-4 mr-2" />
          Annulla
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isUploading}>
          {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {isUploading ? "Salvataggio..." : (documento ? "Aggiorna" : "Salva") + " Documento"}
        </Button>
      </div>
    </form>
  );
}