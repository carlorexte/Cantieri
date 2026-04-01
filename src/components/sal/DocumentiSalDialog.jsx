import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, X, ExternalLink, Download } from "lucide-react";
import { backendClient } from "@/api/backendClient";
import { toast } from "react-hot-toast";

export default function DocumentiSalDialog({ open, onClose, sal }) {
  const [documenti, setDocumenti] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && sal) {
      loadDocumenti();
    }
  }, [open, sal]);

  const loadDocumenti = async () => {
    setIsLoading(true);
    try {
      const docs = await backendClient.entities.Documento.filter({ 
        entita_collegata_id: sal.cantiere_id,
        entita_collegata_tipo: 'cantiere',
        tipo_documento: 'economica_sal'
      });
      setDocumenti(docs);
    } catch (error) {
      console.error("Errore caricamento documenti:", error);
      toast.error("Errore durante il caricamento dei documenti.");
      setDocumenti([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewFile = async (fileUri) => {
    try {
      const { signed_url } = await backendClient.integrations.Core.CreateFileSignedUrl({ 
        file_uri: fileUri,
        expires_in: 3600
      });
      window.open(signed_url, '_blank');
    } catch (error) {
      console.error("Errore apertura documento:", error);
      toast.error("Impossibile aprire il documento");
    }
  };

  if (!open || !sal) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Documenti SAL</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-3">
          {sal.file_uri && (
            <Card className="border-indigo-200 bg-indigo-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-indigo-600" />
                    <div>
                      <p className="font-semibold text-slate-900">Certificato SAL</p>
                      <p className="text-sm text-slate-600">
                        SAL n. {sal.tipo_sal_dettaglio === 'anticipazione' ? 'Anticipazione' : sal.numero_sal} - {new Date(sal.data_sal).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleViewFile(sal.file_uri)}
                    className=""
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Apri
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {isLoading && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-sm text-slate-600 mt-2">Caricamento documenti...</p>
            </div>
          )}

          {!isLoading && documenti.length > 0 && (
            <>
              <div className="pt-2">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Altri documenti SAL del cantiere</h3>
              </div>
              {documenti.map(doc => (
                <Card key={doc.id} className="border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="w-6 h-6 text-slate-600" />
                        <div>
                          <p className="font-medium text-slate-900">{doc.nome_documento}</p>
                          {doc.descrizione && (
                            <p className="text-sm text-slate-500">{doc.descrizione}</p>
                          )}
                        </div>
                      </div>
                      {doc.file_uri && (
                        <Button
                          variant="outline"
                          onClick={() => handleViewFile(doc.file_uri)}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Apri
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}

          {!isLoading && !sal.file_uri && documenti.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nessun documento disponibile per questo SAL</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}