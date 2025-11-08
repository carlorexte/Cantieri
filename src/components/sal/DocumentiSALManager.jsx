
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, FileText, Eye, Download, Trash2, Edit, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import DocumentoForm from "../documenti/DocumentoForm";

export default function DocumentiSALManager({ salId, cantiereId }) {
  const [documenti, setDocumenti] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDocumento, setEditingDocumento] = useState(null);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [showViewer, setShowViewer] = useState(false);
  const [signedUrl, setSignedUrl] = useState(null);
  const [isLoadingViewer, setIsLoadingViewer] = useState(false);

  useEffect(() => {
    if (salId) {
      loadDocumenti();
    }
  }, [salId]);

  const loadDocumenti = async () => {
    setIsLoading(true);
    try {
      const docs = await base44.entities.Documento.filter({
        entita_collegata_tipo: 'sal',
        entita_collegata_id: salId
      });
      setDocumenti(docs);
    } catch (error) {
      console.error("Errore caricamento documenti SAL:", error);
    }
    setIsLoading(false);
  };

  const handleSubmit = async (documentoData) => {
    try {
      if (editingDocumento) {
        await base44.entities.Documento.update(editingDocumento.id, documentoData);
        toast.success("Documento aggiornato con successo");
      } else {
        await base44.entities.Documento.create({
          ...documentoData,
          entita_collegata_id: salId,
          entita_collegata_tipo: 'sal',
        });
        toast.success("Documento aggiunto con successo");
      }
      setShowForm(false);
      setEditingDocumento(null);
      loadDocumenti();
    } catch (error) {
      console.error("Errore salvataggio documento:", error);
      toast.error("Errore durante il salvataggio del documento");
    }
  };

  const handleEdit = (documento) => {
    setEditingDocumento(documento);
    setShowForm(true);
  };

  const handleDelete = async (documento) => {
    if (window.confirm(`Sei sicuro di voler eliminare "${documento.nome_documento}"?`)) {
      try {
        await base44.entities.Documento.delete(documento.id);
        toast.success("Documento eliminato con successo");
        loadDocumenti();
      } catch (error) {
        console.error("Errore eliminazione documento:", error);
        toast.error("Errore durante l'eliminazione del documento");
      }
    }
  };

  const handleViewDocument = async (documento) => {
    if (documento.file_uri || documento.cloud_file_url) {
      setIsLoadingViewer(true);
      setViewingDocument(documento);
      setShowViewer(true);
      setSignedUrl(null);

      try {
        let urlToLoad = documento.cloud_file_url;
        if (documento.file_uri) {
          const result = await base44.integrations.Core.CreateFileSignedUrl({ 
            file_uri: documento.file_uri,
            expires_in: 3600
          });
          urlToLoad = result.signed_url;
        }
        setSignedUrl(urlToLoad);
      } catch (error) {
        console.error("Errore apertura documento:", error);
        toast.error("Impossibile aprire il documento");
        setShowViewer(false);
        setViewingDocument(null);
      } finally {
        setIsLoadingViewer(false);
      }
    } else {
      toast.info(`Documento disponibile solo sul NAS: ${documento.percorso_nas}`);
    }
  };

  const handleDownload = async (documento) => {
    if (documento.file_uri || documento.cloud_file_url) {
      try {
        let urlToDownload = documento.cloud_file_url;
        if (documento.file_uri) {
          const result = await base44.integrations.Core.CreateFileSignedUrl({ 
            file_uri: documento.file_uri,
            expires_in: 300
          });
          urlToDownload = result.signed_url;
        }
        
        const a = document.createElement('a');
        a.href = urlToDownload;
        a.download = documento.nome_documento;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success("Download avviato");
      } catch (error) {
        console.error("Errore download:", error);
        toast.error("Impossibile scaricare il documento");
      }
    } else {
      toast.info(`Documento disponibile solo sul NAS: ${documento.percorso_nas}`);
    }
  };

  const getFileType = (fileName) => {
    if (!fileName) return 'pdf';
    const ext = fileName.split('.').pop().toLowerCase();
    if (['pdf'].includes(ext)) return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
    return 'pdf';
  };

  const tipoDocumentoLabels = {
    economica_sal: "Certificato SAL",
    economica_fatture: "Fattura",
    altro: "Altro"
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Documenti SAL ({documenti.length})
            </CardTitle>
            <Button onClick={() => setShowForm(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi Documento
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4 text-slate-500">Caricamento...</div>
          ) : documenti.length > 0 ? (
            <div className="space-y-2">
              {documenti.map(doc => {
                const hasFile = doc.file_uri || doc.cloud_file_url;
                return (
                  <div key={doc.id} className="p-3 border rounded-md hover:bg-slate-50 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{doc.nome_documento}</p>
                      <p className="text-sm text-slate-500">
                        {tipoDocumentoLabels[doc.tipo_documento] || doc.tipo_documento}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {hasFile && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDocument(doc)}
                            title="Visualizza"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownload(doc)}
                            title="Scarica"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(doc)}
                        title="Modifica"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(doc)}
                        className="hover:bg-red-50 hover:text-red-600"
                        title="Elimina"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nessun documento caricato</p>
              <p className="text-sm mt-1">Aggiungi certificato SAL, fattura, ecc.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Form */}
      <Dialog open={showForm} onOpenChange={(open) => {
        setShowForm(open);
        if (!open) setEditingDocumento(null);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDocumento ? 'Modifica Documento' : 'Nuovo Documento'} SAL
            </DialogTitle>
          </DialogHeader>
          <DocumentoForm
            documento={editingDocumento}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingDocumento(null);
            }}
            initialEntity={{ id: salId, type: 'sal', name: 'SAL' }}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog Visualizzatore */}
      {showViewer && (
        <>
          <div className="fixed inset-0 bg-black/80 z-[60]" onClick={() => setShowViewer(false)} />
          
          <div className="fixed inset-4 z-[60] bg-white rounded-lg shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b bg-white">
              <h2 className="text-lg font-semibold truncate">{viewingDocument?.nome_documento}</h2>
              <button
                onClick={() => setShowViewer(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 min-h-0">
              {isLoadingViewer ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Caricamento documento...</p>
                  </div>
                </div>
              ) : signedUrl ? (
                <>
                  {getFileType(viewingDocument?.nome_documento) === 'pdf' ? (
                    <iframe
                      src={`https://docs.google.com/viewer?url=${encodeURIComponent(signedUrl)}&embedded=true`}
                      className="w-full h-full border-0"
                      title={viewingDocument?.nome_documento}
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-4 overflow-auto bg-slate-50">
                      <img
                        src={signedUrl}
                        alt={viewingDocument?.nome_documento}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-slate-500">Errore nel caricamento del documento</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
