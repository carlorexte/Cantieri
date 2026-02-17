import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, CheckCircle2, AlertCircle, Loader2, FileSpreadsheet, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export default function ImportCronoprogrammaForm({ cantieri, onSuccess, onCancel }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedCantiere, setSelectedCantiere] = useState('');
  const [dataInizioProg, setDataInizioProg] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !selectedCantiere) {
      toast.error('Seleziona un file e un cantiere prima di importare.');
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      console.log('📤 Inizio upload file...');
      
      const uploadResponse = await base44.integrations.Core.UploadFile({
        file: selectedFile
      });
      
      console.log('✅ File caricato:', uploadResponse);
      const fileUrl = uploadResponse.file_url;

      console.log('🚀 Chiamata alla funzione importCronoprogrammaIntelligente...');
      
      const payload = {
        file_url: fileUrl,
        cantiere_id: selectedCantiere
      };
      
      // Aggiungi data inizio se fornita
      if (dataInizioProg) {
        payload.data_inizio_progetto = dataInizioProg;
      }
      
      console.log('📦 Payload:', payload);
      
      const response = await base44.functions.invoke('importCronoprogrammaIntelligente', payload);
      
      console.log('📦 Risposta ricevuta:', response.data);

      if (response.data.success) {
        setImportResult({
          success: true,
          message: response.data.message,
          attivita_importate: response.data.attivita_importate,
          range_temporale: response.data.range_temporale,
          note: response.data.note_importazione,
          dettagli: response.data.dettagli
        });
        toast.success(response.data.message);
        
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } else {
        throw new Error(response.data.error || 'Errore durante l\'importazione');
      }
    } catch (error) {
      console.error('❌ Errore completo:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error response data:', JSON.stringify(error.response?.data, null, 2));
      console.error('❌ Error response status:', error.response?.status);
      
      let errorMessage = 'Errore sconosciuto';
      let errorDetails = '';
      
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else {
          errorMessage = JSON.stringify(error.response.data);
        }
        
        errorDetails = error.response.data.dettagli || error.response.data.details || error.stack || '';
      } else if (error.message) {
        errorMessage = error.message;
        errorDetails = error.stack || '';
      }
      
      setImportResult({
        success: false,
        message: 'Importazione fallita',
        error: errorMessage,
        dettagli: errorDetails,
        fullError: JSON.stringify({
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        }, null, 2)
      });
      
      toast.error('Errore: ' + errorMessage);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
          Importa Cronoprogramma (AI Intelligente)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">🤖 Importazione Intelligente con AI</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Supporta XLSX, PDF e IMMAGINI</strong> (foto del cronoprogramma)</li>
                <li>• L'AI analizza visivamente la struttura del file (colonne, date)</li>
                <li>• Per i PDF/Foto: cerca di mantenere le date reali e il parallelismo</li>
                <li>• Puoi modificare le date nel Gantt dopo l'importazione</li>
              </ul>
              <p className="text-xs text-blue-700 mt-3">
                ⏱️ L'importazione richiede 10-60 secondi (dipende dalla complessità del file)
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Seleziona Cantiere</label>
          <Select value={selectedCantiere} onValueChange={setSelectedCantiere}>
            <SelectTrigger>
              <SelectValue placeholder="Scegli il cantiere..." />
            </SelectTrigger>
            <SelectContent>
              {cantieri.map((cantiere) => (
                <SelectItem key={cantiere.id} value={cantiere.id}>
                  {cantiere.denominazione || cantiere.oggetto_lavori}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            Data Inizio Progetto (opzionale)
          </label>
          <Input
            type="date"
            value={dataInizioProg}
            onChange={(e) => setDataInizioProg(e.target.value)}
            className="border-slate-200"
          />
          <p className="text-xs text-slate-500">
            Per PDF senza date esplicite, le attività saranno calcolate in sequenza da questa data. 
            Se non fornita, si usa la data inizio del cantiere o la data odierna.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Carica File (XLSX, PDF o Immagine)</label>
          <div className="flex items-center gap-3">
            <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-colors">
              <Upload className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-600">
                {selectedFile ? selectedFile.name : 'Clicca per scegliere un file (PDF, Excel, JPG, PNG)'}
              </span>
              <input
                type="file"
                accept=".xlsx,.xls,.pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {importResult && (
          <div className={`rounded-lg p-4 ${
            importResult.success 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-start gap-3">
              {importResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`font-semibold ${
                  importResult.success ? 'text-green-900' : 'text-red-900'
                }`}>
                  {importResult.message}
                </p>
                {importResult.success && (
                  <div className="text-sm text-green-800 mt-2 space-y-1">
                    <p>✓ Attività importate: <strong>{importResult.attivita_importate}</strong></p>
                    {importResult.range_temporale && (
                      <p className="text-blue-700 mt-2">
                        📅 Range: {importResult.range_temporale.data_inizio} - {importResult.range_temporale.data_fine}
                      </p>
                    )}
                    {importResult.dettagli && (
                      <div className="text-xs text-gray-600 mt-2 space-y-1">
                        <p>📊 Metodo: {importResult.dettagli.metodo_parsing}</p>
                        <p>📁 Tipo file: {importResult.dettagli.file_tipo}</p>
                      </div>
                    )}
                    {importResult.note && (
                      <div className="text-xs text-blue-700 mt-2 p-2 bg-blue-100 rounded whitespace-pre-wrap">
                        {importResult.note}
                      </div>
                    )}
                  </div>
                )}
                {!importResult.success && (
                  <div className="text-sm text-red-700 mt-2">
                    <p><strong>Errore:</strong> {importResult.error}</p>
                    {importResult.dettagli && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-red-600 font-semibold">
                          📋 Dettagli tecnici (clicca per espandere)
                        </summary>
                        <pre className="text-xs mt-1 p-2 bg-red-100 rounded overflow-auto max-h-40 whitespace-pre-wrap">
                          {importResult.dettagli}
                        </pre>
                      </details>
                    )}
                    {importResult.fullError && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-red-600 font-semibold">
                          🔍 Errore completo (per debug)
                        </summary>
                        <pre className="text-xs mt-1 p-2 bg-red-100 rounded overflow-auto max-h-60 whitespace-pre-wrap">
                          {importResult.fullError}
                        </pre>
                      </details>
                    )}
                    <p className="text-xs text-red-600 mt-3 font-semibold">
                      💡 Per risolvere: controlla i log della funzione in Dashboard → Code → Functions → importCronoprogrammaIntelligente → Logs
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>
            Annulla
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!selectedFile || !selectedCantiere || isImporting}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importazione in corso...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Importa con AI
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}