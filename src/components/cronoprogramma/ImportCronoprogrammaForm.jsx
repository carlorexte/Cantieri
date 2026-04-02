import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  Calendar,
  Link as LinkIcon,
  Image as ImageIcon,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { supabaseDB } from '@/lib/supabaseClient';
import ImportReviewPanel from './ImportReviewPanel';
import {
  canonicalProjectToDbActivities,
  materializeCandidate,
  parseMultimodalCronoprogramma
} from '@/utils/importMultimodalCronoprogramma';
import { normalizeCanonicalCronoprogramma } from '@/utils/normalizeCanonicalCronoprogramma';

function ResultBanner({ importResult }) {
  if (!importResult) return null;

  return (
    <div className={`rounded-xl p-4 ${importResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
      <div className="flex items-start gap-3">
        {importResult.success ? (
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1 text-sm">
          <p className={`font-semibold ${importResult.success ? 'text-green-900' : 'text-red-900'}`}>{importResult.message}</p>
          {importResult.success && importResult.dettagli && (
            <div className="text-green-800 mt-2 space-y-1">
              <p>- {importResult.phase === 'analysis' ? 'Attivita rilevate' : 'Attivita importate'}: <strong>{importResult.attivita_importate}</strong></p>
              {importResult.dettagli.date_coverage !== undefined && (
                <p>- Copertura date: <strong>{importResult.dettagli.date_coverage}%</strong></p>
              )}
              {importResult.dettagli.project_start && importResult.dettagli.project_end && (
                <p>- Range progetto: <strong>{importResult.dettagli.project_start}</strong>{' -> '}<strong>{importResult.dettagli.project_end}</strong></p>
              )}
              <p className="text-xs text-gray-600 mt-1">Metodo: {importResult.dettagli.metodo_parsing}</p>
            </div>
          )}
          {!importResult.success && <p className="text-red-800 mt-2">{importResult.error}</p>}
        </div>
      </div>
    </div>
  );
}

export default function ImportCronoprogrammaForm({ cantieri, onSuccess, onCancel }) {
  const [importMode, setImportMode] = useState('file');
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [selectedCantiere, setSelectedCantiere] = useState('');
  const [dataInizioProg, setDataInizioProg] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importPackage, setImportPackage] = useState(null);
  const [reviewTab, setReviewTab] = useState('summary');

  const rebuildCanonicalState = (canonical, parserKey) => {
    const normalized = normalizeCanonicalCronoprogramma(canonical, {
      projectSource: parserKey || 'review-edit'
    });

    return {
      ...canonical,
      ...normalized,
      source_summary: canonical.source_summary
    };
  };

  const resetReviewState = () => {
    setImportPackage(null);
    setImportResult(null);
    setReviewTab('summary');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.name.endsWith('.json')) {
      setImportMode('json');
    }

    setSelectedFile(file);
    resetReviewState();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Formato non supportato. Usa JPG, PNG, WEBP o PDF.');
      return;
    }

    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > 10) {
      toast.error(`File troppo grande: ${sizeMB.toFixed(1)}MB. Max 10MB.`);
      return;
    }

    setSelectedImageFile(file);
    resetReviewState();
  };

  const handleAnalyze = async () => {
    const hasSource =
      importMode === 'file' ? !!selectedFile :
      importMode === 'json' ? !!selectedFile :
      importMode === 'sheet' ? !!googleSheetUrl.trim() :
      !!selectedImageFile;

    if (!hasSource || !selectedCantiere) {
      toast.error('Seleziona una sorgente e un cantiere prima di importare.');
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      let source;

      if (importMode === 'json') {
        source = {
          mode: 'json',
          payload: await selectedFile.arrayBuffer(),
          label: selectedFile?.name || 'JSON'
        };
      } else if (importMode === 'sheet') {
        source = {
          mode: 'sheet',
          payload: googleSheetUrl.trim(),
          label: googleSheetUrl.trim()
        };
      } else if (importMode === 'vision') {
        toast.info('Analisi immagine in corso (5-15s)...', { duration: 5000 });
        source = {
          mode: 'vision',
          payload: selectedImageFile,
          label: selectedImageFile?.name || 'Immagine/PDF'
        };
      } else {
        source = {
          mode: 'file',
          payload: await selectedFile.arrayBuffer(),
          label: selectedFile?.name || 'Excel'
        };
      }

      const parsedPackage = await parseMultimodalCronoprogramma(source, {
        dataInizioDefault: dataInizioProg || null
      });

      if (!parsedPackage.success || !parsedPackage.canonical?.activities?.length) {
        throw new Error(parsedPackage.error || 'Errore nell analisi del cronoprogramma');
      }

      setImportPackage(parsedPackage);
      setReviewTab('summary');
      setImportResult({
        success: true,
        phase: 'analysis',
        message: `Analisi completata: ${parsedPackage.canonical.activities.length} attivita rilevate`,
        attivita_importate: parsedPackage.canonical.activities.length,
        dettagli: {
          metodo_parsing: parsedPackage.selectedCandidateKey,
          date_coverage: parsedPackage.canonical.review?.totalActivities
            ? Math.round((parsedPackage.canonical.review.withDates / parsedPackage.canonical.review.totalActivities) * 100)
            : 0,
          project_start: parsedPackage.canonical.review?.projectStart,
          project_end: parsedPackage.canonical.review?.projectEnd
        }
      });
      toast.success('Analisi completata. Verifica i risultati prima del salvataggio.');
    } catch (error) {
      setImportPackage(null);
      setImportResult({
        success: false,
        message: 'Analisi fallita',
        error: error.message
      });
      toast.error(`Errore: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleSaveReviewedImport = async () => {
    if (!importPackage?.canonical?.activities?.length) {
      toast.error('Nessuna attivita pronta da importare.');
      return;
    }

    setIsImporting(true);

    try {
      const attivita = canonicalProjectToDbActivities(importPackage.canonical);
      const saveResult = await supabaseDB.importCronoprogramma(selectedCantiere, attivita);

      if (!saveResult.success) {
        const errorDetails = Array.isArray(saveResult.errori) && saveResult.errori.length > 0
          ? saveResult.errori.map((item) => item.errore || item).filter(Boolean).slice(0, 5).join(' | ')
          : '';

        throw new Error(
          errorDetails
            ? `${saveResult.message || 'Errore durante il salvataggio su Supabase'}: ${errorDetails}`
            : (saveResult.message || 'Errore durante il salvataggio su Supabase')
        );
      }

      const incompleteDates = importPackage.canonical.review?.sampleMissingDates || [];

      setImportResult({
        success: true,
        phase: 'import',
        message: `Importazione completata: ${saveResult.attivita_importate} nodi salvati nel database`,
        attivita_importate: saveResult.attivita_importate,
        dettagli: {
          metodo_parsing: importPackage.selectedCandidateKey || 'multimodal-import',
          date_coverage: importPackage.canonical.review?.totalActivities
            ? Math.round((importPackage.canonical.review.withDates / importPackage.canonical.review.totalActivities) * 100)
            : 0,
          project_start: importPackage.canonical.review?.projectStart,
          project_end: importPackage.canonical.review?.projectEnd,
          incomplete_dates: incompleteDates
        }
      });

      toast.success(`${saveResult.attivita_importate} nodi importati`);

      if (incompleteDates.length === 0) {
        setTimeout(() => onSuccess(), 1000);
      } else {
        toast.warning('Import completato con date incomplete: completa manualmente le attivita elencate.');
      }
    } catch (error) {
      setImportResult({
        success: false,
        message: 'Importazione fallita',
        error: error.message
      });
      toast.error(`Errore: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleSelectCandidate = (candidateKey) => {
    const nextPackage = materializeCandidate(importPackage, candidateKey);
    if (!nextPackage) return;

    setImportPackage(nextPackage);
    setReviewTab('summary');
    setImportResult((current) => current ? {
      ...current,
      dettagli: {
        ...(current.dettagli || {}),
        metodo_parsing: candidateKey
      }
    } : current);
  };

  const handleActivityChange = (activityId, patch) => {
    setImportPackage((current) => {
      if (!current?.canonical?.activities) return current;

      const activities = current.canonical.activities.map((activity) => {
        if (activity.id !== activityId) return activity;

        const nextActivity = {
          ...activity,
          ...patch
        };

        if (patch.start_date && !patch.end_date && nextActivity.duration_days > 0 && !activity.end_date) {
          const start = new Date(`${patch.start_date}T12:00:00`);
          if (!Number.isNaN(start.getTime())) {
            const end = new Date(start.getTime() + (Math.max(1, nextActivity.duration_days) - 1) * 86400000);
            nextActivity.end_date = end.toISOString().slice(0, 10);
          }
        }

        if (patch.duration_days && nextActivity.start_date && !patch.end_date) {
          const start = new Date(`${nextActivity.start_date}T12:00:00`);
          if (!Number.isNaN(start.getTime())) {
            const end = new Date(start.getTime() + (Math.max(1, Number(patch.duration_days)) - 1) * 86400000);
            nextActivity.end_date = end.toISOString().slice(0, 10);
          }
        }

        return nextActivity;
      });
      const nextCanonical = rebuildCanonicalState({
        ...current.canonical,
        activities
      }, current.selectedCandidateKey);

      return {
        ...current,
        canonical: nextCanonical
      };
    });
  };

  const sourceReady =
    importMode === 'file' ? !!selectedFile :
    importMode === 'json' ? !!selectedFile :
    importMode === 'sheet' ? !!googleSheetUrl.trim() :
    !!selectedImageFile;

  const selectedSourceLabel =
    importMode === 'sheet'
      ? (googleSheetUrl || 'Google Sheet')
      : importMode === 'vision'
        ? (selectedImageFile?.name || 'Immagine/PDF')
        : (selectedFile?.name || 'File non selezionato');

  const selectedCantiereLabel = cantieri.find((item) => item.id === selectedCantiere)?.denominazione || 'Non selezionato';

  if (importPackage) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                Step 2 di 2
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Review importazione</h2>
                <p className="text-sm text-slate-600">La review e separata dalla configurazione iniziale. Qui lavori solo su riepilogo e correzione dati.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:w-[540px]">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">Cantiere</div>
                <div className="mt-1 text-sm font-medium text-slate-900">{selectedCantiereLabel}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">Sorgente</div>
                <div className="mt-1 text-sm font-medium text-slate-900 truncate">{selectedSourceLabel}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">Attivita</div>
                <div className="mt-1 text-sm font-medium text-slate-900">{importPackage.canonical?.activities?.length || 0}</div>
              </div>
            </div>
          </div>
        </div>

        <ResultBanner importResult={importResult} />

        <Tabs value={reviewTab} onValueChange={setReviewTab} className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-slate-100">
            <TabsTrigger value="summary">Riepilogo</TabsTrigger>
            <TabsTrigger value="table">Correzione dati</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="mt-0">
            <ImportReviewPanel
              importPackage={importPackage}
              onSelectCandidate={handleSelectCandidate}
              onActivityChange={handleActivityChange}
              showSummary
              showActivityTable={false}
            />
          </TabsContent>

          <TabsContent value="table" className="mt-0">
            <ImportReviewPanel
              importPackage={importPackage}
              onSelectCandidate={handleSelectCandidate}
              onActivityChange={handleActivityChange}
              showSummary={false}
              showActivityTable
            />
          </TabsContent>
        </Tabs>

        <div className="sticky bottom-0 z-10 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setImportPackage(null);
              setImportResult(null);
              setReviewTab('summary');
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Torna alla sorgente
          </Button>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onCancel}>Annulla</Button>
            <Button
              onClick={handleSaveReviewedImport}
              disabled={isImporting}
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvataggio in corso...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Conferma importazione
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              Step 1 di 2
            </div>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Configura la sorgente di import</h2>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_420px]">
        <div className="space-y-6">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-900">
            <p className="font-semibold">Approccio professionale consigliato</p>
            <p className="text-slate-700 mt-1">Lavora da sorgenti strutturate: JSON normalizzato, Excel con colonne esplicite o Google Sheet. Immagine/PDF resta solo una modalita di recupero.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Sorgente import</label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={importMode === 'file' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setImportMode('file');
                  resetReviewState();
                }}
              >
                File Excel
              </Button>
              <Button
                type="button"
                variant={importMode === 'sheet' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setImportMode('sheet');
                  resetReviewState();
                }}
              >
                URL Google Sheet
              </Button>
              <Button
                type="button"
                variant={importMode === 'vision' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setImportMode('vision');
                  resetReviewState();
                }}
              >
                <ImageIcon className="w-4 h-4 mr-1" />
                Recupero da immagine/PDF
              </Button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Seleziona Cantiere</label>
              <Select value={selectedCantiere} onValueChange={(value) => {
                setSelectedCantiere(value);
                resetReviewState();
              }}>
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
                Data inizio progetto (fallback)
              </label>
              <Input
                type="date"
                value={dataInizioProg}
                onChange={(e) => {
                  setDataInizioProg(e.target.value);
                  resetReviewState();
                }}
                className="border-slate-200"
              />
            </div>
          </div>

          {(importMode === 'file' || importMode === 'json') && (
            <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <label className="text-sm font-medium">Carica file Excel o JSON normalizzato</label>
              <label className="flex min-h-40 flex-col items-center justify-center gap-3 px-4 py-6 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-colors text-center">
                <Upload className="w-6 h-6 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {selectedFile ? selectedFile.name : 'Clicca per scegliere un file Excel (.xlsx,.xls) o JSON (.json)'}
                </span>
                <input type="file" accept=".xlsx,.xls,.json" onChange={handleFileChange} className="hidden" />
              </label>
              <div className="text-xs bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-900">
                <p className="font-semibold">Flusso consigliato: normalizzazione Excel</p>
                <p className="mt-1">Per file complessi, esegui prima la normalizzazione e importa il JSON risultante:</p>
                <code className="block mt-1 bg-emerald-100 px-2 py-1 rounded">node normalize-cronoprogramma.js tuo-file.xlsx</code>
              </div>
            </div>
          )}

          {importMode === 'vision' && (
            <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <label className="text-sm font-medium">Carica immagine o PDF</label>
              <label className="flex min-h-40 flex-col items-center justify-center gap-3 px-4 py-6 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-amber-500 hover:bg-amber-50 transition-colors text-center">
                <ImageIcon className="w-6 h-6 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {selectedImageFile ? selectedImageFile.name : 'Clicca per scegliere immagine (.jpg,.png) o PDF'}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
              <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="font-semibold">Modalita di recupero</p>
                <p className="mt-1">Usala solo se non esiste una sorgente strutturata. Le immagini possono perdere predecessori, WBS e parallelismi reali.</p>
              </div>
            </div>
          )}

          {importMode === 'sheet' && (
            <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <label className="text-sm font-medium flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-indigo-600" />
                URL Google Sheet
              </label>
              <Input
                type="url"
                placeholder="https://docs.google.com/spreadsheets/d/.../edit?gid=0"
                value={googleSheetUrl}
                onChange={(e) => {
                  setGoogleSheetUrl(e.target.value);
                  resetReviewState();
                }}
              />
              <p className="text-xs text-slate-600">
                Se il foglio e pubblico verra usato l'export XLSX strutturato. Questa sorgente resta preferibile rispetto a PDF o immagini.
              </p>
            </div>
          )}

          <ResultBanner importResult={importResult} />
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Prima di analizzare</h3>
            <ul className="mt-3 space-y-3 text-sm text-slate-600">
              <li>1. Seleziona il cantiere corretto.</li>
              <li>2. Carica una sorgente strutturata se disponibile.</li>
              <li>3. Usa la data fallback solo quando il file non contiene un inizio progetto attendibile.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Stato sorgente</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                <span className="text-slate-500">Modalita</span>
                <span className="font-medium text-slate-900">
                  {importMode === 'file' && 'File Excel'}
                  {importMode === 'json' && 'JSON normalizzato'}
                  {importMode === 'sheet' && 'Google Sheet'}
                  {importMode === 'vision' && 'Recupero immagine/PDF'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                <span className="text-slate-500">Sorgente selezionata</span>
                <span className="max-w-[220px] truncate font-medium text-slate-900">{selectedSourceLabel}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                <span className="text-slate-500">Cantiere</span>
                <span className="max-w-[220px] truncate font-medium text-slate-900">{selectedCantiereLabel}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-indigo-900">Esito atteso</h3>
            <p className="mt-2 text-sm text-indigo-800">Dopo l'analisi passerai a una review separata con riepilogo e tabella correggibile. Nessuna preview Gantt in questa fase.</p>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <Button variant="outline" onClick={onCancel}>Annulla</Button>
        <Button
          onClick={handleAnalyze}
          disabled={!sourceReady || !selectedCantiere || isImporting}
        >
          {isImporting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analisi in corso...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Analizza file
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
