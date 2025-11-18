import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, Loader2, FileText, ZoomIn, ZoomOut } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function DocumentViewer({ documento, isOpen, onClose }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [fileType, setFileType] = useState(null);

  useEffect(() => {
    if (isOpen && documento) {
      loadDocument();
    }
    
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [isOpen, documento]);

  const loadDocument = async () => {
    if (!documento) return;
    
    setIsLoading(true);
    try {
      let signedUrl = documento.cloud_file_url;
      
      if (documento.file_uri) {
        const result = await base44.integrations.Core.CreateFileSignedUrl({
          file_uri: documento.file_uri,
          expires_in: 3600
        });
        signedUrl = result.signed_url;
      }

      if (!signedUrl) {
        toast.info(`Documento disponibile solo sul NAS: ${documento.percorso_nas || 'Non disponibile'}`);
        setIsLoading(false);
        return;
      }

      // Recupera il file come blob per preview e download
      const response = await fetch(signedUrl);
      if (!response.ok) throw new Error('Errore download documento');
      
      const blob = await response.blob();
      const detectedType = detectFileType(documento.nome_documento, documento.file_uri, blob.type);
      
      // Forza il tipo MIME corretto quando creiamo il blob URL
      let finalBlob = blob;
      if (detectedType === 'pdf' && blob.type !== 'application/pdf') {
        finalBlob = new Blob([blob], { type: 'application/pdf' });
      } else if (detectedType === 'image' && !blob.type.includes('image')) {
        finalBlob = new Blob([blob], { type: 'image/png' });
      }

      const url = URL.createObjectURL(finalBlob);
      setBlobUrl(url);
      setPreviewUrl(url);
    } catch (error) {
      console.error('Errore caricamento documento:', error);
      toast.error('Impossibile caricare il documento');
    } finally {
      setIsLoading(false);
    }
  };

  const detectFileType = (fileName, fileUri, mimeType) => {
    let type = 'pdf';
    
    if (mimeType?.includes('pdf')) {
      type = 'pdf';
    } else if (mimeType?.includes('image')) {
      type = 'image';
    } else {
      let extension = fileName?.split('.').pop()?.toLowerCase();
      
      if (!extension || extension === fileName?.toLowerCase()) {
        extension = fileUri?.split('.').pop()?.toLowerCase().split('?')[0];
      }
      
      if (['pdf'].includes(extension)) {
        type = 'pdf';
      } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(extension)) {
        type = 'image';
      } else {
        type = 'pdf';
      }
    }
    
    setFileType(type);
    return type;
  };

  const handleDownload = () => {
    if (!blobUrl || !documento) return;
    
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = documento.nome_documento || 'documento';
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success('Download avviato');
  };

  const handleOpenInNewTab = () => {
    if (!previewUrl) return;
    window.open(previewUrl, '_blank');
    toast.success('Documento aperto in una nuova scheda');
  };

  const renderContent = () => {
    if (!documento) {
      return (
        <div className="flex flex-col items-center justify-center h-96 text-slate-500">
          <FileText className="w-16 h-16 mb-4" />
          <p>Nessun documento selezionato</p>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      );
    }

    if (!previewUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-96 text-slate-500">
          <FileText className="w-16 h-16 mb-4" />
          <p>Documento non disponibile per l'anteprima</p>
          {documento.percorso_nas && (
            <p className="text-sm mt-2">Percorso NAS: {documento.percorso_nas}</p>
          )}
        </div>
      );
    }

    if (fileType === 'image') {
      return (
        <div className="w-full h-[80vh] bg-slate-100 rounded-lg flex items-center justify-center overflow-auto p-4">
          <img
            src={previewUrl}
            alt={documento.nome_documento || 'Immagine'}
            style={{ transform: `scale(${zoom / 100})` }}
            className="max-w-full max-h-full object-contain transition-transform"
          />
        </div>
      );
    }

    return (
      <div className="w-full h-[80vh] bg-slate-100 rounded-lg overflow-hidden">
        <object
          data={previewUrl}
          type="application/pdf"
          className="w-full h-full"
          title={documento.nome_documento || 'Documento'}
        >
          <iframe
            src={previewUrl}
            type="application/pdf"
            className="w-full h-full border-0"
            title={documento.nome_documento || 'Documento'}
          />
        </object>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-8">
            <span className="truncate">{documento?.nome_documento || 'Documento'}</span>
            <div className="flex items-center gap-2">
              {fileType === 'image' && previewUrl && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setZoom(Math.max(50, zoom - 10))}
                    disabled={zoom <= 50}
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-slate-600 min-w-[60px] text-center">
                    {zoom}%
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setZoom(Math.min(200, zoom + 10))}
                    disabled={zoom >= 200}
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </>
              )}
              {previewUrl && (
                <>
                  <Button variant="outline" size="icon" onClick={handleOpenInNewTab} title="Apri in nuova scheda">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleDownload}>
                    <Download className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}