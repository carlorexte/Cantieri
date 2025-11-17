import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, ZoomIn, ZoomOut, Loader2, FileText } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function DocumentViewer({ documento, isOpen, onClose }) {
  const [fileUrl, setFileUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [fileType, setFileType] = useState(null);

  useEffect(() => {
    if (isOpen && documento) {
      loadDocument();
    } else {
      setFileUrl(null);
      setZoom(100);
      setFileType(null);
    }
  }, [isOpen, documento]);

  const loadDocument = async () => {
    if (!documento) return;
    
    setIsLoading(true);
    try {
      let url = documento.cloud_file_url;
      
      if (documento.file_uri) {
        const result = await base44.integrations.Core.CreateFileSignedUrl({
          file_uri: documento.file_uri,
          expires_in: 3600
        });
        url = result.signed_url;
      }

      if (url) {
        setFileUrl(url);
        detectFileType(url, documento.nome_documento, documento.file_uri);
      } else {
        toast.info(`Documento disponibile solo sul NAS: ${documento.percorso_nas || 'Non disponibile'}`);
      }
    } catch (error) {
      console.error('Errore caricamento documento:', error);
      toast.error('Impossibile caricare il documento');
    } finally {
      setIsLoading(false);
    }
  };

  const detectFileType = (url, fileName, fileUri) => {
    // Prova prima dal nome del file
    let extension = fileName?.split('.').pop()?.toLowerCase();
    
    // Se non trovata, prova dall'URI del file
    if (!extension || extension === fileName?.toLowerCase()) {
      extension = fileUri?.split('.').pop()?.toLowerCase().split('?')[0];
    }
    
    // Se ancora non trovata, prova dall'URL
    if (!extension || extension.length > 5) {
      const urlPath = url?.split('?')[0];
      extension = urlPath?.split('.').pop()?.toLowerCase();
    }
    
    // Determina il tipo in base all'estensione
    if (['pdf'].includes(extension)) {
      setFileType('pdf');
    } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(extension)) {
      setFileType('image');
    } else if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension)) {
      setFileType('office');
    } else if (['txt', 'csv', 'json', 'xml'].includes(extension)) {
      setFileType('text');
    } else {
      // Fallback: prova a capire dal content-type se è un PDF
      setFileType('pdf');
    }
  };

  const handleDownload = async () => {
    if (!fileUrl || !documento) return;
    
    try {
      const a = document.createElement('a');
      a.href = fileUrl;
      a.download = documento.nome_documento || 'documento';
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success('Download avviato');
    } catch (error) {
      toast.error('Errore durante il download');
    }
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

    if (!fileUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-96 text-slate-500">
          <FileText className="w-16 h-16 mb-4" />
          <p>Documento non disponibile per l'anteprima</p>
          <p className="text-sm mt-2">Percorso NAS: {documento.percorso_nas}</p>
        </div>
      );
    }

    switch (fileType) {
      case 'pdf':
        return (
          <div className="w-full h-[80vh] bg-slate-100 rounded-lg overflow-hidden">
            <iframe
              src={`${fileUrl}#zoom=${zoom}`}
              className="w-full h-full border-0"
              title={documento.nome_documento || 'Documento'}
            />
          </div>
        );

      case 'image':
        return (
          <div className="w-full h-[80vh] bg-slate-100 rounded-lg flex items-center justify-center overflow-auto p-4">
            <img
              src={fileUrl}
              alt={documento.nome_documento || 'Immagine'}
              style={{ transform: `scale(${zoom / 100})` }}
              className="max-w-full max-h-full object-contain transition-transform"
            />
          </div>
        );

      case 'office':
        return (
          <div className="w-full h-[80vh] bg-slate-100 rounded-lg overflow-hidden">
            <iframe
              src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`}
              className="w-full h-full border-0"
              title={documento.nome_documento || 'Documento'}
            />
          </div>
        );

      case 'text':
        return (
          <div className="w-full h-[80vh] bg-white rounded-lg p-6 overflow-auto font-mono text-sm">
            <iframe
              src={fileUrl}
              className="w-full h-full border-0"
              title={documento.nome_documento || 'Documento'}
            />
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center h-96">
            <FileText className="w-16 h-16 text-slate-400 mb-4" />
            <p className="text-slate-600 mb-4">Anteprima non disponibile per questo tipo di file</p>
            <Button onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Scarica Documento
            </Button>
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-8">
            <span className="truncate">{documento?.nome_documento || 'Documento'}</span>
            <div className="flex items-center gap-2">
              {(fileType === 'pdf' || fileType === 'image') && (
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
              {fileUrl && (
                <Button variant="outline" size="icon" onClick={handleDownload}>
                  <Download className="w-4 h-4" />
                </Button>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}