import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  FileSpreadsheet, 
  Upload, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Table as TableIcon,
  Search
} from 'lucide-react';
import { toast } from 'sonner';
import { parseComputoMetrico } from '@/utils/parseComputoMetrico';
import { backendClient } from '@/api/backendClient';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ImportComputoMetrico({ isOpen, onOpenChange, cantiereId, onSuccess }) {
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsParsing(true);
    setParsedData(null);

    const isPdf = file.type === 'application/pdf';

    if (isPdf) {
      await handlePdfAnalysis(file);
    } else {
      await handleExcelAnalysis(file);
    }
  };

  const handleExcelAnalysis = (file) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = await parseComputoMetrico(event.target.result);
      if (result.success) {
        setParsedData(result);
        toast.success(`Rilevate ${result.items.length} voci di computo`);
      } else {
        toast.error("Errore durante l'analisi Excel: " + result.error);
      }
      setIsParsing(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const handlePdfAnalysis = async (file) => {
    try {
      const reader = new FileReader();
      const base64Promise = new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const base64Image = await base64Promise;

      const response = await fetch('/api/analyze-computo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          base64Image,
          mimeType: 'application/pdf'
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const visionResult = JSON.parse(data.responseText);
      
      // Normalize vision result to match expected structure
      const normalizedItems = (visionResult.items || []).map(item => ({
        codice_elenco_prezzi: item.codice_elenco_prezzi || '',
        descrizione: item.descrizione || '',
        unita_misura: item.unita_misura || 'corpo',
        quantita_prevista: parseFloat(item.quantita_prevista) || 0,
        prezzo_unitario: parseFloat(item.prezzo_unitario) || 0,
        importo_totale: (parseFloat(item.quantita_prevista) || 0) * (parseFloat(item.prezzo_unitario) || 0),
        categoria: item.categoria || 'Varie'
      }));

      setParsedData({
        success: true,
        items: normalizedItems
      });
      
      toast.success(`Rilevate ${normalizedItems.length} voci dal PDF`);
    } catch (error) {
      console.error("PDF analysis error:", error);
      toast.error("Errore durante l'analisi Vision del PDF: " + error.message);
    } finally {
      setIsParsing(false);
    }
  };

  const handleSave = async () => {
    if (!parsedData || !cantiereId) return;

    setIsSaving(true);
    try {
      const itemsToSave = parsedData.items.map(item => ({
        ...item,
        cantiere_id: cantiereId
      }));

      await backendClient.entities.VoceComputo.createBatch(itemsToSave);
      
      toast.success(`${itemsToSave.length} voci salvate correttamente`);
      if (onSuccess) onSuccess();
      onOpenChange(false);
      setParsedData(null);
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Errore nel salvataggio del computo");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredItems = parsedData?.items.filter(item => 
    item.descrizione.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.codice_elenco_prezzi.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-none bg-slate-50/95 backdrop-blur-xl">
        <DialogHeader className="p-6 bg-white border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900">Importa Computo Metrico</DialogTitle>
              <p className="text-sm text-slate-500">Trascina un file Excel per alimentare la contabilità 5D del cantiere</p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden p-6">
          {!parsedData ? (
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl bg-white p-12 text-center transition-all hover:border-indigo-400 hover:bg-indigo-50/30 group">
              <div className="p-4 bg-slate-100 rounded-full mb-4 group-hover:bg-indigo-100 group-hover:scale-110 transition-all">
                {isParsing ? (
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                ) : (
                  <Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-600" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Seleziona il Computo</h3>
              <p className="text-slate-500 max-w-sm mt-2 mb-6">Supportiamo file Excel (.xlsx) e documenti PDF. Il sistema mapperà automaticamente codici e prezzi.</p>
              
              <div className="relative">
                <Input 
                  type="file" 
                  accept=".xlsx, .xls, .pdf" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={handleFileChange}
                  disabled={isParsing}
                />
                <Button disabled={isParsing} className="bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200">
                  {isParsing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analisi in corso...
                    </>
                  ) : (
                    "Sfoglia Documenti"
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full gap-4">
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="Cerca tra le voci rilevate..." 
                    className="pl-10 bg-white border-slate-200 focus-visible:ring-indigo-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Badge variant="outline" className="px-3 py-1 bg-white border-slate-200 text-slate-700 font-medium">
                  {filteredItems.length} voci rilevate
                </Badge>
              </div>

              <div className="flex-1 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <ScrollArea className="h-[400px]">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-slate-700 w-24">Codice</th>
                        <th className="px-4 py-3 font-semibold text-slate-700">Descrizione</th>
                        <th className="px-4 py-3 font-semibold text-slate-700 w-16">U.M.</th>
                        <th className="px-4 py-3 font-semibold text-slate-700 text-right w-24">Q.tà</th>
                        <th className="px-4 py-3 font-semibold text-slate-700 text-right w-32">P. Unitario</th>
                        <th className="px-4 py-3 font-semibold text-slate-700 text-right w-32">Totale</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.codice_elenco_prezzi || '-'}</td>
                          <td className="px-4 py-3 text-slate-900 leading-tight">{item.descrizione}</td>
                          <td className="px-4 py-3 text-slate-500 uppercase">{item.unita_misura || '-'}</td>
                          <td className="px-4 py-3 text-right font-medium text-slate-800">{item.quantita_prevista.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3 text-right text-slate-600">€ {item.prezzo_unitario.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3 text-right font-bold text-indigo-700">€ {item.importo_totale.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 bg-slate-100/50 border-t border-slate-200 flex justify-between sm:justify-between items-center">
          <Button variant="ghost" onClick={() => setParsedData(null)} disabled={!parsedData || isSaving}>
            Ricomincia
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Annulla
            </Button>
            <Button 
              disabled={!parsedData || isSaving} 
              onClick={handleSave}
              className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 min-w-[140px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Conferma Import
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
