import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { Upload, FileText, Loader2, X, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function PolizzaUploader({ 
  label, 
  value, 
  onChange, 
  numeroPolizza,
  onNumeroChange,
  dataScadenza,
  onDataScadenzaChange,
  durata,
  onDurataChange,
  agenzia,
  onAgenziaChange
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [fileToUpload, setFileToUpload] = useState(null);
  const [fileName, setFileName] = useState("");
  
  // Viewer states removed in favor of new tab opening

  const handleUpload = async () => {
    if (!fileToUpload) {
      toast.error("Seleziona un file da caricare");
      return;
    }

    setIsUploading(true);
    try {
      toast.info("Caricamento file in corso...");
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: fileToUpload });
      
      onChange(file_uri);
      setShowUploadDialog(false);
      setFileToUpload(null);
      setFileName("");
      toast.success("File caricato con successo!");
    } catch (error) {
      console.error("Errore upload:", error);
      toast.error("Errore durante il caricamento del file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleView = async () => {
    if (!value) return;
    
    try {
      toast.info("Caricamento anteprima...");
      const result = await base44.integrations.Core.CreateFileSignedUrl({ 
        file_uri: value,
        expires_in: 3600
      });
      
      if (!result.signed_url) throw new Error("Url non generato");

      const response = await fetch(result.signed_url);
      if (!response.ok) throw new Error("Download fallito");
      
      const blob = await response.blob();
      
      const ext = value.split('.').pop().toLowerCase();
      let type = blob.type;
      if (ext === 'pdf' || ext === 'p7m') type = 'application/pdf';
      else if (['jpg','jpeg','png'].includes(ext)) type = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
      
      const url = window.URL.createObjectURL(new Blob([blob], { type }));
      window.open(url, '_blank');

    } catch (error) {
      console.error("Errore apertura documento:", error);
      toast.error("Errore durante l'apertura del documento");
    }
  };

  const handleRemove = () => {
    if (window.confirm("Sei sicuro di voler rimuovere questo documento?")) {
      onChange("");
      toast.success("Documento rimosso");
    }
  };

  const getFileType = (uri) => {
    if (!uri) return 'pdf';
    const extension = uri.split('.').pop().toLowerCase();
    if (['pdf', 'p7m'].includes(extension)) return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) return 'image';
    return 'pdf';
  };

  return (
    <>
      <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">{label}</Label>
          {value ? (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleView}
                className="h-8"
              >
                <Eye className="w-4 h-4 mr-1" />
                Visualizza
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowUploadDialog(true)}
                className="h-8"
              >
                <Upload className="w-4 h-4 mr-1" />
                Sostituisci
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemove}
                className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowUploadDialog(true)}
              className="h-8"
            >
              <Upload className="w-4 h-4 mr-1" />
              Carica Documento
            </Button>
          )}
        </div>

        {value && (
          <div className="flex items-center gap-2 p-2 bg-white rounded border">
            <FileText className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-slate-600">Documento caricato</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-sm">Numero Polizza</Label>
            <Input
              value={numeroPolizza || ""}
              onChange={(e) => onNumeroChange(e.target.value)}
              placeholder="es. POL-2025-001"
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-sm">Data Scadenza</Label>
            <Input
              type="date"
              value={dataScadenza || ""}
              onChange={(e) => onDataScadenzaChange(e.target.value)}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-sm">Durata</Label>
            <Input
              value={durata || ""}
              onChange={(e) => onDurataChange(e.target.value)}
              placeholder="es. 2 anni"
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-sm">Agenzia</Label>
            <Input
              value={agenzia || ""}
              onChange={(e) => onAgenziaChange(e.target.value)}
              placeholder="Nome agenzia"
              className="h-9"
            />
          </div>
        </div>
      </div>

      {/* Dialog Upload */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Carica {label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="file-upload">Seleziona File</Label>
              <Input
                id="file-upload"
                type="file"
                onChange={(e) => {
                  const file = e.target.files[0];
                  setFileToUpload(file);
                  setFileName(file?.name || "");
                }}
                className="mt-2"
              />
              {fileName && (
                <p className="text-sm text-slate-600 mt-2">File selezionato: {fileName}</p>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowUploadDialog(false);
                  setFileToUpload(null);
                  setFileName("");
                }}
                disabled={isUploading}
              >
                Annulla
              </Button>
              <Button
                type="button"
                onClick={handleUpload}
                disabled={isUploading || !fileToUpload}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Caricamento...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Carica
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


    </>
  );
}